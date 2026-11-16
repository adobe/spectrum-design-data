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

# Proves the `requires.cli` in packages/design-data/dataset.json: the oldest released CLI the
# dataset says it can be read with must draw the smoke set exactly like the current CLI.
#
#   CURRENT_CLI   the CLI built from this checkout (default: sdk/target/debug/design-data)
#   ASSET         the release asset to download (default: chosen from uname)
#   REPO          where the releases live (default: adobe/spectrum-design-data)
#
# The minimum runs without --strict (older releases do not have it); the current CLI runs with
# --strict, so the smoke set also has to be clean. Only the declared minimum and the current CLI
# are compared: a version in between can still regress, as 0.37.0 refused data that 0.36.5 drew.
# Only `render` is compared: a data change that breaks the minimum in `query`, `validate` or
# another command is not caught here.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"
DATASET="packages/design-data/dataset.json"
STATES="tools/cli-minimum-gate/smoke-states.json"
CURRENT_CLI="${CURRENT_CLI:-sdk/target/debug/design-data}"
REPO="${REPO:-adobe/spectrum-design-data}"

fail() { echo "cli-minimum-gate: $*" >&2; exit 1; }

min="$(jq -r '.requires.cli // empty' "$DATASET")"
if [ -z "$min" ]; then
  echo "cli-minimum-gate: $DATASET has no requires.cli; nothing to check."
  exit 0
fi
[[ "$min" =~ ^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$ ]] \
  || fail "requires.cli '$min' is not an exact version (for example 0.40.0)."

[ -x "$CURRENT_CLI" ] || fail "no current CLI at $CURRENT_CLI; build it first (cargo build -p design-data-cli)."
current="$("$CURRENT_CLI" --version | awk '{print $2}')"
# `sort -V` puts the smaller version first: the minimum must not be newer than this checkout's CLI.
[ "$(printf '%s\n%s\n' "$min" "$current" | sort -V | head -n1)" = "$min" ] \
  || fail "requires.cli $min is newer than the CLI in this checkout ($current). Bump the CLI in the same change."

# A change that needs a newer CLI (a layout change that bumps layoutRevision) raises requires.cli
# to the version of the CLI in the same change, which has no release yet: nothing older to compare.
if [ "$min" = "$current" ]; then
  echo "cli-minimum-gate: requires.cli is this checkout's CLI ($current), not yet released; nothing older to compare."
  exit 0
fi

if [ -z "${ASSET:-}" ]; then
  case "$(uname -s)-$(uname -m)" in
    Linux-x86_64) ASSET=design-data-linux-x64 ;;
    Darwin-arm64) ASSET=design-data-darwin-arm64 ;;
    Darwin-x86_64) ASSET=design-data-darwin-x64 ;;
    *) fail "no release asset for $(uname -s)-$(uname -m); set ASSET." ;;
  esac
fi

work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
tag="design-data-cli@$min"
gh release download "$tag" --repo "$REPO" --pattern "$ASSET" --pattern SHA256SUMS --dir "$work" 2>"$work/gh.err" \
  || fail "no release asset '$ASSET' for $tag in $REPO ($(tr '\n' ' ' <"$work/gh.err")). requires.cli must be a released CLI version; check it for a typo."
# SHA256SUMS lines are `<hash>  <name>`; tolerate a `*` (binary mode) or `./` before the name.
sum="$(awk -v a="$ASSET" '{f=$2; sub(/^\*/, "", f); sub(/^\.\//, "", f); if (f == a) print $1 "  " a}' "$work/SHA256SUMS")"
[ -n "$sum" ] || fail "SHA256SUMS for $tag has no entry for $ASSET."
(cd "$work" && echo "$sum" | shasum -a 256 -c - >/dev/null) \
  || fail "the downloaded $ASSET does not match SHA256SUMS for $tag."
chmod +x "$work/$ASSET"

echo "cli-minimum-gate: minimum $min ($ASSET) against current $current"
"$work/$ASSET" render --batch "$STATES" --out "$work/min" >"$work/min.out" 2>"$work/min.err" \
  || { cat "$work/min.err" >&2; fail "the minimum CLI $min cannot draw the smoke set from this data. Raise requires.cli."; }
"$CURRENT_CLI" render --batch "$STATES" --out "$work/cur" --strict >"$work/cur.out" 2>"$work/cur.err" \
  || { cat "$work/cur.err" >&2; fail "the current CLI reports diagnostics or fails on the smoke set; fix the data or $STATES first."; }

differing=()
for scene in "$work"/cur/*.scene.json; do
  id="$(basename "$scene" .scene.json)"
  cmp -s "$scene" "$work/min/$id.scene.json" || differing+=("$id")
done
if [ "${#differing[@]}" -gt 0 ]; then
  fail "CLI $min draws ${#differing[@]} state(s) differently from the current CLI: ${differing[*]}. Raise requires.cli to the first release that matches."
fi
echo "cli-minimum-gate: OK, CLI $min draws all $(ls "$work"/cur/*.scene.json | wc -l | tr -d ' ') smoke states like the current CLI."
