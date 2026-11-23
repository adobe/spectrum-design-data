---
"@adobe/spectrum-design-data": minor
"@adobe/design-data-wasm": patch
---

Add a visual recipe for calendar.

- The calendar draws its months side by side, each a title, a weekday grid
  and a day grid (nested repeat in the grid engine). Days draw a circle
  that is filled when selected (accent, negative with `isError`), hover
  fill, disabled text and the day number. Binds live tokens; day size is
  the `size-500` token (32).
- Options: `isSelected`, `isRangeStart`, `isRangeEnd`, `isUnavailable` and
  `isToday` on the component, and `label` on `days[]`. Anatomy gains a
  `label` part in `day`, a `text` part in `weekday-label`, and
  `presentWhen` on the current-day, unavailable and range-fill parts.
- Calendar relationships pin day colors to `isSelected` (and `isError`);
  the selected text color now points at the live
  `transparent-static-white-1000` instead of the deprecated `white`.
- Not drawn: previous and next buttons, help text, range fill band and
  range ends, today marker, unavailable strike, focus ring.
- SPEC-116 no longer flags a grid under a repeated part when no component catalog is loaded (validate-dataset).
- Snapshots and goldens are regenerated. Legacy token output is unchanged.
