---
"@adobe/spectrum-design-data": patch
---

Fix decomposition of `icon.color-inverse`, `icon.color-inverse-background`, and
`color-wheel.color-area-margin` name objects (closes spectrum-design-data-2mh).

- **packages/design-data/tokens/icons.tokens.json**: decompose the two inverse icon
  color tokens into `{component: "icon", property, variant: "inverse"}`.
- **packages/design-data/tokens/layout-component.tokens.json**: decompose
  `color-wheel.color-area-margin` into `{component: "color-wheel", property: "margin",
  anatomy: "color-area"}`.
- **packages/tokens/src/icons.json**: regenerated legacy output reflecting the new
  `inverse-icon-color` / `inverse-icon-background-color` keys.
- **sdk/core/src/naming.rs**: `NameObject` gains a `variant` field; `parse_legacy_name`
  and `generate_legacy_name` recognize context-category variant words (`inverse`,
  `static`, `over-background`) as a leading key segment.
- **sdk/core/src/migrate.rs**: `build_flat`'s no-context path now attempts decomposition
  via `naming::roundtrips` before falling back to a thin name, matching `resolve_name`'s
  existing behavior.
