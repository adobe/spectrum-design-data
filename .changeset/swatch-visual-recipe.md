---
"@adobe/spectrum-design-data": minor
"@adobe/design-data-spec": minor
"@adobe/design-data-wasm": minor
---

Add the swatch visual recipe, with the renderer features it needs.

- New value source `{"option": "<name>"}`: a solid CSS color the request carries in a string option
  (the swatch `preview`). A gradient, an image or an unparseable value draws the unset look with a
  diagnostic; an unset or fully transparent value draws it quietly.
- New `strokeOpacity` prop on boxes and rings (alpha of the stroke), and `inside` on a ring (drawn
  within the outlined part). SPEC-070 now compares only rings named `focus*`.
- The workflow icon set gains `slash` and `cancel`.
- Swatch draws size, square and rectangle, none, partial and full rounding, selected (border and
  inner band), disabled and keyboard focus. Size relationships pin `size`; the selection colors
  became `Border` and `Inner border`; the disabled icon rebinds to the static white replacement.
  Anatomy is proposed and still marked draft until reviewed.
