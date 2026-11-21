---
"@adobe/design-data-wasm": patch
"@adobe/spectrum-component-api-schemas": patch
"@adobe/spectrum-design-data": minor
---

Anatomy review of the calendar and its three legacy holders (A9, part 2 of 3). calendar
and the holders reach level 2. The legacy `@adobe/spectrum-tokens` output is byte-identical.

- calendar: reviewed anatomy with container, previous-button, next-button, title, weekday-label,
  day (current-day-indicator, unavailable-indicator, focus-indicator), range-fill and help-text,
  plus a `days` slot. New option `visibleMonths` (1, 2, 3); `showTimeZone` is removed; the
  `days[].state` value `keyboard focus` becomes `keyboard-focus`.
- single-, double- and triple-calendar: frozen legacy holders with a container part only. Their
  six legacy records move from part `popover` to `container`; the components are not deprecated.
- The 27 calendar styling records move from date-picker to calendar (same uuids), with parts,
  background and border attributes, `between` pairs and pins for hover, error and disabled.
- Registry: terms day, weekday-label, range-fill, current-day-indicator, unavailable-indicator,
  previous-button and next-button; aliases on calendar, title and range-fill.
- CLI 0.62.0. Component-status and same-pin-set baselines are updated.
