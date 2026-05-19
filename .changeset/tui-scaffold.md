---
"@adobe/design-data-tui": minor
---

Scaffold `sdk/tui/` crate — M0 of RFC #973 (Interactive TUI & Token Authoring Wizard).

- **sdk/tui/**: new `design-data-tui` binary crate (Ratatui + crossterm) with primer header,
  empty active view, and palette prompt (`:` command mode, `/` fuzzy-find, `Esc` closes, `q` quits).
