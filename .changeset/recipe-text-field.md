---
"@adobe/spectrum-design-data": minor
---

Text field: first visual recipe.

- The recipe draws the field label above a bordered field, the value, a valid check and the help
  text below, at sizes s, m, l and xl, in light, dark and wireframe, on desktop and mobile.
- States drawn: default, hover, keyboard focus and disabled. Colors, heights, padding, radius,
  border width and the focus ring come from the text field relationships.
- The label and help text reuse the field-label and help-text recipes. The field-label recipe now
  reads its text from the `label` option when a host sets it.
- Known limits until an engine fix lands: dark mode value text has no color (unreadable), and an
  error field draws with no border. The error state is not drawn.
- Not drawn yet: error icon, placeholder, leading icon, prefix, character
  count, in-field progress circle and button, side label.
