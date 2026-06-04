# Copyright 2026 Adobe. All rights reserved.
# This file is licensed to you under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License. You may obtain a copy
# of the License at http://www.apache.org/licenses/LICENSE-2.0
#
# Beat manifest — Demo B: Name a new token (TUI)
# Produces: public/casts/B-name.cast
#
# Beat table from presentation/RECORDING.md:
#   B1  :new accent background Enter → reuse banner → Tab (alias path → Confirm diff) Esc
#   B2  :new custom brand overlay Enter → Classification → Values → Confirm → Esc
#
# Actual wizard screens (verified with rmux capture-pane):
#   Screen 1 (Intent):         "Wizard · 1/4 · Intent"  — palette Enter advances here
#   Screen 2 (Classification): "Wizard · 2/4 · Classification", Layer:, Property:, Preview:
#   Screen 3 (Values):         "Wizard · 3/4 · Values",  Mode combo, Kind, alias rows
#   Screen 4 (Confirm/Submit): "Wizard · 4/4 · ..."
#
# B1: ":new accent background" shows Screen 1 (Intent) with existing matches.
#     Tab from Screen 1 → reuse (alias path) → Screen 4 (Confirm). Esc cancels.
# B2: ":new custom brand overlay" → Screen 1 → Enter → Screen 2 → Enter → Screen 3
#     → Enter → Screen 4 → Esc (cancel without writing).
#
# Source this file; call run_beats_B SESSION_NAME MODE CAST_PATH REPO_ROOT
# The orchestrator is responsible for starting and ending the rmux session.

run_beats_B() {
  local session="$1"
  local mode="$2"
  local cast_path="$3"
  local repo="$4"

  local dataset="$repo/packages/design-data/tokens"
  local tui_cmd="$repo/sdk/target/release/design-data $dataset --theme spectrum --no-resume-wizard"
  local sentinel_file

  # Remove any stale wizard draft (from RECORDING.md clean-env checklist).
  rm -f "$HOME/Library/Application Support/design-data-tui/wizard-draft.json" 2>/dev/null || true

  # Wait for the shell in the rmux session to be ready.
  sleep 1

  # ── launch TUI ────────────────────────────────────────────────────────────
  send_literal "$session" "$tui_cmd"
  send_keys   "$session" "Enter"

  # Wait for TUI to render its initial token table.
  wait_for "$session" "(background|accent|color)" 60

  # ── B1: :new accent background (reuse/alias path) ─────────────────────────
  echo "  beat B1: TUI :new accent background" >&2
  type_keys    "$session" ":new accent background"
  send_keys   "$session" "Enter"
  # Wizard opens at Screen 1 (Intent): "Wizard · 1/4 · Intent"
  wait_for    "$session" "(1/4|Intent|Wizard)" 30
  assert_contains "$session" "(1/4|Intent|Wizard)" "B1: wizard Screen 1 (Intent) visible"
  sleep 1
  # Tab from Screen 1 → reuse selected (alias path, jumps to Confirm / Screen 4).
  send_keys "$session" "Tab"
  sleep 1
  # Esc cancels without writing.
  send_keys "$session" "Escape"
  sleep 0.8

  # ── B2: :new custom brand overlay (full classification path) ──────────────
  echo "  beat B2: TUI :new custom brand overlay" >&2
  # Remove any draft left by B1 Escape.
  rm -f "$HOME/Library/Application Support/design-data-tui/wizard-draft.json" 2>/dev/null || true
  sleep 0.3
  type_keys    "$session" ":new custom brand overlay"
  send_keys   "$session" "Enter"
  # Wizard opens at Screen 1 (Intent) again.
  wait_for    "$session" "(1/4|Intent|Wizard)" 30
  sleep 1
  # Enter → Screen 2 (Classification): "Wizard · 2/4 · Classification"
  send_keys "$session" "Enter"
  sleep 1
  wait_for    "$session" "(2/4|Classification)" 30
  assert_contains "$session" "(2/4|Classification|Layer:|Property:)" "B2: Screen 2 (Classification) visible"
  sleep 1
  # Enter → Screen 3 (Values): "Wizard · 3/4 · Values"
  send_keys "$session" "Enter"
  sleep 1
  wait_for  "$session" "(3/4|Mode combo|Values)" 30
  assert_contains "$session" "(3/4|Mode combo|Values)" "B2: Screen 3 (Values) visible"
  sleep 1
  # Enter → Screen 4 (Confirm/Submit).
  send_keys "$session" "Enter"
  sleep 1
  wait_for  "$session" "(4/4|Confirm|Submit|rationale)" 30
  assert_contains "$session" "(4/4|Confirm|Submit|rationale)" "B2: Screen 4 (Confirm) visible"
  sleep 1
  # Esc cancels without writing to disk (no --allow-write flag).
  send_keys "$session" "Escape"
  sleep 0.5

  # ── exit TUI ──────────────────────────────────────────────────────────────
  send_keys "$session" "q"
  sleep 1
  send_literal "$session" "exit"
  send_keys   "$session" "Enter"
  # Sleep long enough for asciinema to flush and write the cast (record mode).
  sleep 5

  # ── inject markers (record mode) ─────────────────────────────────────────
  if [[ "$mode" == "record" && -n "$cast_path" && -f "$cast_path" ]]; then
    sentinel_file="$(mktemp)"
    # B1: Screen 1 (Intent) visible after :new accent background
    printf 'B1 wizard intent screen\t(1/4|Intent|Wizard)\n' >> "$sentinel_file"
    # B2: Classification screen (Screen 2) — most distinctive visual for this beat
    printf 'B2 classification step\t(2/4|Classification)\n' >> "$sentinel_file"
    local tmp_marked="${cast_path%.cast}.marked.cast"
    inject_markers "$cast_path" "$tmp_marked" "$sentinel_file"
    mv "$tmp_marked" "$cast_path"
    rm -f "$sentinel_file"
  fi
}
