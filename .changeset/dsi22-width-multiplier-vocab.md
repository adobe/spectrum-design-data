---
"@adobe/spectrum-design-data": minor
---

Register `width-multiplier`/`minimum-width-multiplier`/`maximum-width-multiplier`
property terms and `quiet` variant (closes spectrum-design-data-dsi.2.2).

- **packages/design-data/registry/property-terms.json**: add
  `width-multiplier`, `minimum-width-multiplier`, `maximum-width-multiplier` —
  unitless ratios used at the implementation level to derive a dimension from
  another dimension (design-data has no `calc()`; reuses the existing
  `multiplier.json` value schema shared with line-height/margin multipliers).
- **packages/design-data/registry/variants.json**: add `quiet` emphasis variant.
- **packages/design-data/tokens/layout-component.tokens.json**: decompose
  `combo-box-quiet-minimum-width-multiplier` to `variant: quiet` +
  `property: minimum-width-multiplier` (was fused into `property`).
- **tools/token-mapping-analyzer/src/decomposer.js**: register the three
  compounds in `COMPOUND_PROPERTIES` so they decompose cleanly.
- **packages/tokens/schemas/token-types/multiplier.json**: broaden description
  to mention width/height (dimension) multipliers.
- **sdk/core/src/registry_data.rs**: regenerated from the registry changes.
