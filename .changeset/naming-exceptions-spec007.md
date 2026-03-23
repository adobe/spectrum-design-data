---
"@adobe/spectrum-tokens": patch
---

Add naming-exceptions.json and SPEC-007 (name-roundtrip) validation
rule. Tracks 194 legacy token names that cannot be deterministically
generated from a structured name object (167 state-position, 27
compound-state). This infrastructure supports the migration path from
legacy flat kebab-case names to structured name objects.
