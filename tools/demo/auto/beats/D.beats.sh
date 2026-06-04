# Copyright 2026 Adobe. All rights reserved.
# This file is licensed to you under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License. You may obtain a copy
# of the License at http://www.apache.org/licenses/LICENSE-2.0
#
# Beat manifest — Demo D: Agent workflow (Claude Code + design-data MCP)
# Produces: public/casts/D-agent.cast
#
# Beat table from presentation/RECORDING.md:
#   D1  claude launch + paste primary prompt → Enter           marker after first MCP call
#   D2  agent calls describe_component → role/states answer    marker after
#   D3  agent calls resolve_token → dark-mode resolved value   marker after
#   D4  Claude stop (done sentinel) → exit                     marker after
#
# Hook-based approach:
#   A per-run settings JSON is generated at runtime (not the static hooks/settings.json).
#   It embeds absolute paths for the hook scripts AND DEMO_BEATS_DIR directly in each
#   hook command string, so hooks work regardless of rmux session environment inheritance.
#   Beats are detected by polling beats.log, immune to model phrasing variation.
#
# Fallback (beats.log still empty after D1 timeout):
#   Falls back to screen-scrape assertions; warns clearly.
#
# Source this file; call run_beats_D SESSION_NAME MODE CAST_PATH REPO_ROOT
# The orchestrator must export DEMO_BEATS_DIR before calling this function.

