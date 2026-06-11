---
"@adobe/design-data-tui": patch
---

Fix wizard S1 suggestion list to show readable token names, not file-path IDs.

- **sdk/tui/src/view.rs** (`render_intent_content`): use `display_name()` as
  the primary label; show source file basename as a dimmed secondary column.
- **sdk/core/src/suggest.rs** (`SuggestionResult::display_name`): new method
  deriving the legacy name from the token's `name` object via
  `extract_legacy_key`; falls back to the raw graph key when no name object
  is present.
