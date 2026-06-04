#!/usr/bin/env bash
# Copyright 2026 Adobe. All rights reserved.
# This file is licensed to you under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License. You may obtain a copy
# of the License at http://www.apache.org/licenses/LICENSE-2.0
#
# verify-tui.sh — generic ad-hoc TUI verification runner (Tier 2 of the tui-verify skill).
#
# Starts the real design-data binary inside an rmux pane at 120×36, executes a step
# file of verification directives, and reports pass/fail counts. The pane's visible
# text is printed on each `capture`, `expect`, or `refute` directive so Claude (or a
# human) can read and reason about the actual layout.
#
# USAGE
#   verify-tui.sh --dataset PATH [--steps PATH] [--theme THEME] [--session NAME]
#                 [--cols N] [--rows N] [--no-record]
#
#   --dataset PATH   Path to the design-data token dataset (required).
#   --steps FILE     Path to a step file (default: reads from stdin).
#   --theme THEME    TUI theme: terminal (default) or spectrum.
#   --session NAME   rmux session name (default: dd-verify-$$).
#   --cols N         Pane width  (default: 120, matches auto-demo geometry).
#   --rows N         Pane height (default:  36, matches auto-demo geometry).
#   --no-record      Skip recording asciinema cast (default: no cast recorded).
#   --record CAST    Record session to CAST path (asciinema v2 .cast).
#
# STEP FILE FORMAT
#   One directive per line. Lines starting with # are comments and blank lines ignored.
#
#     send KEY         Send a tmux/rmux key name (Enter, Escape, Tab, C-c, …).
#     type TEXT        Type TEXT one char at a time (60 ms delay; shows typing animation).
#     literal TEXT     Send TEXT as-is (no key interpretation; no animation).
#     wait REGEX       Block until REGEX appears in the pane (timeout: 120 s).
#     quiet [N]        Block until pane is stable for N consecutive polls (default 3).
#     expect REGEX     Assert pane contains REGEX (accumulating — does not abort).
#     refute REGEX     Assert pane does NOT contain REGEX (accumulating).
#     capture          Print the current pane contents to stdout.
#     sleep N          Sleep N seconds (whole or fractional).
#
# PREREQUISITES
#   rmux 0.3.x on PATH.
#   design-data CLI built: cargo build -p design-data-cli --release (or moon run :build).
#   asciinema 3.x on PATH (only needed with --record).
#
# EXIT CODE
#   0 if all assertions passed; 1 if any failed or a step errored.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
LIB="$SCRIPT_DIR/lib/rmux-drive.sh"

# ─── argument parsing ─────────────────────────────────────────────────────────

DATASET=""
STEPS_FILE=""
THEME="terminal"
SESSION_NAME="dd-verify-$$"
COLS=120
ROWS=36
RECORD_CAST=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dataset)   DATASET="$2";      shift 2 ;;
    --steps)     STEPS_FILE="$2";   shift 2 ;;
    --theme)     THEME="$2";        shift 2 ;;
    --session)   SESSION_NAME="$2"; shift 2 ;;
    --cols)      COLS="$2";         shift 2 ;;
    --rows)      ROWS="$2";         shift 2 ;;
    --record)    RECORD_CAST="$2";  shift 2 ;;
    --no-record) RECORD_CAST="";    shift   ;;
    -h|--help)
      sed -n '2,/^set -euo/p' "$0" | grep '^#' | sed 's/^# \?//'
      exit 0
      ;;
    *) echo "error: unknown argument: $1" >&2; exit 1 ;;
  esac
done

[[ -n "$DATASET" ]] || { echo "error: --dataset is required" >&2; exit 1; }

# ─── sanity checks ────────────────────────────────────────────────────────────

command -v rmux  >/dev/null 2>&1 || { echo "error: rmux not found on PATH (brew install rmux)" >&2; exit 1; }
if [[ -n "$RECORD_CAST" ]]; then
  command -v asciinema >/dev/null 2>&1 || { echo "error: --record requires asciinema on PATH" >&2; exit 1; }
fi

# Resolve dataset to an absolute path.
DATASET="$(cd "$REPO_ROOT" && realpath "$DATASET")"

# Find the binary.
BIN=""
for candidate in \
    "$REPO_ROOT/sdk/target/release/design-data" \
    "$REPO_ROOT/sdk/target/debug/design-data"; do
  [[ -x "$candidate" ]] && { BIN="$candidate"; break; }
done
[[ -n "$BIN" ]] || {
  echo "error: design-data binary not found — run: cargo build -p design-data-cli --release" >&2
  exit 1
}

# ─── load rmux helpers ────────────────────────────────────────────────────────

