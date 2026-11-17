---
"@adobe/design-data-spec": minor
---

A relationship `scope` may carry `between` (`{ from, to }`, the endpoints of a gap or padding) and
the descriptive fields `object`, `position`, `structure`, `qualifier` and `icon`, each a registry
term. New rule SPEC-101 (warning) checks each value against the vocabulary of the same-named
name-object field; `between` ends resolve like a space-between endpoint (SPEC-047). An engine
**MUST** refuse a `between` or descriptive value that is not the shape given. No data uses the
fields yet.
