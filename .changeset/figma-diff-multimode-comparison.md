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
  `SkippedUncovered`. Three alias hops now stay mode-aware instead of
  silently falling back to a first/Light candidate: `resolve_figma_value`'s
  `VARIABLE_ALIAS` follow, a set member's own `$ref` chain
  (`resolve_leaf_in_context`), and CTR siblings sharing one `legacyKey`
  distinguished by `scope.options` (`resolve_relationship_ref_in_context`).
- **sdk/cli/src/main.rs**: `figma diff` summary line reports
  `multi-mode-mismatch` count.
- **sdk/README.md**: documents the new `multi-mode-mismatch` class.
