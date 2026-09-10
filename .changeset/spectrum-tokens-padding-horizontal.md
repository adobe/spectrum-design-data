---
"@adobe/spectrum-tokens": minor
---

Correct desktop `base-padding-horizontal` values for large/extra-large/2x-large
to match the design decision confirmed in Figma/Tokens Studio (closes DNA-1926).

- **packages/tokens/src/layout.json**: `base-padding-horizontal-large` 14px→16px,
  `base-padding-horizontal-extra-large` 16px→18px, `base-padding-horizontal-2x-large`
  18px→20px (desktop scale only; mobile unchanged). Regenerated from the cascade
  source fixed in #1438, which shipped without a changeset for this package.
