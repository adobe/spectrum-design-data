---
"@adobe/spectrum-design-data": minor
---

Combo box: first visual recipe.

- The recipe draws the field label above a bordered field with the value, and the description
  below, at sizes s, m, l and xl, in light, dark and wireframe, on desktop and mobile. The field
  width comes from the `width` option, because the data has no width token.
- States drawn: default, hover over the text area, focus, keyboard focus, disabled and invalid
  (error border). Heights, padding, radius, colors, type style, border and focus ring come from
  the combo box relationships. The label and description reuse the field-label and help-text
  recipes.
- The value color records for focus and focus-hover are pinned to their states, so a value at
  keyboard focus no longer reports a tie. Resolved colors are unchanged.
- Not drawn yet: the field button (no recipe), menu container, placeholder, error icon and message,
  in-field progress circle, leading icon, prefix, side and in line label, read-only look.
