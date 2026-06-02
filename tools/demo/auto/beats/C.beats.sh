# Copyright 2026 Adobe. All rights reserved.
# This file is licensed to you under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License. You may obtain a copy
# of the License at http://www.apache.org/licenses/LICENSE-2.0
#
# Beat manifest — Demo C: Deterministic agent companion (CLI)
# Produces: public/casts/C-suggest.cast
#
# Beat table from presentation/RECORDING.md:
#   C1  design-data suggest "primary background color"   marker after
#   C2  design-data primer packages/design-data/tokens   marker after
#
# Source this file; call run_beats_C SESSION_NAME MODE CAST_PATH REPO_ROOT
# The orchestrator is responsible for starting and ending the rmux session.

run_beats_C() {
  local session="$1"
  local mode="$2"       # verify | record
  local cast_path="$3"  # destination .cast (record mode); empty in verify mode
  local repo="$4"

  local cli="$repo/sdk/target/release/design-data"
  # suggest requires the dataset path as a positional argument (verified with --help)
  local dataset="$repo/packages/design-data/tokens"
  local sentinel_file

  # Wait for the shell to be ready (orchestrator just opened the session).
  sleep 1

  # ── C1: suggest ───────────────────────────────────────────────────────────
  echo "  beat C1: design-data suggest" >&2
  type_keys    "$session" "$cli suggest \"primary background color\" \"$dataset\""
  send_keys   "$session" "Enter"
  # Real output: "Suggestions for \"primary background color\" (top 5):"
  wait_for    "$session" "Suggestions for" 30
  assert_contains "$session" "Suggestions for" "C1: suggest output present"
  sleep 1

  # ── C2: primer ───────────────────────────────────────────────────────────
  echo "  beat C2: design-data primer" >&2
  type_keys    "$session" "$cli primer \"$dataset\""
  send_keys   "$session" "Enter"
  # Real output: "Spec version:  1.0.0-draft\nToken count:   4166\nComponents: ..."
  wait_for    "$session" "(Spec version|Token count|Components)" 60
  assert_contains "$session" "(Spec version|Token count|Components)" "C2: primer output present"
  sleep 1

  # ── exit ──────────────────────────────────────────────────────────────────
  send_literal "$session" "exit"
  send_keys   "$session" "Enter"
  # Sleep long enough for asciinema to flush and write the cast (record mode).
  sleep 5

  # ── inject markers (record mode) ─────────────────────────────────────────
  if [[ "$mode" == "record" && -n "$cast_path" && -f "$cast_path" ]]; then
    sentinel_file="$(mktemp)"
    # TAB-separated: beat_label<TAB>sentinel_regex (matched against "o" event text)
    printf 'C1 suggest output\tSuggestions for\n' >> "$sentinel_file"
    printf 'C2 primer output\t(Spec version|Token count|Components)\n' >> "$sentinel_file"
    local tmp_marked="${cast_path%.cast}.marked.cast"
    inject_markers "$cast_path" "$tmp_marked" "$sentinel_file"
    mv "$tmp_marked" "$cast_path"
    rm -f "$sentinel_file"
  fi
}
