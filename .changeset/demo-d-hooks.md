---
"@adobe/design-data": patch
---

Retrofit Demo D recording with Claude Code hooks for reliable beat detection.

- **tools/demo/auto/hooks/settings.json**: run-scoped hooks config (passed via
  `claude --settings`); wires `PostToolUse` and `Stop` hooks to Demo D scripts.
- **tools/demo/auto/hooks/record-beat.sh**: appends tool-call epoch to beats log on
  every `mcp__design-data__` call — replaces brittle screen-text sentinel matching.
- **tools/demo/auto/hooks/stop-done.sh**: touches done sentinel when Claude finishes —
  replaces fragile `wait_quiet` / 180 s blind sleep.
- **tools/demo/auto/beats/D.beats.sh**: hook-driven beat detection with content-scrape
  fallback; precision marker injection from hook epochs.
- **tools/demo/auto/lib/rmux-drive.sh**: adds `wait_for_file`, `wait_for_log_match`,
  `assert_log_match`, and `inject_markers_by_time` helpers.
- **tools/demo/auto/auto-demo.sh**: exports `DEMO_BEATS_DIR`, passes `--settings`,
  removes `--idle-time-limit` for Demo D to align cast timeline with wall-clock.