run_beats_D() {
  local session="$1"
  local mode="$2"
  local cast_path="$3"
  local repo="$4"

  local hooks_dir="$repo/tools/demo/auto/hooks"
  local record_beat_sh="$hooks_dir/record-beat.sh"
  local stop_done_sh="$hooks_dir/stop-done.sh"

  # Prompt: verbatim primary question from agent-questions.md.
  # Single-line to avoid literal-newline issues with send-keys -l.
  local prompt="Using the design-data MCP, look up the button component and tell me: 1. What its accessibility role and keyboard intents are 2. Which states it declares 3. Which token resolves the default background color in the dark color scheme. Show the answers with citations from the spec, not a guess."

  # Hook-log paths (set by orchestrator before calling this function).
  local beats_log="${DEMO_BEATS_DIR}/beats.log"
  local done_file="${DEMO_BEATS_DIR}/done"

  # Clear any stale artefacts from a prior run.
  rm -f "$beats_log" "$done_file" 2>/dev/null || true

  # ── Generate per-run settings file with DEMO_BEATS_DIR embedded ──────────
  # Two bugs in a static settings.json approach:
  #   1. JSON "// comment" keys break parsers → use pure valid JSON here.
  #   2. DEMO_BEATS_DIR isn't inherited by the rmux session shell → embed it
  #      directly in each hook command string so hooks work unconditionally.
  local hooks_active=false
  local per_run_settings=""

  if [[ -f "$record_beat_sh" && -f "$stop_done_sh" && -n "${DEMO_BEATS_DIR:-}" ]]; then
    # macOS mktemp requires X's at the end — create base file then rename.
    _settings_base="$(mktemp /tmp/demo-d-settings-XXXXXX)"
    per_run_settings="${_settings_base}.json"
    mv "$_settings_base" "$per_run_settings"
    # Use python3 to write the JSON so quoting in paths is handled correctly.
    python3 - "$per_run_settings" "$record_beat_sh" "$stop_done_sh" "$DEMO_BEATS_DIR" <<'PYEOF'
import sys, json, shlex

out_path, record_sh, stop_sh, beats_dir = sys.argv[1:5]

settings = {
  "hooks": {
    "PostToolUse": [{
      "matcher": "mcp__design-data__.*",
      "hooks": [{"type": "command",
                 "command": f"DEMO_BEATS_DIR={shlex.quote(beats_dir)} bash {shlex.quote(record_sh)}",
                 "timeout": 30}]
    }],
    "PostToolUseFailure": [{
      "matcher": "mcp__design-data__.*",
      "hooks": [{"type": "command",
                 "command": f"DEMO_BEATS_DIR={shlex.quote(beats_dir)} bash {shlex.quote(record_sh)} --failure",
                 "timeout": 30}]
    }],
    "Stop": [{
      "hooks": [{"type": "command",
                 "command": f"DEMO_BEATS_DIR={shlex.quote(beats_dir)} bash {shlex.quote(stop_sh)}",
                 "timeout": 30}]
    }]
  }
}

with open(out_path, "w") as f:
    json.dump(settings, f, indent=2)
print(f"  [hooks] wrote per-run settings → {out_path}", file=__import__('sys').stderr)
PYEOF
    if [[ -f "$per_run_settings" ]]; then
      hooks_active=true
    else
      warn "failed to generate per-run settings — falling back to screen scrape"
    fi
  else
    warn "hook scripts missing or DEMO_BEATS_DIR unset — falling back to screen scrape"
  fi

  # Wait for the shell in the rmux session to be ready.
  sleep 1

  # ── launch Claude Code ────────────────────────────────────────────────────
  # --settings: per-run JSON with PostToolUse + Stop hooks baked in
  # --permission-mode auto: skips MCP tool-use confirmation dialogs
  if $hooks_active; then
    send_literal "$session" "claude --settings \"$per_run_settings\" --permission-mode auto"
  else
    send_literal "$session" "claude --permission-mode auto"
  fi
  send_keys "$session" "Enter"

  # Wait for Claude Code's separator line (unique to its TUI, not the echo).
  echo "  beat D1: waiting for Claude Code to start..." >&2
  wait_for "$session" "──────────────────────────────────────────────────────────────────────────────────────────────────────────────" 90

  # ── D1: paste the primary prompt ──────────────────────────────────────────
  echo "  beat D1: submitting primary prompt" >&2
  send_literal "$session" "$prompt"
  send_keys   "$session" "Enter"

  # ── D1 beat boundary: first MCP tool call ─────────────────────────────────
  if $hooks_active; then
    echo "  beat D1→D2: waiting for first design-data tool call (hooks log)..." >&2
    wait_for_log_match "$beats_log" "mcp__design-data__" 180
    assert_log_match    "$beats_log" "mcp__design-data__" "D1: design-data MCP called"
  else
    echo "  beat D1→D2: fallback — waiting for tool-call text in pane..." >&2
    wait_for "$session" "(ctrl.o|Called design-data|Calling design-data)" 180
    assert_contains "$session" "(ctrl.o|Called design-data|Calling design-data)" "D1: design-data MCP called (fallback)"
  fi

  # ── D2 beat boundary: describe_component completed ────────────────────────
  if $hooks_active; then
    echo "  beat D2: waiting for describe_component in hooks log..." >&2
    wait_for_log_match "$beats_log" "describe_component" 120
    assert_log_match    "$beats_log" "describe_component" "D2: describe_component call logged"
  else
    echo "  beat D2: fallback — waiting for role/states in pane..." >&2
    wait_for "$session" "(keyboardIntents|keyboard intents:|accessibility role|role:)" 120
    assert_contains "$session" "(keyboardIntents|keyboard intents:|accessibility role|role:)" "D2: accessibility role (fallback)"
    assert_contains "$session" "(hover|focus|disabled|States:|states:)" "D2: states listed (fallback)"
  fi

  # ── D3 beat boundary: resolve_token completed ─────────────────────────────
  if $hooks_active; then
    echo "  beat D3: waiting for resolve_token in hooks log..." >&2
    wait_for_log_match "$beats_log" "resolve_token" 120
    assert_log_match    "$beats_log" "resolve_token" "D3: resolve_token call logged"
  else
    echo "  beat D3: fallback — waiting for resolved value in pane..." >&2
    wait_for "$session" "(#[0-9A-Fa-f]{3,6}|rgb[( ]|accent-color-[0-9]|Resolved:)" 120
    assert_contains "$session" "(#[0-9A-Fa-f]{3,6}|rgb|accent-color-[0-9]|Resolved:)" "D3: resolved value (fallback)"
  fi

  # ── D4: wait for Claude to finish (Stop hook) ─────────────────────────────
  if $hooks_active; then
    echo "  beat D4: waiting for Stop hook (done sentinel)..." >&2
    # Gate on resolve_token logged first to prevent a premature Stop from truncating.
    wait_for_log_match "$beats_log" "resolve_token" 30 2>/dev/null || true
    wait_for_file "$done_file" 300
    echo "  beat D4: done sentinel received" >&2
  else
    echo "  beat D4: fallback — wait_quiet (may exit early under asciinema buffering)" >&2
    wait_quiet "$session" 4 120
  fi

  # ── exit Claude Code ──────────────────────────────────────────────────────
  echo "  beat D4: exiting Claude Code" >&2
  send_literal "$session" "exit"
  send_keys   "$session" "Enter"
  sleep 3
  send_literal "$session" "exit"
  send_keys   "$session" "Enter"
  sleep 8  # wait for asciinema to flush the cast

  # ── clean up per-run settings file ───────────────────────────────────────
  [[ -n "$per_run_settings" ]] && rm -f "$per_run_settings" 2>/dev/null || true

  # ── inject markers (record mode) ─────────────────────────────────────────
  if [[ "$mode" == "record" && -n "$cast_path" && -f "$cast_path" ]]; then
    if $hooks_active && [[ -s "$beats_log" ]]; then
      _inject_d_markers_from_hooks "$cast_path" "$beats_log"
    else
      warn "hooks log empty — falling back to sentinel text scan for markers"
      _inject_d_markers_fallback "$cast_path"
    fi
  fi
}

