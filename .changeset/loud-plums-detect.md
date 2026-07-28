---
"@adobe/design-data-spec": minor
---

Add SPEC-050 to detect fused `name.property` values independent of roundtrip status
(closes spectrum-design-data-284.1).

- **rules/rules.yaml**: new advisory rule `SPEC-050` (`property-decomposition-complete`)
  flags a `property` value that fuses a structured field (anatomy, object, position,
  size, state, colorRole, emphasis) instead of being atomic, regardless of roundtrip
  or `naming-exceptions.json` status.
- **conformance/invalid/SPEC-050/**: new fixture covering the fused-property case.
