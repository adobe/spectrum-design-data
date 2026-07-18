---
"@adobe/spectrum-design-data": patch
---

Decompose fused `line-height-font-size-N` into `line-height` + `referenceScaleIndex` (dsi.12).

- **packages/design-data/fields/referenceScaleIndex.json**: new field declaring a numeric
  index that references a step in another scale (here, the font-size tier a line-height
  is paired with), distinct from `scaleIndex` (a token's own ramp position).
- **packages/design-data/tokens/typography.tokens.json**: 36 `line-height-font-size-N`
  tokens migrated to `property: "line-height"` + `referenceScaleIndex`, with an
  explicit `legacyKey` pin preserving the original flat key until naming.rs learns
  to reconstruct it from the new field. Verified byte-identical via
  `design-data migrate legacy-verify` against `packages/tokens/src`.