# ── marker injection helpers ─────────────────────────────────────────────────

_inject_d_markers_from_hooks() {
  local cast_path="$1"
  local beats_log="$2"

  python3 - "$cast_path" "$beats_log" <<'PYEOF'
import sys, json, os

cast_path, beats_log = sys.argv[1], sys.argv[2]

with open(cast_path) as f:
    header = json.loads(f.readline())
    rest = f.readlines()

cast_start = header.get("timestamp", 0)

beats = []
with open(beats_log) as f:
    for line in f:
        parts = line.strip().split('\t')
        if len(parts) >= 2:
            try:
                beats.append((float(parts[0]), parts[1]))
            except ValueError:
                pass

if not cast_start:
    print("  [markers] WARNING: cast has no timestamp in header", file=sys.stderr)
    sys.exit(0)

d1_t = d2_t = d3_t = d4_t = None
for epoch, tool in beats:
    offset = max(0.0, epoch - cast_start)
    if d2_t is None and "describe_component" in tool:
        d2_t = offset
    if d3_t is None and "resolve_token" in tool:
        d3_t = offset
    if d4_t is None and "STOP" in tool:
        d4_t = offset

# D1 = "prompt submitted" — we don't have a direct hook for this moment, so
# anchor it 5 seconds before D2 (describe_component), which is approximately
# when the user typed Enter on the prompt. This keeps D1 visually distinct
# from D2 rather than having them overlap at the same timestamp.
if d2_t is not None:
    d1_t = max(0.5, d2_t - 5.0)

markers = []
if d1_t is not None: markers.append([d1_t, "m", "D1 prompt submitted"])
if d2_t is not None: markers.append([d2_t, "m", "D2 role and states"])
if d3_t is not None: markers.append([d3_t, "m", "D3 dark-mode resolved value"])
if d4_t is not None: markers.append([d4_t, "m", "D4 agent skill alternative"])

if not markers:
    print("  [markers] WARNING: no beats mapped; no markers placed", file=sys.stderr)
    sys.exit(0)

events = [json.loads(l) for l in rest if l.strip()]
all_events = sorted(events + markers, key=lambda e: (e[0], 0 if e[1] != "m" else 1))

tmp = cast_path + ".marktmp"
with open(tmp, "w") as f:
    f.write(json.dumps(header) + "\n")
    for e in all_events:
        f.write(json.dumps(e) + "\n")
os.replace(tmp, cast_path)
print(f"  [markers] placed {len(markers)}/4 from hook epochs", file=sys.stderr)
PYEOF
}

_inject_d_markers_fallback() {
  local cast_path="$1"
  local sentinel_file
  sentinel_file="$(mktemp)"
  printf 'D1 prompt submitted\t(ctrl.o|Called design-data)\n'   >> "$sentinel_file"
  printf 'D2 role and states\t(keyboardIntents|keyboard intents:|accessibility role|role:)\n' >> "$sentinel_file"
  printf 'D3 dark-mode resolved value\t(#[0-9A-Fa-f]{3,6}|rgb[( ]|accent-color-[0-9]|Resolved:)\n' >> "$sentinel_file"
  printf 'D4 agent skill alternative\t(exit|npx|alternative|agent skill)\n' >> "$sentinel_file"
  local tmp="${cast_path%.cast}.marked.cast"
  inject_markers "$cast_path" "$tmp" "$sentinel_file"
  mv "$tmp" "$cast_path"
  rm -f "$sentinel_file"
}
