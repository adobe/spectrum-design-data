---
"@adobe/spectrum-design-data": minor
---

`figma diff` now resolves Typography grouping variables against their
Component/Token Relationship (CTR) targets instead of reporting them
`figma-only` (closes spectrum-design-data-11k.10.7).

- **sdk/core/src/figma/import.rs**: `invert_name` normalizes the Typography
  grouping prefixes (`Heading/`, `Body/`, `Title/`, `Detail/`, `Code/`) to
  their CTR `legacyKey`, recovering 129 of the remaining 130 `figma-only`
  Typography variables.
- **sdk/core/src/graph.rs**: new `TokenGraph::resolve_relationship_ref`
  follows a CTR's `$ref` to its target token, as a fallback when
  `resolve_alias_key` finds no direct token match.
- **sdk/cli/src/main.rs**: `figma diff`'s graph now loads
  `packages/design-data/relationships` so CTRs are available to resolve
  against, also recovering non-Typography CTR-backed variables previously
  reported `figma-only`.
