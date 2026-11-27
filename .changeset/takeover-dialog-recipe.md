---
"@adobe/spectrum-design-data": minor
"@adobe/design-data-wasm": patch
---

Add a visual recipe for takeover-dialog.

- The surface binds rounding and background through relationships for the
  dialog variant; the full-screen variant has no records and draws no fill.
- The title binds its color. Header row: title, header-content slot and button
  group. Body: the default slot.
- takeover-dialog gains a `header` anatomy part (term already in the registry)
  and a `button-group` slot (a temporary stand-in for a nested button-group,
  bead 5m92.32.22). The header-content and default slots now declare
  `accepts` and `demo` fills so they draw.
- Not drawn: the overlay, the margin, width and height (deprecated records),
  title type, padding and gaps (no records). Dialogs have no shadow in Figma
  or S2.
- Render snapshots and goldens are regenerated. Legacy token output is unchanged.
