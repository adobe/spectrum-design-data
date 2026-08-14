---
"@adobe/spectrum-design-data": minor
---

Migrate component `tokenBindings` and `name.component`-scoped tokens into
Component/Token Relationships (CTRs), closing spectrum-design-data-x29.4.

- **packages/design-data/components/\*.json**: `tokenBindings` entries that
  resolve to a single component's own scope are removed (superseded by
  CTRs); shared/ambiguous bindings are left in place.
- **packages/design-data/relationships/\*.json**: new — 91 files, one per
  component, holding the migrated CTRs (`scope` + `$ref` to the token).
- **packages/design-data/tokens/\*.tokens.json** (color-component,
  color-palette, layout-component, layout, typography): `name.component`-scoped
  tokens removed (now represented as CTRs).
- **packages/design-data/scripts/migrate-to-relationships.mjs**: new
  re-runnable migration script.
