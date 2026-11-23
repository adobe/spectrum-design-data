---
"@adobe/spectrum-design-data": minor
"@adobe/design-data-wasm": patch
---

Add a visual recipe for slider.

- Draws the label, value text, track, fill and a handle at the value.
- The handle and fill use `floating.position` on the track; `fillStart` offsets the fill.
- Sizes s to xl, `trackStyle` thin and thick, `isEmphasized`, `hasFill`, disabled, hover, down
  and keyboard focus.
- The editable field is the nested `number-field` recipe, placed beside the track.
- Handle colours bind through relationships that now pin `attribute` and the hover, down and
  focus states. Live size pins also accept the deprecated size names.
- A floating leaf part reads a `cornerRadius` relative to its height (a round handle).
- Not drawn yet: range, vertical, ramp track, precise handle, focus ring, side label.
