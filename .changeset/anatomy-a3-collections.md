---
"@adobe/design-data-wasm": patch
"@adobe/spectrum-design-data": minor
"@adobe/spectrum-component-api-schemas": minor
---

Anatomy review of the collections family (A3, level 1).

- menu, list-view, side-navigation, tabs, segmented-control, breadcrumbs, steplist, tree-view, table
  and stack-item get a `container` root and a reviewed anatomy. Collections declare a `default` slot
  (the part repeats per entry of `items`); table has three, `columns` feeding two.
- New registry term `selection-indicator` (the marker inside a tab, side-navigation item or
  segment, replacing `indicator` and `selection`), plus `column-header-row`, `row-checkbox`,
  `header-row-checkbox` and `trailing-accessory-area`. `trailing-icon`, `drag-icon` and
  `step-item` are removed.
- Expand and collapse is `disclosure-button` (tree-view, side-navigation); `drill-in-chevron` and
  `link-out-icon` are non-interactive indicators. `track` is a child of `step`; `breadcrumb-title`
  is a part; `separator-icon` is `separator`; `item` is `cell` in table; `action-area` is
  `actions`.
- **Published options:** menu gets a flat `items` option; its `label`, `icon`, `description`,
  `value`, `isDisabled` and `isUnavailable` options move into the entry schema;
  side-navigation entries get a `level`; list-view drops the authored `itemRounding` entry
  option (the position is derived from the entry order); `"keyboard focus"` becomes
  `keyboard-focus` in state enums. Legacy `@adobe/spectrum-tokens` output is byte-identical.
