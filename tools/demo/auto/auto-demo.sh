#!/usr/bin/env bash
# Copyright 2026 Adobe. All rights reserved.
# This file is licensed to you under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License. You may obtain a copy
# of the License at http://www.apache.org/licenses/LICENSE-2.0
#
# auto-demo.sh — rmux-driven demo verification and asciinema cast recording.
#
# USAGE
#   auto-demo.sh <A|B|C|D> [--verify|--record] [--docker] [--cast-name NAME]
#
#   Modes:
#     --verify   Drive the demo beats and assert expected output (default; CI-able
#                for A/B/C; D requires Claude auth/MCP so it is local-only).
#     --record   Same as --verify but wraps execution in asciinema rec (v2 format)
#                and writes <public/casts/X-*.cast> with beat markers injected.
#
#   Options:
#     --docker   Run A/B/C inside the tools/demo/auto Dockerfile for clean-room
#                isolation (installs rmux + asciinema + builds design-data CLI).
#                D always errors with --docker (Claude auth/MCP are host-only).
#     --cast-name NAME   Override the output cast filename stem (no extension).
#
# PREREQUISITES
#   All modes:
#     rmux 0.3.x on PATH, design-data CLI built (cargo build -p design-data-cli --release).
#   Record mode:
#     asciinema 3.x on PATH.
#   Demo D (any mode):
#     .mcp.json at repo root with the design-data server configured; MCP pre-approved.
#   Docker mode:
#     docker on PATH and daemon running.

set -euo pipefail

BOLD='\033[1m'
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
RESET='\033[0m'

step()  { echo -e "\n${BOLD}==> $*${RESET}"; }
info()  { echo -e "    $*"; }
warn()  { echo -e "${YELLOW}    warn: $*${RESET}" >&2; }
fatal() { echo -e "${RED}    error: $*${RESET}" >&2; exit 1; }

# ─── resolve paths ────────────────────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
LIB="$SCRIPT_DIR/lib/rmux-drive.sh"
BEATS_DIR="$SCRIPT_DIR/beats"
CASTS_DIR="$REPO_ROOT/tools/demo/presentation/public/casts"

# ─── argument parsing ─────────────────────────────────────────────────────────

DEMO=""
MODE="verify"
DOCKER=false
CAST_NAME_OVERRIDE=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    A|a) DEMO="A" ;;
    B|b) DEMO="B" ;;
    C|c) DEMO="C" ;;
    D|d) DEMO="D" ;;
    --verify)  MODE="verify" ;;
    --record)  MODE="record" ;;
    --docker)  DOCKER=true ;;
    --cast-name) shift; CAST_NAME_OVERRIDE="$1" ;;
    -h|--help) grep '^#' "$0" | head -40 | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) fatal "Unknown argument: $1 (run with --help)" ;;
  esac
  shift
done

[[ -z "$DEMO" ]] && fatal "Specify a demo: A, B, C, or D."

# ─── docker shortcut (A/B/C only) ────────────────────────────────────────────

if $DOCKER; then
  [[ "$DEMO" == "D" ]] && fatal "Demo D cannot run in Docker (Claude auth + MCP require the host). Run without --docker."

  step "Docker mode — building image and running clean-room..."
  DOCKERFILE="$SCRIPT_DIR/Dockerfile"
  [[ -f "$DOCKERFILE" ]] || fatal "Dockerfile not found at $DOCKERFILE"

  IMAGE="spectrum-design-data-demo"
  docker build -q -t "$IMAGE" -f "$DOCKERFILE" "$REPO_ROOT" >&2

  CAST_FLAG=""
  if [[ "$MODE" == "record" ]]; then
    CAST_FLAG="--record"
    # Ensure local casts dir exists so bind-mount works.
    mkdir -p "$CASTS_DIR"
  fi

  docker run --rm \
    -v "$REPO_ROOT:/workspace:rw" \
    -e DEMO_MODE="$MODE" \
    "$IMAGE" \
    bash /workspace/tools/demo/auto/auto-demo.sh "$DEMO" ${CAST_FLAG:---verify} --cast-name "${CAST_NAME_OVERRIDE:-}"

  # Cast was written inside the container to /workspace/..., which is bind-mounted.
  exit $?
