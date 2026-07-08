---
"@adobe/spectrum-design-data": minor
---

Add a typography `emphasis` field and decompose overloaded typography `property`
values into `family`/`emphasis` (closes spectrum-design-data-pur).

- **packages/design-data/fields/emphasis.json**: new field for typography emphasis
  (`strong`, `light`, `heavy`, `emphasized`, `non-emphasized`, and compounds).
- **packages/design-data/registry/typography-emphasis.json**: new registry backing
  the `emphasis` field.
- **packages/design-data/fields/family.json**: `excludeFromLegacyKey` flipped to
  `false` so `family` now participates in legacy key reconstruction.
- **packages/design-data/registry/property-terms.json**: register atomic typography
  properties (margin/margin-multiplier variants, `text-transform`).
- **sdk/core/src/naming.rs**: serialize `family`/`emphasis` into the legacy key.
- **tools/token-mapping-analyzer/src/decomposer.js**: match `family`/`emphasis`
  registry terms (including compound runs) instead of parking them as gaps.
- **packages/design-data/tokens/typography.tokens.json**,
  **layout-component.tokens.json**: migrate 197 tokens to the new `family`/`emphasis`
  fields via `tools/token-mapping-analyzer/src/apply.js`.
