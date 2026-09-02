---
"@adobe/spectrum-design-data": patch
---

`figma diff` no longer reports garbage `path:index` names for cascade-format
tokens, which was masking the real design-data-only coverage gap (closes
spectrum-design-data-11k.9).

- **sdk/cli/src/main.rs**: `run_figma_diff` resolves each token's real legacy
  key via `naming::extract_legacy_key` instead of using the raw graph key,
  which is a synthetic `path:index` string for cascade-format tokens.
- **sdk/core/src/figma/import.rs**: a name that still falls back to its
  synthetic key is now classified `skipped-uncovered` with reason
  `legacy-key-unresolved`, instead of leaking into `design-data-only`.
