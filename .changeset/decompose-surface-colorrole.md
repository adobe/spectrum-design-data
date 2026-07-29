---
"@adobe/spectrum-design-data": patch
---

Decompose fused surface/anatomy + colorRole property values into structured
`name` fields (closes spectrum-design-data-284.3).

- **packages/design-data/tokens/color-aliases.tokens.json**: split
  `overlay-color`/`overlay-opacity`, `static-*-text-color`,
  `static-*-track-color`, and `static-*-track-indicator-color` into
  `object`/`anatomy` + atomic `property`, keeping existing `legacyKey` pins.
- **packages/design-data/tokens/icons.tokens.json**: split
  `icon-color-disabled-primary` and `icon-color-emphasized-background` into
  `icon` + `property`/`state`/`colorRole`/`emphasis`.
- **packages/design-data/tokens/semantic-color-palette.tokens.json**: split
  `icon-color-{informative,negative,neutral,notice,positive}` into
  `anatomy:"icon"` + `property`/`colorRole`.
- `background-color`, `border-color`, `visual-color`, `content-color`, and
  `fill-color` are registered atomic property terms and were intentionally
  left unsplit.
