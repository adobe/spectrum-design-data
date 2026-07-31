---
"@adobe/spectrum-design-data": patch
---

Audit generated Figma Variable names against the real S2-Web baseline
snapshot (closes spectrum-design-data-11k.4).

- **sdk/core/src/figma/audit.rs**: new `audit_names` — diffs generator
  output against a real `VariablesMeta` snapshot per collection, reporting
  matched/figma-only/generated-only names and a legacyKey override scaffold.
- **sdk/cli/src/main.rs**: new `design-data figma audit --snapshot <FILE>
  --token-dir <DIR>` subcommand (offline, no network).
- **sdk/core/tests/fixtures/figma/name-mapping.audit.json**: committed audit
  artifact against the 11k.3 baseline.
