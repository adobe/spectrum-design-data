---
"@adobe/spectrum-design-data": minor
"@adobe/design-data-spec": patch
"@adobe/design-data-wasm": patch
---

Add visual recipes for color-slider and color-area.

- color-slider draws the channel gradient over the opacity checkerboard,
  the nested color-handle at the value and the nested field-label above.
  One recipe covers both orientations: x when horizontal, inverted y when
  vertical, and the label is hidden when vertical.
- color-area draws two stacked gradients and the nested color-handle at
  the x and y values (y inverted).
- New options carry what the host computes: `gradient` on both, `overlay`
  on color-area and `color` (the handle fill) on both. A disabled control
  has no gradient or checkerboard.
- Anatomy: color-area gains `fill` and `overlay`; color-slider
  `container.contains` also lists the checkerboard and the fill.
- SPEC-112 lets a nested `component` part float by `side`. A nested part
  with no width (an empty label) draws nothing, with no diagnostic.
- Snapshots and goldens are regenerated. Legacy token output is unchanged.
