# Copyright 2026 Adobe. All rights reserved.
# This file is licensed to you under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License. You may obtain a copy
# of the License at http://www.apache.org/licenses/LICENSE-2.0
#
# shared rmux drive loop — source this file, then call the helpers.
#
# Requires: rmux 0.3.x (tmux-compatible fork) on PATH.
# Pinned geometry matches the Slidev deck's <Asciinema> embed (120×36).

RMUX_COLS=120
RMUX_ROWS=36

# ─── session management ───────────────────────────────────────────────────────

# start_session SESSION_NAME [CMD]
#   Start a detached rmux session running CMD (default: $SHELL).
#   In record mode the orchestrator wraps CMD in asciinema rec at a higher level;
#   here we just open the session with the right geometry.
start_session() {
  local name="$1"; shift
  local cmd="${1:-}"

  # Kill any leftover session with the same name.
  rmux kill-session -t "$name" 2>/dev/null || true

  if [[ -n "$cmd" ]]; then
    rmux new-session -d -s "$name" -x "$RMUX_COLS" -y "$RMUX_ROWS" "$cmd"
  else
    rmux new-session -d -s "$name" -x "$RMUX_COLS" -y "$RMUX_ROWS"
  fi
}

# end_session SESSION_NAME
#   Kill the rmux session. Callers are responsible for sending any quit keystroke
#   (e.g. "exit", "q", C-d) before calling this so the recorded program exits cleanly.
end_session() {
  local name="$1"
  rmux kill-session -t "$name" 2>/dev/null || true
}

# ─── keystroke helpers ────────────────────────────────────────────────────────

# send_keys SESSION_NAME KEY [KEY...]
#   Send one or more tmux key sequences to the pane.
#   Use for control sequences: Enter, Escape, Tab, C-c, etc.
send_keys() {
  local name="$1"; shift
  rmux send-keys -t "$name" "$@"
}

# send_literal SESSION_NAME TEXT
#   Send TEXT as literal characters (no key-sequence interpretation).
#   Use for pasting prompts, query strings, long prose — anything that must not
#   be interpreted by rmux's key-name parser.
#   NOTE: sends all characters at once — no typing animation in the recording.
#   Use type_keys instead when the typing animation matters (e.g. video recording).
send_literal() {
  local name="$1"; shift
  local text="$1"
  rmux send-keys -t "$name" -l "$text"
}

