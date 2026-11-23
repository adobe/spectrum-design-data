---
"@adobe/spectrum-design-data": minor
"@adobe/design-data-wasm": patch
---

Add a `months` collection slot to calendar.

- The calendar repeats a `month` part per entry of the new `months` option
  (visibleMonths one to three). Each month holds a `title`, a `weekday-grid`
  and a `day-grid`; the grids repeat `weekday-label` (option `weekdays`) and
  `day` (the month's `days`).
- New anatomy registry terms: `month`, `weekday-grid`, `day-grid`.
- No recipe yet; the calendar and date-picker recipes follow.
