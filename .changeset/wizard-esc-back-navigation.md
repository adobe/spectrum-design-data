---
"@adobe/design-data-tui": patch
---

Fix wizard Esc key to go back one screen instead of cancelling the entire wizard.

- **sdk/tui/src/wizard.rs** (`handle_key`): Esc on S2–S4 calls `go_back()` and
  returns `Continue`; Esc on S1 still cancels. Also fixes a dead-code bug where
  the schema URL sub-editor's Esc handler was unreachable.
- **sdk/tui/src/wizard.rs** (`go_back`): new private method that transitions
  `screen` to its predecessor, preserving all already-filled fields.
