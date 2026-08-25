---
"@adobe/design-data-spec": patch
"@adobe/design-data-tui": patch
"@adobe/design-data-wasm": patch
---

Schema-validate `extensions.tokens` in the platform manifest, closing a gap
where malformed extension tokens (bad `$schema`, missing `name`) previously
failed silently or downstream instead of at manifest-validation time (closes
bead spectrum-design-data-9osr).

- **packages/design-data-spec/schemas/manifest.schema.json**: `extensions.tokens`
  now references `cascade-file.schema.json`, so entries must match the same
  cascade token shape as `token.schema.json`.
- **sdk/core/src/schema.rs**: `SchemaRegistry::validate_manifest` now registers
  sibling schemas (`token.schema.json`, `cascade-file.schema.json`,
  `value-types/*`) via `collect_schema_resources`, so the new cross-schema
  `$ref` resolves offline instead of erroring.
