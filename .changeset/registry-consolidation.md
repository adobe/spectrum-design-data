---
"@adobe/design-system-registry": major
"@adobe/spectrum-design-data": minor
"@adobe/design-data-spec": minor
---

Move Spectrum registry vocabulary into spectrum-design-data; deprecate design-system-registry.

- **@adobe/spectrum-design-data**: gains `registry/` (27 vocabulary files) with
  subpath exports (`./registry/*.json`); now the single source of truth for all Spectrum data.
- **@adobe/design-system-registry**: reduced to a compatibility shim. Migrate imports to
  `@adobe/spectrum-design-data` — this shim will be removed in a future major version.
- **@adobe/design-data-spec**: gains `registry-value.json` and `platform-extension.json`
  schema exports; `manifest.schema.json` `conceptOrder` enum relaxed to open `string` type
  (no longer hardcodes Spectrum's field names — configurable per field catalog).
