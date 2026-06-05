---
"@adobe/design-data-tui": minor
---

Route TUI palette dispatch through a `Command` enum and enforce
COMMANDS <-> dispatch sync (closes #1096).

- **sdk/tui/src/command.rs** (new): `Command` enum is the single source of truth for
  palette commands, with `ALL`, `canonical`, `aliases`, and `parse`.
- **sdk/tui/src/update_command.rs**: dispatch matches on `Command::parse`; `describe`/
  `component` and `new`/`create` collapse into single arms via aliases.
- **sdk/tui/src/update.rs**: Tab autocomplete derives from `Command::ALL`; removes the
  hand-maintained `KNOWN_COMMANDS` const in `app_views.rs`.
- **sdk/tui/src/logo.rs** / **help.rs**: surface the previously orphaned `:name` command
  so COMMANDS, HELP_TEXT, and dispatch agree.
- **sdk/tui/src/command.rs** (tests): bidirectional COMMANDS <-> `Command` checks plus
  alias coverage, closing the loop left open by `commands_present_in_help_text` (#1094).
