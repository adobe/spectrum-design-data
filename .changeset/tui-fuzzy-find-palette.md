---
"@adobe/design-data": minor
---

Make the TUI `/` fuzzy-find palette filter token names live instead of being a
no-op (closes #1079).

- **sdk/tui/src/fuzzy.rs**: new fzf-style `subsequence_score` + `rank_token_rows`
  (case-insensitive, consecutive-run and word-boundary bonuses).
- **sdk/tui/src/update.rs**: `/` seeds an all-tokens results table and stashes the
  prior view; each keystroke re-ranks live; Enter commits, Esc restores.
- **sdk/tui/src/mode.rs**: `PaletteState` gains `saved_view` for Esc restore.
- **sdk/tui/src/runtime.rs**: only Command-mode Enter dispatches `PaletteSubmit`,
  so fuzzy input never hits the command router.
- **sdk/tui/src/update_command.rs**: drop the now-unreachable fuzzy early-return.
