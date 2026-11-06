---
"@adobe/design-data-wasm": minor
"@adobe/design-data-spec": minor
"@adobe/spectrum-design-data": patch
---

Renderers draw the real Spectrum 2 icon paths from the `icons/` catalog.

- **wasm**: `renderScene`/`renderSvg` draw each icon part's catalog drawing, fitted to the part
  box, rotated about its center and filled with the part colour. Scene icon nodes carry
  `icon.drawing` (`viewBox`, `paths`). An icon with no drawing draws a placeholder plus and adds
  a diagnostic. Buttons, badges and action buttons now show `workflow:add`, the hold icon the
  corner triangle, and the accordion chevron and checkbox marks the S2 UI paths.
- **spec**: the drawing is chosen once per size and mode, a non-square part box leaves the icon
  at its smaller side, and a missing drawing must draw a placeholder with a diagnostic.
- **design-data**: the checkbox dash part box is the icon size (8/10/10/12, like the
  checkmark) instead of the bar size, so the S2 dash drawing fits it.
