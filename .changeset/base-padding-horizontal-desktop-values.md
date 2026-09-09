---
"@adobe/spectrum-design-data": minor
---

Correct desktop `base-padding-horizontal` values for large/extra-large/2x-large
to match the design decision confirmed in Figma/Tokens Studio, which never
propagated to design-data (closes DNA-1926).

- **packages/design-data/tokens/layout.tokens.json**: `base-padding-horizontal-large`
  14px→16px, `base-padding-horizontal-extra-large` 16px→18px,
  `base-padding-horizontal-2x-large` 18px→20px (desktop scale only; mobile unchanged).
