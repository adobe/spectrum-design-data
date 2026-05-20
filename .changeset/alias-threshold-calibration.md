---
"@adobe/design-data-agent-mcp": minor
---

Calibrate suggest threshold and wire reuse-first banner (RFC #973 Q1).

- **sdk/core/src/authoring/session.rs**: replace `ALIAS_THRESHOLD = 0.5` placeholder
  with `alias_threshold()` (default 0.35, overridable via `DESIGN_DATA_ALIAS_THRESHOLD`);
  calibrated against `packages/tokens/src`.
- **sdk/core/tests/suggest_calibration.rs**: new benchmark — positive matches 0.6–1.0,
  nonsense 0.0, threshold 0.35 sits cleanly between.
- **sdk/tui/src/wizard.rs**: `refresh_suggestions` sets `can_alias` via `alias_threshold()`.
- **sdk/tui/src/main.rs**: `render_intent_screen` shows RFC §3.10 reuse-first banner
  (accent-colored, 2-line) when `can_alias` is true.
