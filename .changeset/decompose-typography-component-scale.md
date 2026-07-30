---
"@adobe/spectrum-design-data": patch
---

Decompose the last fused `name.property` residue: the 15 `component-{size}-{weight}`
typography tokens (closes spectrum-design-data-284.9). Legacy output is unchanged
(`legacyKey` pinned throughout).

- **packages/design-data/tokens/typography.tokens.json**: split `component-l-bold` etc.
  into `variant:"component"` + `property:"typography"` + `size` + existing `weight`.
- **packages/design-data/registry/variants.json**: registered `component` under a new
  `typography-role` category (compact in-component scale, alongside body/detail/heading/title).
- **packages/design-data/registry/property-terms.json**: registered `typography`
  (composite type-style property, the only non-atomic typography term left in the corpus).
- **sdk/core/src/registry_data.rs**: regenerated from the registry JSON above.
