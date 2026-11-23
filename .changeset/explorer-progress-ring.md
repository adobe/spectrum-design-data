---
"@adobe/design-data-wasm": patch
---

Draw the explorer's progress-circle track and fill as one ring.

- The explorer drew a stroked `box` with a centered stroke (half of it outside the
  box) and a `progress` arc with its own radius and a thickness of a ninth of the
  diameter, so the fill was thicker than the track and sat at a different radius.
- `draw-helpers.js` now has `boxSvg` (border drawn inside the box) and `progressSvg`
  (bound thickness, ring inside the bounds, the scene's `sweep`), which match
  `design-data render`. This also fixes every explorer box whose border was drawn
  half outside its bounds.
- `sdk/wasm-visual/test/progress-ring.test.mjs` checks track and fill share radius
  and stroke width for sizes s, m and l, determinate and indeterminate.
- No engine, recipe or token change; goldens and snapshots are unchanged.
