# Copyright 2026 Adobe. All rights reserved.
# This file is licensed to you under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License. You may obtain a copy
# of the License at http://www.apache.org/licenses/LICENSE-2.0
#
# Beat manifest — Demo A: Find and inspect a token (TUI)
# Produces: public/casts/A-find.cast
#
# Beat table from presentation/RECORDING.md:
#   A1  :query background-color/* Enter — scroll j/k Esc              marker after
#   A2  :resolve property=accent-background-color,colorScheme=dark Enter Esc  marker after
#   A3  :describe button Enter — scroll j/k/PgDn Esc                  marker after
#   A4  / accentbg — fuzzy find, j/k, Enter                           marker after
#
# Note: A1 (browser visualizer) is out of scope; TUI covers A2 (:resolve dark),
# A3 (:describe button), A4 (/ fuzzy find). The TUI :query is shown as a bonus beat.
#
# Source this file; call run_beats_A SESSION_NAME MODE CAST_PATH REPO_ROOT
# The orchestrator is responsible for starting and ending the rmux session.

run_beats_A() {
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

  # Wait for TUI to render its initial token table (first token visible).
  wait_for "$session" "(background|accent|color)" 60

  # ── A2: :resolve accent-background-color (dark) ──────────────────────────
  echo "  beat A2: TUI :resolve" >&2
  # Correct property: "accent-background-color" (not the longer -default variant)
  # Real CLI output: "Property:  accent-background-color\nAlias: \"accent-color-800\""
  type_keys    "$session" ":resolve property=accent-background-color,colorScheme=dark"
  send_keys   "$session" "Enter"
  # Wait for Property/Alias output (resolve view renders Property and Alias headings)
  wait_for    "$session" "(Property:|Alias:|accent-background-color)" 30
  assert_contains "$session" "(Property:|Alias:|accent-background)" "A2: resolve view present"
  sleep 1
  send_keys "$session" "Escape"
  sleep 0.5

  # ── A3: :describe button ──────────────────────────────────────────────────
  echo "  beat A3: TUI :describe button" >&2
  type_keys    "$session" ":describe button"
  send_keys   "$session" "Enter"
  wait_for    "$session" "(button|Button|anatomy|role|state)" 30
  assert_contains "$session" "(button|Button|anatomy|role|state)" "A3: describe button view present"
  sleep 1
  send_keys "$session" "Escape"
  sleep 0.5

  # ── A4: / fuzzy find ──────────────────────────────────────────────────────
  echo "  beat A4: TUI / fuzzy find" >&2
  type_keys    "$session" "/accentbg"
  wait_for    "$session" "(Fuzzy|accent-background|accentbg)" 15
  assert_contains "$session" "(Fuzzy|accent-background|accentbg)" "A4: fuzzy find active"
  sleep 0.5
  send_keys "$session" "Enter"
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
    # Use screen-header strings: each only appears in its specific view, so
    # the markers land at the right timestamps and in the right order.
    # TUI headers (verified with capture-pane):
    #   Resolve view: "Resolve: accent-background-color" in the dialog title
    #   Describe view: "Describe: button" in the dialog title
    #   Fuzzy find:    "Fuzzy:" in the header line (only while fuzzy mode is active)
    printf 'A2 resolved value\tResolve:\n' >> "$sentinel_file"
    printf 'A3 describe button\tDescribe:\n' >> "$sentinel_file"
    printf 'A4 fuzzy find\tFuzzy\n' >> "$sentinel_file"
    local tmp_marked="${cast_path%.cast}.marked.cast"
    inject_markers "$cast_path" "$tmp_marked" "$sentinel_file"
    mv "$tmp_marked" "$cast_path"
    rm -f "$sentinel_file"
  fi
}
