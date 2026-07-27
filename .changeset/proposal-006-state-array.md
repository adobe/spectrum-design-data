---
"@adobe/spectrum-design-data": major
"@adobe/design-data-spec": major
"@adobe/design-data-tui": minor
---

Change token name-object `state` from a single (optionally hyphenated) string to
an ordered array of atomic state ids (Proposal 006, supersedes Proposal 005's
hyphenated-compound encoding).

- **docs/proposals/006-compound-states-as-array.md**: new proposal; Proposal 005
  marked superseded.
- **packages/design-data/fields/state.json**, **registry/states.json**: `state`
  is now `array` type; dropped the dead compound-hyphenation pattern.
- **packages/design-data-spec/schemas**: name-object `state` is now an array of
  atomic ids, `minItems: 1`.
- **packages/design-data/tokens/\*.tokens.json**: every token's `name.state`
  migrated to array form (`"hover"` → `["hover"]`, `"selected-hover"` →
  `["selected", "hover"]`).
- **sdk/core**: `NameObject.state` is `Option<Vec<String>>`; legacy-key
  generation, validation rules, and the query engine updated for array state.
- **tools/token-mapping-analyzer**: JS decomposer kept in parity with Rust.
