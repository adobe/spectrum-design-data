---
"@adobe/spectrum-design-data": minor
"@adobe/design-data-wasm": patch
---

Add the `src` image option to avatar and thumbnail and draw it in their recipes.

- `avatar` and `thumbnail` gain a string option `src` (React Spectrum S2 `Avatar` `src`;
  the thumbnail picture). A host passes a `data:image/png;base64` URI.
- The avatar `image` part draws `src` clipped to the circle for the User image style
  (`presentWhen` image is `user image`); the thumbnail `image` part draws it over the
  checkerboard, hidden by `hideImage`. With no `src` both draw the placeholder.
- Both containers now stack their parts: the thumbnail image no longer lands beside the frame.
- The Gradient image swirl artwork is still not drawn (qkj5.198).
