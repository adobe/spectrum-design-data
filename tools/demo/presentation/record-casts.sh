#!/usr/bin/env bash
# Copyright 2026 Adobe. All rights reserved.
# This file is licensed to you under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License. You may obtain a copy
# of the License at http://www.apache.org/licenses/LICENSE-2.0
#
# Record one demo cast with pinned geometry for the Slidev deck.
# Drop a marker at each beat boundary (Ctrl+\, or Ctrl+i on older builds).
# See RECORDING.md for the per-beat keystroke cheat-sheet.

set -euo pipefail

DEMO="${1:-}"
NAME="${2:-}"

# Pinned to match the <Asciinema> embed dimensions in slides.md.
COLS=120
ROWS=36
IDLE_LIMIT=2

usage() {
  cat <<'USAGE'
Usage: record-casts.sh <A|B|C|D> [output-name]

  A   Find and inspect a token      (TUI)         -> public/casts/A-find.cast
  B   Name a new token              (TUI)         -> public/casts/B-name.cast
  C   Deterministic agent companion (CLI)         -> public/casts/C-suggest.cast
  D   Agent workflow                (Claude Code) -> public/casts/D-agent.cast

Pass an optional output-name to override the default cast filename (no extension).
USAGE
  exit 1
}

[ -z "$DEMO" ] && usage

if ! command -v asciinema >/dev/null 2>&1; then
  echo "error: asciinema is not installed. Run: brew install asciinema" >&2
  exit 1
fi

# Resolve repo root from this script's location (tools/demo/presentation).
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
CASTS_DIR="$SCRIPT_DIR/public/casts"
mkdir -p "$CASTS_DIR"

DATASET="packages/tokens/dist/json"
TUI_CMD="cargo run -p design-data-cli --release -- $DATASET --theme spectrum --no-resume-wizard"

# Clean any leftover wizard draft so the reuse banner / wizard start fresh.
DRAFT="$HOME/Library/Application Support/design-data-tui/wizard-draft.json"
rm -f "$DRAFT"

cd "$REPO_ROOT"

echo "==> Pre-building the CLI (release) so compile time stays out of the cast..."
cargo build -p design-data-cli --release

record() {
  local out="$1"; shift
  local title="$1"; shift
  echo "==> Recording $out — press Ctrl+\\ (or Ctrl+i) at each beat boundary; see RECORDING.md"
  asciinema rec \
    --cols "$COLS" --rows "$ROWS" \
    --idle-time-limit "$IDLE_LIMIT" \
    --overwrite \
    --title "$title" \
    "$@" \
    "$CASTS_DIR/$out"
  echo "==> Wrote $CASTS_DIR/$out"
}

case "$DEMO" in
  A|a)
    record "${NAME:-A-find}.cast" "design-data — find & inspect" --command "$TUI_CMD"
    ;;
  B|b)
    record "${NAME:-B-name}.cast" "design-data — name a new token" --command "$TUI_CMD"
    ;;
  C|c)
    echo "    Demo C is CLI-driven. The release binary is at sdk/target/release/design-data."
    echo "    Run, dropping a marker after each: "
    echo "      sdk/target/release/design-data suggest \"primary background color\""
    echo "      sdk/target/release/design-data primer $DATASET"
    echo "    Type 'exit' to finish the recording."
    record "${NAME:-C-suggest}.cast" "design-data — deterministic suggest"
    ;;
  D|d)
    cat <<'INSTRUCTIONS'

Demo D — Agent workflow (Claude Code + design-data MCP)
See RECORDING.md for the full checklist, beat table, and non-determinism guidance.

Before recording:
  1. Make sure .mcp.json has the design-data server configured.
  2. Launch `claude` once in this repo and approve the design-data MCP connection.
  3. Exit, then start the recording below and re-launch `claude` inside it.

Inside the recording, paste the primary prompt from agent-questions.md:
  "Using the design-data MCP, look up the button component and tell me:
   1. What its accessibility role and keyboard intents are
   2. Which states it declares
   3. Which token resolves the default background color in the dark color scheme
   Show the answers with citations from the spec, not a guess."

Drop a marker (Ctrl+\) after:
  D1 — prompt is submitted and the agent begins tool calls
  D2 — the agent answers role / keyboardIntents / states
  D3 — the agent answers the dark-mode resolved value with citation
  D4 — closing line about the agent skill as the low-context alternative

Type 'exit' to close Claude Code and end the recording.

INSTRUCTIONS
    record "${NAME:-D-agent}.cast" "design-data — agent (MCP)"
    ;;
  *)
    usage
    ;;
esac
