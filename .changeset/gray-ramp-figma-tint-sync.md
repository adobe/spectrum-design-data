---
"@adobe/spectrum-design-data": patch
---

Sync gray color ramp values from a Figma tint-adjustment pass.

- **packages/design-data/tokens/color-palette.tokens.json**: updated 24 gray-scale
  token values (gray-25 through gray-1000, light/dark schemes) to match the Figma
  `.Color theme` collection's tint-adjusted mode.
- **packages/tokens/src/color-palette.json**: regenerated to match via
  `moon run design-data:legacy-output`.
