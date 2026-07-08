---
"@adobe/spectrum-design-data": patch
---

Fix decomposition of `icon.color-inverse`, `icon.color-inverse-background`, and
`color-wheel.color-area-margin` name objects (closes spectrum-design-data-2mh). No
behavior change for `@adobe/spectrum-tokens` consumers — the legacy flat keys are pinned
via the new `legacyKey` escape hatch.

- **packages/design-data/tokens/icons.tokens.json**: decompose the two inverse icon
  color tokens into `{component, property, variant: "inverse", legacyKey}`.
- **packages/design-data/tokens/layout-component.tokens.json**: decompose
  `color-wheel.color-area-margin` into `{component: "color-wheel", property: "margin",
  anatomy: "color-area"}`.
- **sdk/core/src/naming.rs**: `NameObject` gains a `variant` field; `parse_legacy_name`
  and `generate_legacy_name` recognize context-category variant words (`inverse`,
  `static`, `over-background`) as a leading key segment. `extract_legacy_key` honors a new
  `name.legacyKey` override, checked before reconstruction.
- **sdk/core/src/migrate.rs**: `build_flat`'s no-context path now attempts decomposition
  via `naming::roundtrips` before falling back to a thin name, matching `resolve_name`.
- **packages/design-data-spec/schemas/token.schema.json**: document the `legacyKey`
  escape-hatch field on the name object.
