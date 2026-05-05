---
"@adobe/design-data-spec": minor
---

Add composite token support (Proposal 010). Introduces a `$valueType` field for
declaring a token's value-type schema. Defines three composite value-type schemas
(`typography`, `drop-shadow`, `typography-scale`) under `schemas/value-types/`.
Adds inline alias reference rules and three new validation rules (SPEC-014,
SPEC-015, SPEC-016). No breaking changes — `$valueType` is optional.
