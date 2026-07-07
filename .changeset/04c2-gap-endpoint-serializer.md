---
"@adobe/spectrum-design-data": patch
---

naming.rs: serialize `space-between` endpoint fields in `extract_legacy_key` (04c.2).

- **sdk/core/src/naming.rs**: added an explicit branch for `property: "space-between"`
  tokens that reconstructs the legacy `{from}-to-{to}` connective from the paired `from`/`to`
  fields, mirroring the existing color-domain branches. Falls through to the generic walk
  when either endpoint is missing.
