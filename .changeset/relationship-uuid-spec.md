---
"@adobe/design-data-spec": minor
---

feat(spec): relationship `uuid` is required (SPEC-084)

`relationship.schema.json` now requires `uuid`, and the new rule SPEC-084
(`ctr-uuid-required`) also covers platform manifest adds. SPEC-056 still enforces
uniqueness. A `uuid` no longer marks a value-owning relationship, so SPEC-058 and
SPEC-072 identify those by `legacyKey`. Conformance fixtures now carry uuids.
