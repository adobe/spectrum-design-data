---
"@adobe/spectrum-design-data": minor
"@adobe/design-data-wasm": patch
---

Rename `hideImage` to `showImage` on `standard-dialog` and `coach-mark`, with Figma defaults.

- `standard-dialog` `showImage` defaults to false (Figma "Show preview" is false).
- `coach-mark` `showImage` defaults to true (Figma "Show cover image" is true).
- Migration: replace `hideImage: false` with `showImage: true` and drop `hideImage: true`.
  A bare `standard-dialog` no longer includes the cover image.
- No other component nests either one, and neither recipe draws the cover image, so no
  render changes.