fi

# ─── prerequisites ────────────────────────────────────────────────────────────

step "Prerequisites"

command -v rmux >/dev/null 2>&1 || fatal "rmux not found on PATH. Install from https://github.com/Helvesec/rmux or brew install rmux."

CLI="$REPO_ROOT/sdk/target/release/design-data"
if [[ ! -x "$CLI" ]]; then
  info "design-data CLI not found — building now..."
  cargo build -p design-data-cli --release --manifest-path "$REPO_ROOT/sdk/Cargo.toml"
fi
[[ -x "$CLI" ]] || fatal "CLI still missing after build: $CLI"

if [[ "$MODE" == "record" ]]; then
  command -v asciinema >/dev/null 2>&1 || fatal "asciinema not found. Install: brew install asciinema"
  asciinema --version 2>&1 | grep -q "3\." || warn "Expected asciinema 3.x for --output-format asciicast-v2 flag."
fi

if [[ "$DEMO" == "D" ]]; then
  command -v claude >/dev/null 2>&1 || fatal "claude (Claude Code) not found on PATH."
  [[ -f "$REPO_ROOT/.mcp.json" ]] || fatal ".mcp.json not found at $REPO_ROOT — configure the design-data MCP server before running Demo D."

  # Create a per-run scratch directory for the hook-based beat log and done sentinel.
  # Exported so the hook scripts (record-beat.sh, stop-done.sh) can find it.
  DEMO_BEATS_DIR="$(mktemp -d)"
  export DEMO_BEATS_DIR
  step "Demo D hooks dir: $DEMO_BEATS_DIR"
fi

info "all prereqs met."

# ─── source library and beat manifest ─────────────────────────────────────────

# shellcheck source=lib/rmux-drive.sh
source "$LIB"

case "$DEMO" in
  A) source "$BEATS_DIR/A.beats.sh" ;;
  B) source "$BEATS_DIR/B.beats.sh" ;;
  C) source "$BEATS_DIR/C.beats.sh" ;;
  D) source "$BEATS_DIR/D.beats.sh" ;;
esac

# ─── default cast names (match record-casts.sh and slides.md references) ─────

cast_stem_for() {
  case "$1" in
    A) echo "A-find" ;;
    B) echo "B-name" ;;
    C) echo "C-suggest" ;;
    D) echo "D-agent" ;;
  esac
}

STEM="${CAST_NAME_OVERRIDE:-$(cast_stem_for "$DEMO")}"
CAST_PATH="$CASTS_DIR/${STEM}.cast"

SESSION="auto-demo-$(echo "$DEMO" | tr '[:upper:]' '[:lower:]')-$$"

# ─── record mode: wrap in asciinema rec ──────────────────────────────────────

TMP_CAST=""

