---
"@adobe/spectrum-design-data": patch
---

Decompose the four registered legacy-alias surface-color properties into
`object` + `property` (closes spectrum-design-data-284.8).

- **color-aliases.tokens.json**, **color-component.tokens.json**,
  **icons.tokens.json**, **layout-component.tokens.json**,
  **semantic-color-palette.tokens.json**: split `background-color`,
  `border-color`, `visual-color`, and `border-opacity` into
  `object:"background"|"border"|"visual"` + `property:"color"|"opacity"`,
  pinning an explicit `legacyKey` on every changed token.
- `content-color`/`fill-color` intentionally left atomic (already-registered
  atomic property terms, per prior epic-284 decisions).
