---
"@adobe/spectrum-design-data": minor
---

`figma diff` now compares genuinely multi-mode variables (e.g. `.Color
theme`'s Light/Dark/Wireframe and `.Platform scale`'s Desktop/Mobile)
mode-by-mode instead of discarding them as `skipped-uncovered` the moment
two modes disagree, recovering 469 previously uncovered `.Color theme`
variables.

- **sdk/core/src/figma/import.rs, graph.rs**: new `DiffClass::MultiModeMismatch`
  and `DiffCounts.multi_mode_mismatch`. Set-backed (`set_uuid`) variables are
  compared mode-by-mode instead of collapsed; an unmatched Figma mode is
  `SkippedUncovered`, not compared to an unrelated mode. Both alias hops now
  stay mode-aware: `resolve_figma_value` follows a `VARIABLE_ALIAS` through
  its same-named mode, and a set member's own `$ref` chain resolves via the
  new `TokenRecord::resolve_leaf_in_context` — fixing a first-child/Light
  fallback that mis-resolved most `.Color theme` mismatches.
- **sdk/cli/src/main.rs**: `figma diff` summary line reports
  `multi-mode-mismatch` count.
- **sdk/README.md**: documents the new `multi-mode-mismatch` class.
