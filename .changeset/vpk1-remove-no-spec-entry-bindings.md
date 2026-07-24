---
"@adobe/spectrum-design-data": patch
---

Remove SPEC-027 dangling `tokenBindings` with no backing token or Figma spec
entry (bead `spectrum-design-data-vpk.1`, no-spec-entry noise subset).

- **packages/design-data/components/date-picker.json**: remove `current-day-indicator-size-100`.
- **packages/design-data/components/avatar.json**: remove `gradient-angle`.
- **packages/design-data/components/title.json**: remove the bare Title-XXXL
  `font-family`/`font-weight`/`font-size`/`line-height`/`font-style` bindings
  (keeps `letter-spacing`, which resolves to a real token).
- **packages/design-data/components/tree-view.json**: remove `title-content-color`.
