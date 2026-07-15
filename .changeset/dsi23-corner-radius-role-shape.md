---
"@adobe/spectrum-design-data": minor
---

Register a `role` name-object field and `full`/`none` shape values, and decompose the
11 corner-radius special-value tokens (closes spectrum-design-data-dsi.2.3).

- **packages/design-data/fields/role.json**, **registry/roles.json**: new `role`
  name-object field (`container`, `control`) distinguishing an object's position in a
  nesting relationship from its `size` — the 9 `corner-radius-{small,medium}-size-*`
  tokens are two overlapping radius scales (container vs. nested control rounding),
  not one scale modulated by size.
- **registry/shapes.json**: add `full`/`none` shape values for `corner-radius-full`
  and `corner-radius-none`.
- **packages/design-data/tokens/layout.tokens.json**: decompose all 11 tokens to
  `{property: corner-radius, shape | role, size}`, pinning `name.legacyKey` on each.
- **packages/design-data-spec/schemas/token.schema.json**, **spec/{taxonomy,token-format}.md**:
  document the new `role` field.
- **tools/token-mapping-analyzer/src/decomposer.js**: add `role` to the fallback
  serialization order.
- **sdk/core/src/registry_data.rs**: regenerated from the registry changes.
