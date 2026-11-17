---
"@adobe/spectrum-design-data": minor
"@adobe/design-data-wasm": minor
---

Clean up help text data.

- The `isDisabled` option no longer says help text cannot be both disabled and negative. Figma and
  React Spectrum draw the combination, and the recipe renders it.
- Remove the help text `Minimum height` relationships (they pointed at control heights, 24 to
  48px) and the top/bottom edge spacing to text and to icon. Figma sizes help text to its text
  (16 to 22px) with no padding, and the recipe binds none of them.
