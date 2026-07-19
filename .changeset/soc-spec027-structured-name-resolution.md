---
"@adobe/spectrum-design-data": patch
---

SPEC-027 now resolves each token's legacy key via the shared `naming::extract_legacy_key`
resolver instead of assuming a flat string `name`, eliminating ~2948 false-positive
`tokenBindings` errors caused by the name-object migration (closes bead soc).

- **sdk/core/src/validate/rules/spec027.rs**: `token_names` is built by resolving each
  token's structured (or plain-string) `name` through `extract_legacy_key`, the same
  resolver used by `legacy.rs` and the graph's `legacy_name_index`, so `tokenBindings[].token`
  references match correctly regardless of name shape; added a regression test covering a
  structured `name` object.