if [[ "$MODE" == "record" ]]; then
  mkdir -p "$CASTS_DIR"
  # macOS mktemp requires X's at the END — create a base file then rename.
  _TMP_BASE="$(mktemp /tmp/auto-demo-XXXXXX)"
  TMP_CAST="${_TMP_BASE}.cast"
  mv "$_TMP_BASE" "$TMP_CAST"

  step "Recording: asciinema rec → $TMP_CAST"
  info "will post-process → $CAST_PATH"

  # Launch an asciinema-recorded shell that is then driven by send-keys.
  # The PTY lives inside the rmux pane, so asciinema sees a real TTY.
  #
  # Demo D: omit --idle-time-limit so the cast timeline ≈ wall-clock. This makes
  # the hook-epoch → cast-time mapping exact (cast_start from header.timestamp +
  # elapsed seconds = hook epoch offset). A/B/C keep --idle-time-limit 2 since they
  # use content-based sentinel injection and don't need wall-clock alignment.
  if [[ "$DEMO" == "D" ]]; then
    IDLE_LIMIT_FLAG=""
  else
    IDLE_LIMIT_FLAG="--idle-time-limit 2"
  fi

  ASCIINEMA_REC_CMD="asciinema rec \
    --output-format asciicast-v2 \
    --cols $RMUX_COLS \
    --rows $RMUX_ROWS \
    $IDLE_LIMIT_FLAG \
    --overwrite \
    --title \"design-data — demo $DEMO\" \
    $TMP_CAST"

  # Start a background rmux session whose first command IS the asciinema recorder.
  rmux new-session -d -s "$SESSION" -x "$RMUX_COLS" -y "$RMUX_ROWS" "bash -c '$ASCIINEMA_REC_CMD'"
  sleep 2  # give asciinema a moment to open its PTY

  step "Running beats (record mode)"
  "run_beats_${DEMO}" "$SESSION" "record" "$TMP_CAST" "$REPO_ROOT" || true

  # Wait for asciinema to flush and close (the shell inside it exited).
  local_wait=0
  while [[ ! -s "$TMP_CAST" ]] && (( local_wait < 10 )); do
    sleep 1; (( local_wait++ ))
  done
  end_session "$SESSION" 2>/dev/null || true

  # Verify the output is v2.
  local_head=$(head -1 "$TMP_CAST" 2>/dev/null || true)
  if echo "$local_head" | grep -q '"version": 2'; then
    info "cast format: asciicast v2 ✓"
  else
    warn "cast header: $local_head"
    warn "Expected asciicast v2; attempting convert..."
    asciinema convert "$TMP_CAST" "$TMP_CAST.v2" || fatal "asciinema convert failed."
    mv "$TMP_CAST.v2" "$TMP_CAST"
  fi

  # Copy to the final location (beat manifests already injected markers into TMP_CAST).
  cp "$TMP_CAST" "$CAST_PATH"
  rm -f "$TMP_CAST"

  step "Cast written"
  info "$CAST_PATH"
  info "Markers in cast: $(grep -c '"m"' "$CAST_PATH" || echo 0)"

# ─── verify mode ─────────────────────────────────────────────────────────────

else
  step "Verify mode — Demo $DEMO"

  start_session "$SESSION"
  sleep 1  # wait for the shell to initialise before sending keystrokes
  "run_beats_${DEMO}" "$SESSION" "verify" "" "$REPO_ROOT" || true
  end_session "$SESSION" 2>/dev/null || true
fi

# ─── Demo D: show hooks log summary and clean up ─────────────────────────────

if [[ "$DEMO" == "D" && -n "${DEMO_BEATS_DIR:-}" ]]; then
  BEATS_LOG_PATH="$DEMO_BEATS_DIR/beats.log"
  DONE_PATH="$DEMO_BEATS_DIR/done"
  if [[ -f "$BEATS_LOG_PATH" ]]; then
    info "Hooks beats log (${BEATS_LOG_PATH}):"
    while IFS=$'\t' read -r epoch tool; do
      info "  $tool  (epoch $epoch)"
    done < "$BEATS_LOG_PATH"
  else
    warn "hooks beats.log not found — hooks may not have fired (check --settings path)"
  fi
  [[ -f "$DONE_PATH" ]] && info "Stop hook: done ✓" || warn "Stop hook: done sentinel missing"
  # Clean up the per-run scratch dir.
  rm -rf "$DEMO_BEATS_DIR" 2>/dev/null || true
fi

# ─── summary ─────────────────────────────────────────────────────────────────

STATUS=0
print_summary "$MODE" || STATUS=$?

if (( STATUS == 0 )); then
  echo -e "\n${GREEN}${BOLD}==> Demo $DEMO $MODE: OK${RESET}"
else
  echo -e "\n${RED}${BOLD}==> Demo $DEMO $MODE: FAILED (${ASSERT_FAILURES} assertion(s))${RESET}"
fi

exit $STATUS
