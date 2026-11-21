---
"@adobe/spectrum-design-data": minor
---

Text field: first visual recipe.

- The recipe draws the field label above a bordered field, the value, a valid check and the help
  text below, at sizes s, m, l and xl, in light, dark and wireframe, on desktop and mobile.
- States drawn: default, hover, keyboard focus, disabled and invalid (error border). Colors,
  heights, padding, radius, border width and the focus ring come from the relationships.
- The label and help text reuse the field-label and help-text recipes. The field-label recipe now
  reads its text from the `label` option when a host sets it.
- Known limit: at keyboard focus the value color has two records (focus and keyboard focus) that
  tie, so a render with a value reports an ambiguity diagnostic.
- Not drawn yet: error icon, error message, placeholder, leading icon, prefix, character
  count, in-field progress circle and button, side label.
