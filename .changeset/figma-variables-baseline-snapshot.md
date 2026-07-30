---
"@adobe/spectrum-design-data": patch
---

Add a checked-in baseline snapshot of Figma variables for the "S2 – Web" file, the
ground truth for the upcoming name-mapping audit and offline `figma diff` work
(closes spectrum-design-data-11k.3).

- **sdk/core/tests/fixtures/figma/s2-web-variables.baseline.json**: key-sorted
  `VariablesMeta` captured via `design-data figma read --format json`.
- **sdk/core/tests/fixtures/figma/README.md**: collection/mode/variable-count summary
  and capture provenance.
- **sdk/core/src/figma/mapping.rs**: smoke test deserializing the fixture back into
  `VariablesMeta`.
