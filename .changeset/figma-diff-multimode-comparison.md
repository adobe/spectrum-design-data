---
"@adobe/spectrum-design-data": minor
---

`figma diff` now compares genuinely multi-mode variables (e.g. `.Color
theme`'s Light/Dark/Wireframe) mode-by-mode instead of discarding them as
`skipped-uncovered` the moment two modes disagree, recovering 469 previously
uncovered `.Color theme` variables.

- **sdk/core/src/figma/import.rs**: new `DiffClass::MultiModeMismatch { modes }`
  and `DiffCounts.multi_mode_mismatch`. A variable with >1 mode whose
  design-data record is set-backed (`set_uuid`) is compared mode-by-mode via
  `resolve_set_in_context`, matching the export side's per-mode resolution,
  rather than collapsed via `collapse_modes`. Full agreement across modes
  still reports plain `Match`. Variables without a `set_uuid` keep the
  existing single-value comparison path. `resolve_figma_value` now resolves a
  `VARIABLE_ALIAS` target through its same-named mode instead of always the
  target's default mode, so an aliased mode (e.g. `color-wheel-border-color`
  → `gray-1000`) compares correctly.
- **sdk/cli/src/main.rs**: `figma diff` summary line reports
  `multi-mode-mismatch` count.
- **sdk/README.md**: documents the new `multi-mode-mismatch` class.
