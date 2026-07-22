---
"@adobe/design-data-wasm": patch
---

Fixed `Dataset.suggest()` returning raw `"<file>:<index>"` graph keys as
`tokenName` for cascade-format tokens instead of the readable legacy name,
since it skipped the `display_name()` derivation every other surface (diff,
TUI wizard) already uses.

- **sdk/wasm/src/types.rs**: `SuggestResult::from` now derives `token_name`
  via `SuggestionResult::display_name()`.
