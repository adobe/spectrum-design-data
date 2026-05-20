---
"@adobe/design-data-tui": minor
---

TUI polish (M5 of RFC #973): mouse capture, `?` help overlay, persisted
palette history, and `--theme {terminal,spectrum}` opt-in (closes #991).

- **sdk/tui/src/main.rs**: mouse capture in init/teardown; `--theme` CLI
  flag; `Event::Mouse` arm; inline colors replaced with central Theme;
  `render_help_modal`; hit region computation after draw.
- **sdk/tui/src/app.rs**: `Modal::Help`, palette history load/save/recall,
  `handle_mouse`, `scroll_active`, `click_at`, `v`-toggled drag-select,
  `Modal::Wizard` boxed to reduce enum size.
- **sdk/tui/src/help.rs** (new): static `HELP_TEXT` for all screens.
- **sdk/tui/src/theme.rs** (new): `Theme` with `terminal()` + `spectrum()`.
- **sdk/tui/tests/m5.rs** (new): 17 tests for mouse, help, history, theming.
