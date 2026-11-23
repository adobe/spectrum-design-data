---
"@adobe/spectrum-design-data": minor
"@adobe/design-data-wasm": patch
---

Add visual recipes for color-slider and color-area.

- color-slider draws the channel ramp (computed from `color`, `channel`
  and `colorSpace`) over the opacity checkerboard, the nested color-handle
  at the value and the nested field-label above. One recipe covers both
  orientations; the label is hidden when vertical.
- color-area draws two stacked ramps for `xChannel`, `yChannel` and
  `colorSpace` (hsl and hsb) and the nested color-handle at (x, y).
  An rgb area draws no ramp.
- A disabled control has no ramp or checkerboard. With no `color` the
  ramp is not drawn.
- color-handle and color-loupe `color` is a plain string, like the
  slider's, so a host can pass one color to both.
- Anatomy: color-area gains `fill` and `overlay`; color-slider
  `container.contains` also lists the checkerboard and fill (interim).
- Snapshots and goldens are regenerated. Legacy token output is unchanged.
