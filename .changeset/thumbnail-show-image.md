---
"@adobe/spectrum-design-data": minor
"@adobe/design-data-wasm": patch
---

Rename the thumbnail option `hideImage` to `showImage` and default it to false.

- Figma Thumbnail "Show image" defaults to false, so a thumbnail draws only the
  checkerboard until `showImage` is true. The `image` part is present when `showImage`
  is true and draws `src`, or the placeholder when there is no `src`.
- Migration: replace `hideImage: false` with `showImage: true` and drop `hideImage: true`.
  A bare thumbnail with no options no longer draws an image.
- `standard-dialog` and `coach-mark` keep `hideImage` (unchanged).
- Nested thumbnails in `menu` and `stack-item` pin `showImage: true` (Figma sets Show image
  on those instances), so their renders are unchanged.
