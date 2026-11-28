---
"@adobe/spectrum-design-data": minor
"@adobe/design-data-wasm": patch
---

Add visual recipes for date-field, time-field and segmented-text-field.

- Each component gains a `segments` collection slot: the request supplies the segments (a
  value, a separator, or an empty segment that shows its format text) and the recipe draws
  one copy of the `segment` part per entry. Nothing builds them from the granularity, the
  hour cycle or the locale.
- date-field and time-field reuse the text-field chrome: label, bordered field, help text,
  the four sizes, the border and text colors for hover, focus, error and disabled, the focus
  ring and the alert icon. New relationship records point at the same tokens. The fields gain
  the `focus` state and the options `label`, `size`, `necessityIndicator`, `isRequired`,
  `helpText`, `isPlaceholder` and `isLiteral`.
- segmented-text-field draws only the row of segments, with no field chrome.
- Segment rounding and padding come from the existing segmented-text-field rounding
  and `spacing-50` records. Deprecated records are not bound.
- Not drawn yet: the error icon inside the field, and the focused segment's own fill (no
  token). The explorer shows one empty segment until `demo` can describe a collection slot.
