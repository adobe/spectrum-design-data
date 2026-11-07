---
"@adobe/spectrum-design-data": patch
---

Remove 477 exact duplicate relationship records in 40 components.

Two records in the same file with equal scope, context and `$ref` (or value) were repeated. The
first copy stays, and no `uuid` that other data references was removed. Token values and legacy
output are unchanged. `packages/design-data/scripts/dedupe-relationship-records.mjs` re-runs the
cleanup.
