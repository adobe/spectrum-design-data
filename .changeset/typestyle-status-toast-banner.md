---
"@adobe/spectrum-design-data": patch
---

Add type-style records to status-light, toast and alert-banner.

Each text part gets one `type-style` record that references the Component
composite typography token: `component-{s,m,l,xl}-regular` for status-light,
`component-m-regular` for toast and alert-banner.

The per-axis font records and the recipes are unchanged for now, so recipe
renders and the legacy token output stay byte-identical. Converting the
recipes to `typeStyle` changes the `data-tokens` labels in the rendered SVG,
so it waits for a decision on regenerating the snapshots and goldens.
