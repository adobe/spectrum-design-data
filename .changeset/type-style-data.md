---
"@adobe/design-data-spec": minor
"@adobe/design-data-wasm": minor
"@adobe/design-data-mcp": minor
"@adobe/spectrum-design-data": patch
---

Add the `type-style` property and rule SPEC-105 (type styles, data half; 5m92.25.1).

- New property term `type-style`. The 44 records that used `typography` to `$ref` a
  typography composite (text-field, text-area, search-field, number-field, combo-box,
  picker) now use it; uuids, `$ref`s and values are unchanged, and the composite tokens
  keep `name.property: typography`.
- SPEC-105 (warning): a `type-style` record must `$ref` a typography composite and a
  typography `$ref` must have that property; the size must be a declared size; every
  inner alias must resolve in every `scale` mode. No existing record warns.
- Spec text: type-style records, inner aliases resolve by mode, and `layoutRevision` bumps
  only for solver or layout changes, not for a data-only snapshot change.
- Core: `typography::unpack` resolves a composite's sub-values per mode.
- `design-data-component-tokens` returns a composite as `style` (resolved `fontFamily`,
  `fontSize`, `fontWeight`, `lineHeight`, `letterSpacing`, by `scale` where they differ)
  instead of the raw `{font-size-100}` strings.
- Spec sheets show a type style's resolved values on the Typography page.
- The fused-property codemod treats a `$ref` to a typography composite as `type-style`.
