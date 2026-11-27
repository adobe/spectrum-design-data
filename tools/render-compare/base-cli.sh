#!/usr/bin/env bash
# Copyright 2026 Adobe. All rights reserved.
# This file is licensed to you under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License. You may obtain a copy
# of the License at http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software distributed under
# the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
# OF ANY KIND, either express or implied. See the License for the specific language
# governing permissions and limitations under the License.

# One shared BASE CLI per origin/main commit.
#
#   base-cli.sh ensure [REF]   build (or reuse) the CLI for REF (default origin/main); prints the cache dir
#   base-cli.sh src [REF]      only extract the REF tree (no build; for --same-cli runs); prints the cache dir
#   base-cli.sh prune [N]      keep the N most recent cache dirs (default 3), delete the rest
#   base-cli.sh list           show the cache dirs
#
# Layout of <cache>/<sha>/:  src/ (git archive of the commit: the BASE repo root),
#                            bin/design-data (the CLI), target/ (removed after the build
#                            unless KEEP_TARGET=1).
# Env: RC_CACHE (default ~/.cache/sdd-render-compare), RC_MIN_FREE_GB (default 15),
#      RC_TARGET_DIR (build into this Cargo target dir instead of <cache>/<sha>/target and keep it,
#      so CI can reuse the dependencies a restored rust-cache already compiled),
#      KEEP_TARGET=1, RC_LOCK_WAIT (seconds to wait for another builder, default 1800).
# Two callers building the same commit do not build twice: the second waits on the lock dir
# (mkdir is atomic; macOS has no flock) and then reuses the first one's result.

set -euo pipefail

CACHE="${RC_CACHE:-$HOME/.cache/sdd-render-compare}"
MIN_FREE_GB="${RC_MIN_FREE_GB:-15}"
LOCK_WAIT="${RC_LOCK_WAIT:-1800}"
REPO="$(git rev-parse --show-toplevel)"

fail() { echo "base-cli: $*" >&2; exit 1; }

free_gb() { df -Pk "$CACHE" | awk 'NR==2 {printf "%d", $4/1024/1024}'; }

ensure() {
  local ref="${1:-origin/main}" sha dir lock waited=0 want_bin="${WANT_BIN:-1}" ready
  ready() { if [ "$want_bin" = 1 ]; then [ -x "$dir/bin/design-data" ]; else [ -f "$dir/COMMIT" ]; fi; }
  git -C "$REPO" rev-parse --verify -q "$ref^{commit}" >/dev/null || fail "unknown ref '$ref' (git fetch origin first?)"
  sha="$(git -C "$REPO" rev-parse --short=12 "$ref^{commit}")"
  mkdir -p "$CACHE"
  dir="$CACHE/$sha"
  lock="$dir.lock"
  if ready; then echo "$dir"; return; fi
  until mkdir "$lock" 2>/dev/null; do
    # A lock whose builder died (SIGKILL leaves it) is taken over: the pid is stored in it.
    local owner; owner="$(cat "$lock/pid" 2>/dev/null || true)"
    if { [ -n "$owner" ] && ! kill -0 "$owner" 2>/dev/null; } ||
       { [ -z "$owner" ] && [ -n "$(find "$lock" -maxdepth 0 -mmin +2 2>/dev/null)" ]; }; then
      echo "base-cli: removing the stale lock $lock (builder ${owner:-unknown} is gone)" >&2
      rm -rf "$lock"; continue
    fi
    if [ "$waited" -ge "$LOCK_WAIT" ]; then fail "lock $lock held by a live process ($owner) for ${LOCK_WAIT}s."; fi
    echo "base-cli: another build of $sha is running (pid $owner), waiting..." >&2
    sleep 10; waited=$((waited + 10))
    if ready; then echo "$dir"; return; fi
  done
  echo $$ >"$lock/pid"
  trap "rm -rf '$lock'" EXIT
  if ready; then echo "$dir"; return; fi
  if [ "$want_bin" = 1 ]; then
    local free; free="$(free_gb)"
    [ "$free" -ge "$MIN_FREE_GB" ] || fail "only ${free} GB free under $CACHE; a cold build needs $MIN_FREE_GB GB (RC_MIN_FREE_GB)."
  fi
  if [ ! -f "$dir/COMMIT" ]; then
    rm -rf "$dir"; mkdir -p "$dir/src" "$dir/bin"
    git -C "$REPO" archive "$sha" | tar -x -C "$dir/src"
    echo "$sha" >"$dir/COMMIT"
  fi
  if [ "$want_bin" != 1 ]; then echo "$dir"; return; fi
  echo "base-cli: building $ref ($sha) into $dir" >&2
  local target="${RC_TARGET_DIR:-$dir/target}"
  (cd "$dir/src/sdk" && CARGO_TARGET_DIR="$target" cargo build -p design-data-cli) >&2
  cp -f "$target/debug/design-data" "$dir/bin/design-data"
  [ -n "${RC_TARGET_DIR:-}" ] || [ "${KEEP_TARGET:-0}" = 1 ] || rm -rf "$dir/target"
  echo "$dir"
}

prune() {
  local keep="${1:-3}" d
  [[ "$keep" =~ ^[0-9]+$ ]] || fail "prune N must be a number"
  # newest first by modification time; skip lock dirs
  ls -1dt "$CACHE"/*/ 2>/dev/null | grep -v '\.lock/$' | tail -n +"$((keep + 1))" | while read -r d; do
    echo "base-cli: removing $d" >&2; rm -rf "${d%/}"
  done
}

case "${1:-}" in
  ensure) shift; ensure "$@" ;;
  src) shift; WANT_BIN=0 ensure "$@" ;;
  prune) shift; prune "$@" ;;
  list) du -sh "$CACHE"/*/ 2>/dev/null || echo "(empty: $CACHE)" ;;
  *) fail "usage: base-cli.sh ensure [REF] | src [REF] | prune [N] | list" ;;
esac
