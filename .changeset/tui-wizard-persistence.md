---
"@adobe/design-data-tui": minor
---

Persist in-progress wizard drafts across TUI restarts (Q3 of RFC #973, closes #993).

- **sdk/tui/src/wizard_draft.rs** (new): serde DTOs mirroring `WizardState`; `to_draft`
  / `from_draft` conversions; atomic save/load via `DESIGN_DATA_TUI_WIZARD_DRAFT` env
  (test seam) or `dirs::data_dir()/design-data-tui/wizard-draft.json`.
- **sdk/tui/src/app.rs**: auto-save on each wizard `WizardEvent::Continue` keystroke;
  `clear_wizard_draft` on Cancel / Submit; restore via `App::new_with_options(resume)`.
- **sdk/tui/src/main.rs**: `--no-resume-wizard` flag for demo/recording sessions.
- **sdk/tui/Cargo.toml**: add `serde` with `derive` feature.
- **sdk/core/src/graph.rs**: add `serde::Deserialize` to `Layer` (was `Serialize`-only).
- **sdk/tui/tests/wizard_persistence.rs** (new): 9 tests covering round-trip, restore,
  clear-on-cancel, keystroke auto-save, and `--no-resume-wizard` suppression.
