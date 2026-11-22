---
"@adobe/spectrum-design-data": patch
---

Add type-style records to status-light, toast and alert-banner.

Each text part now has one `type-style` record that references the Component
composite typography token: `component-{s,m,l,xl}-regular` for status-light,
`component-m-regular` for toast and alert-banner.

The per-axis font-family, font-weight, font-style and font-size records of
those parts are replaced, and the three recipes bind `typeStyle`. Line-height
records, including the CJK overrides, are kept.

The legacy token output and recipe renders are unchanged. In-line alert is not
converted: its title and description use heading and body tokens, which have
no composite.
