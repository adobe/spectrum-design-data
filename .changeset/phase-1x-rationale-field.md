---
"@adobe/design-data-spec": patch
---

Phase 1.x: add optional `rationale` string field to token schema

- `schemas/token.schema.json`: add `rationale` to both `tokenWithValue` and `tokenWithRef`
  properties. Field is OPTIONAL; no validation rules.
- `spec/token-format.md`: add `rationale` row to the lifecycle and metadata table.
