---
"@adobe/spectrum-design-data": patch
---

Decompose fused ramp/scale-index compounds flagged by dsi.6 into proper
`colorRole`/`scaleIndex` fields, closing a serializer gap where Rust and
JS silently disagreed on scaleIndex placement.

- **packages/design-data/tokens/semantic-color-palette.tokens.json**: split
  80 `{accent,informative,negative,notice,positive}-color-N` tokens into
  `colorRole` + `property:"color"` + `scaleIndex`.
- **packages/design-data/tokens/layout-component.tokens.json**: split 73
  fused `{property}-N` tokens into `property` + `scaleIndex`.
- **packages/design-data/tokens/layout.tokens.json**: split 66 fused
  `{property}-N` tokens (incl. space-between gaps) into `property`/
  `from`/`to` + `scaleIndex`.
- **sdk/core/src/naming.rs**: new `colorRole` semantic-ramp branch; now
  appends `scaleIndex` in the icon, space-between, and general branches.
- **tools/token-mapping-analyzer/src/decomposer.js**: `scaleIndex` now
  serializes as a number (was silently dropped by Rust's `.as_i64()`);
  added `colorRole` promotion + serialize branch.
- **tools/token-mapping-analyzer/src/apply.js**: added `applyScaleIndex()`.
