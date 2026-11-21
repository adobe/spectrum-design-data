---
"@adobe/spectrum-design-data": minor
---

Picker: first visual recipe.

- The recipe draws the field label above a field with the selected value or the placeholder, a
  chevron at the end and the description below, at sizes s, m, l and xl, in light, dark and
  wireframe, on desktop and mobile.
- States drawn: default, hover, down (the box scales), keyboard focus, disabled and invalid (error
  border). Fill, heights, padding, radius, type style, text colors, the error border, the press
  look and the focus ring come from the picker relationships. The label and description reuse the
  field-label and help-text recipes.
- Known limits: the chevron has no color and no size (no usable records, and its color would tie
  at keyboard focus), and at keyboard focus the value color has two tied records.
- Not drawn yet: menu container, quiet look, error icon and message, in-field progress circle,
  leading icon, prefix, side label.
