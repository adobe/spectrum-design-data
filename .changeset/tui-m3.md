---
"@adobe/design-data-tui": minor
---

Add wizard modal (M3 of RFC #973): four-screen token authoring flow ending in diff preview.

- **sdk/tui/src/wizard.rs**: `WizardState`; Intent/Classification/Values/Confirm screens.
- **sdk/tui/src/app.rs**: `:new`/`:create` palette command opens the wizard modal; Esc cancels.
- **sdk/tui/src/main.rs**: centered overlay render via `Clear` widget; modal captures all input.
- **sdk/tui/Cargo.toml**: add `similar` dep for unified diff preview on Screen 4.
- **sdk/tui/tests/wizard.rs**: 15 new tests covering all screens and screen transitions.
- M3 stops at diff preview; `write_token` integration is M4 (no disk writes in this milestone).
