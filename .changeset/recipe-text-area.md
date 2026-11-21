---
"@adobe/spectrum-design-data": minor
---

Text area: first visual recipe.

- The recipe draws the field label above a tall bordered field with the value at the top, a
  valid check and the help text below, at sizes s, m, l and xl, in light, dark and wireframe, on
  desktop and mobile.
- States drawn: default, hover, keyboard focus, disabled and invalid (error border). Width,
  padding, radius, colors, type style, border and focus ring come from the text area
  relationships. The label and help text reuse the field-label and help-text recipes.
- The height token exists only for the large size, so the other sizes take the `height` option.
  Vertical padding is drawn for sizes m, l and xl only.
- Not drawn yet: wrapped multi line text, the drag handle, character count, error icon, minimum
  width, size s vertical padding, side label.
