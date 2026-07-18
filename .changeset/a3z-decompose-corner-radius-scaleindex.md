---
"@adobe/spectrum-design-data": patch
---

Decompose fused `corner-radius-N` ramp into `property` + `scaleIndex` (a3z).

- **packages/design-data/tokens/layout.tokens.json**: 11 `corner-radius-{0,75,100..800,1000}`
  tokens migrated from fused `property: "corner-radius-N"` to `property: "corner-radius"`
  plus numeric `scaleIndex`, following the dsi.6 recipe. Each token keeps its existing
  dimension/multiplier token type; roundtrip verified unchanged.
