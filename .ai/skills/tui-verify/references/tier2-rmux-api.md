# Tier 2 rmux API reference

Source file in the repo: `tools/demo/auto/lib/rmux-drive.sh`

Source this file to get all helpers:

```bash
source tools/demo/auto/lib/rmux-drive.sh
```

Default geometry (override before sourcing):

```bash
RMUX_COLS=120   # matches Slidev deck embed and auto-demo recordings
RMUX_ROWS=36
```

***

## Session management

```bash
# Start a detached rmux session at RMUX_COLS×RMUX_ROWS running CMD.
# Kills any existing session with the same name first.
start_session SESSION_NAME [CMD]

# Kill the session. Send a quit keystroke (q, C-c, exit) before calling this.
end_session SESSION_NAME
```

***

## Keystroke helpers

```bash
# Send one or more rmux key names (Enter, Escape, Tab, C-c, Up, Down, …).
send_keys SESSION_NAME KEY [KEY...]

# Send TEXT as literal characters — no key-name interpretation, no animation.
# Use for long strings, query text, paths.
send_literal SESSION_NAME TEXT

# Send TEXT one character at a time with DELAY_MS between keystrokes (default 60 ms).
# Use when the recording needs a visible typing animation.
type_keys SESSION_NAME TEXT [DELAY_MS]
```

***

## Polling helpers

```bash
# Print the current visible pane contents (rmux capture-pane -p).
capture SESSION_NAME

# Block until REGEX appears in the pane, or time out (default 120 s). Returns 0/1.
wait_for SESSION_NAME REGEX [TIMEOUT_SECS]

# Block until pane output is unchanged for STABLE_COUNT consecutive polls (default 3).
# Equivalent to wait_for_load_state("networkidle") in Playwright.
wait_quiet SESSION_NAME [STABLE_COUNT] [TIMEOUT_SECS]
```

***

## Assertion helpers

Assertions accumulate results (do not abort) so the full run completes and a summary
is printed. Check `$ASSERT_FAILURES` or call `print_summary` at the end.

```bash
# Assert the pane contains REGEX. Prints [pass]/[FAIL] to stderr.
assert_contains SESSION_NAME REGEX [LABEL]

# Assert the pane does NOT contain REGEX.
assert_fails SESSION_NAME REGEX [LABEL]

# Print a summary line: "verify summary: N passed, M failed". Exits 1 if any failed.
print_summary MODE    # MODE is typically "verify" or "record"
```

***

## File/log helpers (Demo D patterns — available for general use)

```bash
# Block until PATH exists (default 300 s timeout).
wait_for_file PATH [TIMEOUT_SECS]

# Block until a line in LOGFILE matches REGEX (default 300 s).
wait_for_log_match LOGFILE REGEX [TIMEOUT_SECS]

# Assert that at least one line in LOGFILE matches REGEX.
assert_log_match LOGFILE REGEX [LABEL]
```

***

## Marker injection (for asciinema casts — record mode only)

```bash
# Insert asciinema v2 marker events at offsets defined in a TSV file.
# TSV format: cast_seconds<TAB>label
inject_markers_by_time CAST_IN CAST_OUT TIMES_FILE

# Insert markers anchored to the first "o" event matching a sentinel regex.
# TSV format: label<TAB>sentinel_regex
inject_markers CAST_IN CAST_OUT SENTINEL_FILE
```

***

## Complete verify flow example

```bash
source tools/demo/auto/lib/rmux-drive.sh

start_session dd-verify \
  "design-data packages/design-data --theme spectrum --no-resume-wizard"

wait_for  dd-verify "commands" 30     # wait for home screen
send_literal dd-verify ":"
type_keys dd-verify "query property=accent-color"
send_keys dd-verify "Enter"
wait_for  dd-verify "accent-color"

assert_contains dd-verify "accent-color" "token row present"
assert_fails    dd-verify "Error"         "no error shown"

echo "── screen ──"
capture dd-verify
echo "────────────"

send_keys dd-verify "q"
sleep 0.3
end_session dd-verify

print_summary verify
```
