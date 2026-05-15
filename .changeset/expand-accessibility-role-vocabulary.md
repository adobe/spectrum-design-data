---
"@adobe/design-data-spec": minor
---

Expand canonical accessibility role vocabulary with `progressbar`, `meter`,
`grid`, `listitem`, and `group` (issue #892, RFC-B Phase 7 follow-on).

- `spec/accessibility.md` — 5 new rows added to the canonical role vocabulary
  table (21 total).
- `spec/accessibility-adapters.md` — 5 new rows added to each platform mapping
  table (Web/ARIA, iOS, Android).
- `components/meter.json` — `role: "meter"`, WCAG 4.1.2 added.
- `components/progress-bar.json`, `progress-circle.json`,
  `in-field-progress-circle.json` — `role: "progressbar"`, WCAG 4.1.2 and
  4.1.3 added.
- `components/table.json` — `role: "grid"` added.
- `components/avatar-group.json`, `swatch-group.json`, `button-group.json` —
  `role: "group"` added.
- `docs/rfc-coordination.md` — RFC-B open question for #892 marked resolved.
