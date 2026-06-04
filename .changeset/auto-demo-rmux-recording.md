---
"@adobe/design-data": patch
---

Add rmux-driven demo automation for verification and cast recording.

- **tools/demo/auto/auto-demo.sh**: orchestrator with `--verify` (CI-able) and
  `--record` (emits asciinema v2 `.cast` with beat markers) modes; `--docker` for
  clean-room A/B/C runs. Fix `set -e` swallowing the failure summary line.
- **tools/demo/auto/lib/rmux-drive.sh**: shared drive loop — `send_keys`,
  `wait_for`, `wait_quiet`, `assert_contains`, `inject_markers`.
- **tools/demo/auto/beats/{A,B,C,D}.beats.sh**: per-demo beat manifests; D
  uses lenient anchors for non-deterministic Claude Code output. Use `shlex.quote`
  for hook paths in the per-run settings generator (handles spaces in repo path).
- **tools/demo/auto/Dockerfile**: clean-room image for A/B/C (rmux + asciinema).
  Bump builder stage to `rust:1.88-slim` (matches repo toolchain; ratatui 0.30 MSRV).
  Remove malformed `COPY ... 2>/dev/null || true` line (docker syntax error).
- **tools/demo/moon.yml**: adds `auto-verify`, `auto-verify-d`, `auto-record` tasks.
- **tools/demo/presentation/RECORDING.md**: documents the automated path.
