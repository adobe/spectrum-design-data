---
"@adobe/design-data-spec": minor
"@adobe/design-data-wasm": minor
---

Add SPEC-088 (relationship-duplicate-record), a warning for exact duplicate relationship records.

Two records in the same file with equal scope, context and `$ref` or value are reported, so
`Dataset.validate()` in the WASM package can now return it. Spec sheets also resolve a `$ref`
that names a mode-set group (`setUuid`), showing one value per member scale instead of
skipping the record.
