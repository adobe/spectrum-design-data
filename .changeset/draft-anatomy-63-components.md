---
"@adobe/spectrum-design-data": minor
"@adobe/design-data-wasm": patch
"@adobe/design-data-spec": minor
---

Added draft anatomy (`anatomyReview.status: draft`) to the 63 components that had relationships
but no anatomy. Parts follow the S2 Web Figma file, with relationship contexts, React Spectrum
and Spectrum Web Components as fallbacks. Shadows, borders and strokes are styling on a part,
not parts (new line in the anatomy format chapter). Added the `prefix` and `opacity-checkerboard`
anatomy terms. The required-field indicator is declared only on `field-label`. `tabs` and
`segmented-control` declare a `keyboard-focus` state, and `segmented-control` a `disabled`
state. A reviewer still has to confirm each component before a visual recipe depends on it.
