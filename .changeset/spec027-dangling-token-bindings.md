---
"@adobe/spectrum-design-data": patch
---

Remove SPEC-027 dangling `tokenBindings` superseded by CTR relationships or
referencing no real token (closes spectrum-design-data-vpk).

- **components/cards.json**: drop 3 legacy bindings (`card-header-to-footer`,
  `card-title-to-description`, `horizontal-card-edge-to-content-regular`) now
  covered by CTR relationships.
- **components/table.json**: drop 4 duplicate selected-row-background bindings
  covered by CTR.
- **components/combo-box.json**: drop the `in-field-progress-circle` binding
  (that name is an anatomy anchor, not a token; covered by CTR).
- **components/list-view.json**: drop the stale `stack-item-*` binding
  covered by CTR.
- **components/tree-view.json**: drop 2 drag-handle spacing bindings covered
  by CTR.
- **components/drop-zone.json**: drop 4 bindings referencing non-Spectrum
  garbage token names.
