---
"@adobe/design-data": minor
---

Add the Foundation→Platform manifest cascade to the data-source resolver (closes #1053).

- **sdk/core `graph.rs`**: new `TokenGraph::apply_platform_manifest` applies a
  platform manifest's `include`/`exclude` query filters, type-preserving
  `overrides`, `extensions.tokens`, and returns `modeSetRestrictions`.
- **sdk/core `schema.rs`**: new `SchemaRegistry::validate_manifest` performs Layer 1
  validation against `manifest.schema.json`.
- **sdk/core `data_source`**: `[source].manifest` config field and
  `ResolvedData.platform_manifest` carry the platform manifest path.
- **sdk/cli**: `query` and `resolve` now apply a configured platform manifest
  (schema-validated) and feed mode-set restrictions into resolution.
