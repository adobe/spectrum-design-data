---
"@adobe/spectrum-design-data": minor
---

Register gap-endpoint vocabulary for space-between decomposition (closes 04c.3).

- **packages/design-data/registry/positions.json**: Add edge-family positions
  `edge`, `start-edge`, `end-edge`, `bottom-edge`.
- **packages/design-data/registry/anatomy-terms.json**: Add generic anatomy
  terms `content`, `visual`, `action`, `navigation`, `disclosure`,
  `content-area`, `disclosure-indicator`, `disclosure-icon`, `drag-handle`,
  `field-button`.
- **packages/design-data/components/*.json**: Add component-scoped `anatomy[]`
  parts for 14 components (action-bar, tree-view, tag, alert-banner,
  number-field, slider, steplist, side-navigation, breadcrumbs, field-label,
  menu, status-light, table, coach-mark).
- **sdk/core/src/validate/rules/spec047.rs**: Retry unresolved endpoints by
  stripping a registered position affix and validating the remainder as
  anatomy, covering fused endpoints like `content-area-bottom`/`item-top`.
- **sdk/core/src/registry_data.rs**: Regenerated via `sdk:codegen`.
