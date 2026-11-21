---
"@adobe/design-data-wasm": patch
"@adobe/spectrum-design-data": minor
"@adobe/spectrum-component-api-schemas": patch
---

Anatomy review of date-picker and level 2 identity (A9, PR 3 of 3). The legacy
`@adobe/spectrum-tokens` output is byte-identical.

- Anatomy: container, field-label, field (segment, error-icon, in-field-button, focus-indicator),
  help-text, and a top-level popover (present when open, no tip) that holds the calendar and, with
  time granularity, a time-field. The draft parts `value` and `day` are removed.
- Options flattened from the nested `dateField` and `calendarPopover` objects, matching picker.
  Added `granularity`, `hourCycle`, `hideTimeZone`, `selectionMode` and `visibleMonths` (1, 2, 3).
  Removed `variant`, the nested `state` enum, `showTimeZone`, `is24Hour` and `timeFields`.
- States hover, focus-+-hover, focus-+-not-hover, keyboard-focus and open.
- Records are scoped to field, segment, error-icon, in-field-button, focus-indicator, popover or a
  `between`. The popover minimum sizes are pinned by `visibleMonths`. Removed records restate other
  components: popover radius, date-field and time-field minimum widths, help-text colours.
- Registry: alias date-range-picker on date-picker. Component-status baseline is updated.
