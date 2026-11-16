---
"@adobe/design-data-spec": minor
---

Add SPEC-100 (warning): relationship records of one component that share `property`, `context`
and `$ref` and differ only in the value of one declared option SHOULD be one record that pins
an array. Records with a `legacyKey` and records that use an any-of are skipped. It has a
conformance case.
