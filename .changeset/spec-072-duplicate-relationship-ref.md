---
"@adobe/design-data-spec": patch
"@adobe/design-data-wasm": patch
---

Add SPEC-072, a warning for a relationship that duplicates another record's `$ref`.

Two relationship records with the same scope, context and `$ref` leave the token's other scale
unreachable when the token has a scale counterpart. Validation now reports the second record and
names the counterpart. A repeated record on a token with no scale counterpart is not reported.
The current data has no such duplicates after the repoint in this PR.
