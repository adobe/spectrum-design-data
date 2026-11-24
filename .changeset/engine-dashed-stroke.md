---
"@adobe/design-data-spec": minor
"@adobe/spectrum-design-data": minor
"@adobe/design-data-wasm": minor
---

The engine draws dashed and per-side strokes; the calendar range band gets its dashed outline.

- **@adobe/design-data-spec**: new optional box and root props `strokeDash`, `strokeGap`,
  `strokeCap`, `strokeSides` and `strokeDashAnchor` (component-visuals.md, "Dashed and per-side
  strokes"). A recipe that binds none draws what it did before. `strokeSides` lists top, end,
  bottom, start; a corner arc is drawn where both its sides are, and a `scene` anchor lines up
  the dashes of boxes that touch. New SPEC-118 checks the literal values.
- **@adobe/spectrum-design-data**: the calendar `range-fill` binds a 1px dashed stroke (3 on,
  3 off) that outlines the joined band: top and bottom on every cell, start on the row's first
  cell, end on its last. Color is the focus indicator, or the negative border for an error range
  (two new relationship records: border width, error border color). Figma's stroke is solid; the
  component docs say dashed.
- **@adobe/design-data-wasm**: the SVG writes `stroke-dasharray`, `stroke-dashoffset` and
  `stroke-linecap` paths; scene nodes carry `stroke_style`; the PNG rasterizer draws the same.
