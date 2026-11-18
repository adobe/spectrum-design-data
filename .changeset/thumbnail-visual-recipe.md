---
"@adobe/spectrum-design-data": minor
"@adobe/design-data-wasm": patch
---

Add the thumbnail visual recipe.

- Draws size (all 12 values, desktop and mobile), the opacity checkerboard, the rounded corners,
  the inset border and the disabled look (opacity 0.3). The image is not drawn yet.
- The 24 Size relationships now pin the `size` option, so each size picks its own token.
- thumbnail declares `hideImage` and `isDisabled` options and a default `size` of 500.
  Anatomy is still draft until reviewed.
