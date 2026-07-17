---
"@adobe/spectrum-design-data": minor
---

Decompose fused `{colorFamily}-{background|visual}-color` properties in
color-aliases into `colorFamily` + `property`, preserving legacy output
via `legacyKey`.

- **packages/design-data/tokens/color-aliases.tokens.json**: split 114
  fused-property tokens (19 color families × background/visual-color ×
  light/dark/wireframe) into `colorFamily` + plain `property`, pinning
  `legacyKey` to keep serialized output byte-identical.
