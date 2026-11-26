---
"@adobe/spectrum-design-data": minor
---

Add the `value`, `minValue`, `maxValue` and `step` options to the number-field component.

- `value` is a number and `step` is a number that defaults to 1. `minValue` and `maxValue`
  are numbers with no default, because a number field has no built-in bounds (slider defaults
  them to 0 and 100).
- The options match the slider declarations, and the number-field recipe lists the four in
  `notVisual`, so renders are unchanged. The spec sheet options table gains four rows.
- `isReadOnly` is not added here; it follows later for the text-entry components and slider.
- The legacy `@adobe/spectrum-tokens` output is unchanged.
