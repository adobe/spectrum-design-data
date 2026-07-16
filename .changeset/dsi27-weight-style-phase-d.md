---
"@adobe/spectrum-design-data": minor
---

Promote `weight`/`style` to Phase D decomposition for 8 typography tokens
whose qualifier was fused into `property` (closes spectrum-design-data-dsi.2.7).

- **packages/design-data/fields/weight.json**, **style.json**: drop
  `excludeFromLegacyKey` (mirrors `size`).
- **packages/design-data/tokens/typography.tokens.json**,
  **packages/token-names/names/typography.json**: strip the qualifier
  from `property` and pin `legacyKey` on the 8 affected tokens.
- **sdk/core/src/registry_data.rs**: regenerated field catalog
  (`sdk:codegen`). `packages/tokens/src/typography.json` diff is empty.
- **sdk/core/src/naming.rs**: update design-intent comment and tests.
- **tools/token-mapping-analyzer/src/decomposer.js**: fix a
  field-priority ambiguity that misassigned `black`/`medium` to
  `variant`/`size` instead of `weight` once `property` is font-weight/style.
