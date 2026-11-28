---
"@adobe/spectrum-design-data": minor
"@adobe/design-data-wasm": patch
---

Add a visual recipe for date-picker, closed state.

- The field reuses the date-field chrome: label, bordered field, help text (the
  `description` option), the four sizes, the border and text colors for hover, focus, error
  and disabled, the focus ring and the alert icon. A new `segments` collection slot takes
  the segments from the request, so a range or a date with a time is the same slot with more
  entries. The in-field button is the nested in-field-button recipe.
- date-picker gains the `focus` state, the options `segments`, `isPlaceholder` and
  `isLiteral`, and a `value` anatomy part (the text inside a segment) as date-field has.
  The label, the alert icon and the help text now declare when they are present.
- New relationship records for date-picker point at the same tokens as date-field. The three
  field border records for light, dark and wireframe pointed at the field background token;
  they now point at the border tokens.
- Not drawn yet: the open state (popover and calendar), the calendar icon on the button
  (the nested button draws its chevron), and the button at the end of the field.
