---
"@adobe/spectrum-design-data": minor
---

Decompose fused `accent-*` surface color properties to `colorRole: accent`.

- **packages/design-data/registry/property-terms.json**: register
  `content-color` and `visual-color` property terms.
- **packages/design-data/tokens/color-aliases.tokens.json**: decompose the 11
  `accent-background-color` / `accent-content-color` / `accent-visual-color`
  fused properties, and migrate the 9 stray `variant: accent` tokens, to
  `colorRole: accent` + a plain `property` — pinning `legacyKey` on every
  affected token to keep `packages/tokens/src/` byte-identical.
- **sdk/core/src/registry_data.rs**: regenerated from the registry change.
