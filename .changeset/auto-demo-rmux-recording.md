---
"@adobe/design-data": patch
---

Add rmux-driven demo automation for verification and cast recording.

- **tools/demo/auto/auto-demo.sh**: orchestrator with `--verify` (CI-able) and
  `--record` (emits asciinema v2 `.cast` with beat markers) modes; `--docker` for
  clean-room A/B/C runs.
- **tools/demo/auto/lib/rmux-drive.sh**: shared drive loop — `send_keys`,
  `wait_for`, `wait_quiet`, `assert_contains`, `inject_markers`.
- **tools/demo/auto/beats/{A,B,C,D}.beats.sh**: per-demo beat manifests; D
  uses lenient anchors for non-deterministic Claude Code output.
- **tools/demo/auto/Dockerfile**: clean-room image for A/B/C (rmux + asciinema).
- **tools/demo/moon.yml**: adds `auto-verify`, `auto-verify-d`, `auto-record` tasks.
- **tools/demo/presentation/RECORDING.md**: documents the automated path.
