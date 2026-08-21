---
"@adobe/design-data-tui": patch
"@adobe/design-data-wasm": patch
---

Fix manifest overrides silently no-oping when targeted by a token's legacy slug.

- **sdk/core/src/graph.rs**: `resolve_override_targets` now resolves non-query
  `target` values through `resolve_alias_key` (uuid → graph key → legacy-name
  index) instead of a partial uuid/direct-key-only lookup, so overrides written
  against legacy names (e.g. `blue-100`) actually apply.
