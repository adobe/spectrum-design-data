---
"@adobe/design-data-spec": patch
"@adobe/spectrum-design-data": patch
---

Replace opt-out SKIP const in naming.rs with opt-in `excludeFromLegacyKey`
catalog flag (ye1.9).

- **sdk/core/src/registry.rs**: Added `exclude_from_legacy_key: bool`
  to `FieldCatalogEntry`; absent in field JSON defaults to false (opt-in).
- **sdk/scripts/generate-registry-data.js**: Emits the new field from
  `d.excludeFromLegacyKey` in each generated literal.
- **sdk/core/src/naming.rs**: Deleted hardcoded `SKIP` const; walk now
  skips entries where `exclude_from_legacy_key` is true.
- **packages/design-data/fields/**: Added `"excludeFromLegacyKey": true`
  to the 9 formerly-SKIPped fields (colorScheme, scale, contrast,
  colorFamily, scaleIndex, weight, family, style, structure).
- **packages/design-data-spec/schemas/field.schema.json**: Added
  `excludeFromLegacyKey` boolean to allow the flag in field declarations.