# Override geometry before sourcing so the library picks them up.
RMUX_COLS="$COLS"
RMUX_ROWS="$ROWS"
# shellcheck source=lib/rmux-drive.sh
source "$LIB"

# ─── helpers ──────────────────────────────────────────────────────────────────

BOLD=$'\033[1m'
GREEN=$'\033[0;32m'
RED=$'\033[0;31m'
RESET=$'\033[0m'

info()  { echo "${BOLD}==> $*${RESET}"; }
ok()    { echo "${GREEN}    ok${RESET}: $*"; }
err()   { echo "${RED}    error${RESET}: $*" >&2; }

# execute_steps SESSION STEPS_FILE
#   Reads directives from STEPS_FILE (or stdin if "-") and dispatches to rmux-drive.sh.
execute_steps() {
  local session="$1"
  local file="$2"

  local lineno=0
  while IFS= read -r raw_line || [[ -n "$raw_line" ]]; do
    (( lineno++ ))
    local line
    line="$(echo "$raw_line" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')"

    # Skip blank lines and comments.
    [[ -z "$line" || "$line" == \#* ]] && continue

    local directive rest
    directive="${line%% *}"
    rest="${line#* }"
    [[ "$rest" == "$directive" ]] && rest=""  # no argument

    case "$directive" in
      send)
        [[ -n "$rest" ]] || { err "line $lineno: 'send' requires a key name"; ASSERT_FAILURES=$((ASSERT_FAILURES+1)); continue; }
        send_keys "$session" "$rest"
        ;;
      type)
        [[ -n "$rest" ]] || { err "line $lineno: 'type' requires text"; ASSERT_FAILURES=$((ASSERT_FAILURES+1)); continue; }
        type_keys "$session" "$rest"
        ;;
      literal)
        [[ -n "$rest" ]] || { err "line $lineno: 'literal' requires text"; ASSERT_FAILURES=$((ASSERT_FAILURES+1)); continue; }
        send_literal "$session" "$rest"
        ;;
      wait)
        [[ -n "$rest" ]] || { err "line $lineno: 'wait' requires a regex"; ASSERT_FAILURES=$((ASSERT_FAILURES+1)); continue; }
        wait_for "$session" "$rest"
        ;;
      quiet)
        local stable="${rest:-3}"
        wait_quiet "$session" "$stable"
        ;;
      expect)
        [[ -n "$rest" ]] || { err "line $lineno: 'expect' requires a regex"; ASSERT_FAILURES=$((ASSERT_FAILURES+1)); continue; }
        echo "── capture ──"
        capture "$session"
        echo "─────────────"
        assert_contains "$session" "$rest" "$rest"
        ;;
      refute)
        [[ -n "$rest" ]] || { err "line $lineno: 'refute' requires a regex"; ASSERT_FAILURES=$((ASSERT_FAILURES+1)); continue; }
        echo "── capture ──"
        capture "$session"
        echo "─────────────"
        assert_fails "$session" "$rest" "absent: $rest"
        ;;
      capture)
        echo "── capture ──"
        capture "$session"
        echo "─────────────"
        ;;
      sleep)
        [[ -n "$rest" ]] || { err "line $lineno: 'sleep' requires a duration"; continue; }
        sleep "$rest"
        ;;
      *)
        err "line $lineno: unknown directive '$directive'"
        ASSERT_FAILURES=$((ASSERT_FAILURES+1))
        ;;
    esac
  done < <(
    if [[ "$file" == "-" ]]; then cat; else cat "$file"; fi
  )
}

# ─── main ─────────────────────────────────────────────────────────────────────

STEPS_SRC="${STEPS_FILE:--}"   # default: stdin

info "Starting rmux session '$SESSION_NAME' at ${COLS}×${ROWS}"

CMD="$BIN $DATASET --theme $THEME --no-resume-wizard"

if [[ -n "$RECORD_CAST" ]]; then
  info "Recording to: $RECORD_CAST"
  mkdir -p "$(dirname "$RECORD_CAST")"
  # asciinema wraps the binary; the pane runs asciinema rec, which spawns the TUI.
  WRAP="asciinema rec $RECORD_CAST --cols $COLS --rows $ROWS --overwrite -- $CMD"
  start_session "$SESSION_NAME" "$WRAP"
else
  start_session "$SESSION_NAME" "$CMD"
fi

# Give the TUI a moment to paint the first frame.
wait_for "$SESSION_NAME" "commands|▶" 30

info "Executing steps from: ${STEPS_FILE:-stdin}"
execute_steps "$SESSION_NAME" "$STEPS_SRC"

# Graceful quit.
send_keys "$SESSION_NAME" "q" 2>/dev/null || true
sleep 0.3
end_session "$SESSION_NAME"

print_summary verify