# type_keys SESSION_NAME TEXT [DELAY_MS]
#   Send TEXT one character at a time with DELAY_MS milliseconds between each
#   keystroke (default 60ms). Produces a visible typing animation in recordings.
#   Use instead of send_literal whenever the cast will be converted to video.
type_keys() {
  local name="$1"
  local text="$2"
  local delay_ms="${3:-60}"
  local delay_s
  # Convert ms to fractional seconds (bash arithmetic; use python3 for portability)
  delay_s=$(python3 -c "print(${delay_ms}/1000)")
  local i char
  for (( i=0; i<${#text}; i++ )); do
    char="${text:$i:1}"
    rmux send-keys -t "$name" -l "$char"
    sleep "$delay_s"
  done
}

# ─── polling helpers ──────────────────────────────────────────────────────────

# capture SESSION_NAME
#   Print the current visible pane contents.
capture() {
  local name="$1"
  rmux capture-pane -p -t "$name" 2>/dev/null || true
}

# wait_for SESSION_NAME REGEX [TIMEOUT_SECS]
#   Poll the pane until REGEX appears or we time out (default 120 s).
#   Returns 0 on match, 1 on timeout.
wait_for() {
  local name="$1"
  local regex="$2"
  local timeout="${3:-120}"
  local elapsed=0
  local interval=1

  while (( elapsed < timeout )); do
    if capture "$name" | grep -qE "$regex" 2>/dev/null; then
      return 0
    fi
    sleep "$interval"
    (( elapsed += interval ))
  done

  echo "  [timeout] wait_for '$regex' timed out after ${timeout}s" >&2
  return 1
}

# wait_quiet SESSION_NAME [STABLE_COUNT] [TIMEOUT_SECS]
#   Poll the pane until its output is unchanged for STABLE_COUNT consecutive
#   polls (default 3), or we time out (default 120 s).
#   Equivalent to wait_for_load_state(Quiet) in the rmux Playwright demo.
wait_quiet() {
  local name="$1"
  local stable_needed="${2:-3}"
  local timeout="${3:-120}"
  local elapsed=0
  local interval=1
  local stable_count=0
  local prev=""

  while (( elapsed < timeout )); do
    local current
    current=$(capture "$name")
    if [[ "$current" == "$prev" ]]; then
      (( stable_count++ ))
      if (( stable_count >= stable_needed )); then
        return 0
      fi
    else
      stable_count=0
      prev="$current"
    fi
    sleep "$interval"
    (( elapsed += interval ))
  done

  echo "  [timeout] wait_quiet timed out after ${timeout}s" >&2
  return 1
}

# ─── assertion helpers ────────────────────────────────────────────────────────

# These accumulate results rather than aborting, so all beats run and we get a
# full failure report. The orchestrator checks ASSERT_FAILURES at the end.
ASSERT_FAILURES=0
ASSERT_PASSES=0

assert_contains() {
  local name="$1"
  local regex="$2"
  local label="${3:-$regex}"

  if capture "$name" | grep -qE "$regex" 2>/dev/null; then
    echo "  [pass] $label" >&2
    (( ASSERT_PASSES++ ))
    return 0
  else
    echo "  [FAIL] $label (pattern: $regex)" >&2
    (( ASSERT_FAILURES++ ))
    return 1
  fi
}

# assert_fails SESSION_NAME REGEX LABEL
#   Asserts the pane does NOT contain REGEX (used to verify error-path demos).
assert_fails() {
  local name="$1"
  local regex="$2"
  local label="${3:-$regex}"

  if capture "$name" | grep -qE "$regex" 2>/dev/null; then
    echo "  [FAIL] expected absence of '$regex' — got a match ($label)" >&2
    (( ASSERT_FAILURES++ ))
    return 1
  else
    echo "  [pass] absent: $label" >&2
    (( ASSERT_PASSES++ ))
    return 0
  fi
}

# ─── hook-based wait helpers (Demo D) ────────────────────────────────────────

# wait_for_file PATH [TIMEOUT_SECS]
#   Poll until the file at PATH exists, or we time out (default 300 s).
#   Used to wait for the Stop hook to write ${DEMO_BEATS_DIR}/done.
wait_for_file() {
  local path="$1"
  local timeout="${2:-300}"
  local elapsed=0
  local interval=1

  while (( elapsed < timeout )); do
    [[ -f "$path" ]] && return 0
    sleep "$interval"
    (( elapsed += interval ))
  done

  echo "  [timeout] wait_for_file '$path' timed out after ${timeout}s" >&2
  return 1
}

# wait_for_log_match LOGFILE REGEX [TIMEOUT_SECS]
#   Poll until a line in LOGFILE matches REGEX (grep -E), or time out (default 300 s).
#   Used to detect when a specific MCP tool call has been logged by record-beat.sh.
wait_for_log_match() {
  local logfile="$1"
  local regex="$2"
  local timeout="${3:-300}"
  local elapsed=0
  local interval=1

  while (( elapsed < timeout )); do
    if [[ -f "$logfile" ]] && grep -qE "$regex" "$logfile" 2>/dev/null; then
      return 0
    fi
    sleep "$interval"
    (( elapsed += interval ))
  done

  echo "  [timeout] wait_for_log_match '$regex' in '$logfile' timed out after ${timeout}s" >&2
  return 1
}

# assert_log_match LOGFILE REGEX LABEL
#   Assert that at least one line in LOGFILE matches REGEX.
assert_log_match() {
  local logfile="$1"
  local regex="$2"
  local label="${3:-$regex}"

  if [[ -f "$logfile" ]] && grep -qE "$regex" "$logfile" 2>/dev/null; then
    echo "  [pass] $label" >&2
    (( ASSERT_PASSES++ ))
    return 0
  else
    echo "  [FAIL] $label (pattern: $regex in $logfile)" >&2
    (( ASSERT_FAILURES++ ))
    return 1
  fi
}

# inject_markers_by_time CAST_IN CAST_OUT TIMES_FILE
#   Insert asciinema v2 marker events at precise cast-time offsets.
#
#   TIMES_FILE is a TSV: cast_seconds<TAB>label  (one per line, # comments ignored)
#   cast_seconds is a float: the epoch time of the event MINUS the cast's header
#   timestamp (both in seconds). The caller computes this from beats.log.
#
#   Unlike inject_markers (which scans "o" event text), this places markers at
#   exact times regardless of rendered content — no regex, no false matches.
#
#   Requires: python3 (standard on macOS).
inject_markers_by_time() {
  local cast_in="$1"
  local cast_out="$2"
  local times_file="$3"

  python3 - "$cast_in" "$cast_out" "$times_file" <<'PYEOF'
import sys, json

cast_in, cast_out, times_file = sys.argv[1], sys.argv[2], sys.argv[3]

# Parse times file: cast_seconds<TAB>label
markers = []
with open(times_file) as f:
    for line in f:
        line = line.strip()
        if not line or line.startswith('#'):
            continue
        parts = line.split('\t', 1)
        if len(parts) == 2:
            try:
                t = float(parts[0])
                label = parts[1]
                if t >= 0:
                    markers.append([t, 'm', label])
            except ValueError:
                pass

with open(cast_in) as f:
    lines = f.readlines()

header = json.loads(lines[0])
events = [json.loads(l) for l in lines[1:] if l.strip()]

# Merge markers into event stream, sorted by time
all_events = events + markers
all_events.sort(key=lambda e: (e[0], 0 if e[1] != 'm' else 1))

with open(cast_out, 'w') as f:
    f.write(json.dumps(header) + '\n')
    for e in all_events:
        f.write(json.dumps(e) + '\n')

print(f"  [markers-by-time] placed {len(markers)} markers", file=sys.stderr)
PYEOF
}

# ─── marker injection (record mode) ──────────────────────────────────────────

# inject_markers CAST_IN CAST_OUT SENTINEL_FILE
#   Read a two-column TSV from SENTINEL_FILE (beat_label<TAB>sentinel_regex) and
#   insert asciinema v2 marker events into the cast.
#
#   Strategy: anchor each marker to the timestamp of the first "o" event whose
#   text matches the sentinel regex, rather than to a wall-clock offset. This
#   survives --idle-time-limit compression.  Markers are merge-sorted into the
#   JSON-lines stream.
#
#   SENTINEL_FILE format (one per line, # comments ignored):
#     D1 prompt submitted<TAB>mcp__design-data__
#     D2 role and states<TAB>keyboard[Ii]ntents
#
#   Requires: python3 (standard on macOS).
inject_markers() {
  local cast_in="$1"
  local cast_out="$2"
  local sentinel_file="$3"

  python3 - "$cast_in" "$cast_out" "$sentinel_file" <<'PYEOF'
import sys, json, re

cast_in, cast_out, sentinel_file = sys.argv[1], sys.argv[2], sys.argv[3]

# Parse sentinel file: label TAB regex
sentinels = []
with open(sentinel_file) as f:
    for line in f:
        line = line.strip()
        if not line or line.startswith('#'):
            continue
        parts = line.split('\t', 1)
        if len(parts) == 2:
            sentinels.append({'label': parts[0], 'regex': re.compile(parts[1]), 'done': False})

with open(cast_in) as f:
    lines = f.readlines()

header = json.loads(lines[0])
events = [json.loads(l) for l in lines[1:] if l.strip()]

markers = []
for event in events:
    t, etype, text = event[0], event[1], event[2]
    if etype != 'o':
        continue
    for s in sentinels:
        if not s['done'] and s['regex'].search(text):
            markers.append([t, 'm', s['label']])
            s['done'] = True

# Merge markers into event stream, sorted by time
all_events = events + markers
all_events.sort(key=lambda e: (e[0], 0 if e[1] != 'm' else 1))

with open(cast_out, 'w') as f:
    f.write(json.dumps(header) + '\n')
    for e in all_events:
        f.write(json.dumps(e) + '\n')

placed = sum(1 for s in sentinels if s['done'])
missed = [s['label'] for s in sentinels if not s['done']]
print(f"  [markers] placed {placed}/{len(sentinels)}", file=sys.stderr)
if missed:
    print(f"  [markers] WARNING: no match found for: {', '.join(missed)}", file=sys.stderr)
PYEOF
}

# ─── summary ─────────────────────────────────────────────────────────────────

print_summary() {
  local mode="$1"  # verify | record
  echo ""
  echo "──────────────────────────────────"
  echo " $mode summary: $ASSERT_PASSES passed, $ASSERT_FAILURES failed"
  echo "──────────────────────────────────"
  if (( ASSERT_FAILURES > 0 )); then
    return 1
  fi
  return 0
}
