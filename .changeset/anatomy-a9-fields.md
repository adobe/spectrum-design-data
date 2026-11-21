---
"@adobe/design-data-wasm": patch
"@adobe/spectrum-design-data": minor
---

Anatomy review of date-field, time-field and segmented-text-field (A9, PR 1 of 3). The legacy
`@adobe/spectrum-tokens` output is byte-identical.

- date-field: adds `error-icon` and `focus-indicator`, options `granularity` (day, hour, minute,
  second), `hourCycle` and `hideTimeZone`, and the text-field state set.
- time-field: aligned to date-field. The bordered box is now the `field` part under a new root
  `container`; adds `error-icon` and `focus-indicator`. Options `granularity`, `hourCycle` and
  `hideTimeZone` replace is24Hour and showTimeZone. The minimum-width record moves to `container`.
- segmented-text-field: becomes the shared segment base (container and segment) that date-field,
  time-field and date-picker copy. The rounding record moves to `segment`.
- Registry: aliases Placeholder cell and DateSegment on `segment`; date-field and time-field terms
  reworded. Component-status baseline is updated.
