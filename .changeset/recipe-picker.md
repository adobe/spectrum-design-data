---
"@adobe/spectrum-design-data": minor
---

Picker: first visual recipe.

- The recipe draws the field label above a field with the selected value or the placeholder, a
  chevron at the end and the description below, at sizes s, m, l and xl, in light, dark and
  wireframe, on desktop and mobile.
- States drawn: default, hover, keyboard focus, disabled and invalid (error border). Heights,
  padding, radius, type style, text colors, the error border and the focus ring come from the
  picker relationships. The label and description reuse the field-label and help-text recipes.
- Known limits: the field has no fill (its two background records have no state pin and tie), the
  chevron has no color and no size (no usable records), and at keyboard focus the value color has
  two tied records.
- Not drawn yet: open or down state, menu container, quiet look, error icon and message, in-field
  progress circle, leading icon, prefix, side label.
