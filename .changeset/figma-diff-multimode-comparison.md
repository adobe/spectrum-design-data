---
"@adobe/spectrum-design-data": minor
---

`figma diff` now compares genuinely multi-mode variables (e.g. `.Color
theme`'s Light/Dark/Wireframe and `.Platform scale`'s Desktop/Mobile)
mode-by-mode instead of discarding them as `skipped-uncovered` the moment
two modes disagree, recovering 469 previously uncovered `.Color theme`
variables.

- **sdk/core/src/figma/import.rs**: new `DiffClass::MultiModeMismatch` and
  `DiffCounts.multi_mode_mismatch`. Alias/`$ref` chains stay mode-aware
  instead of silently falling back to a first/Light candidate.
- **sdk/core/src/graph.rs**: CTR siblings sharing one `legacyKey` resolve
  through the matching `scope.options` sibling instead of an arbitrary
  first one, and an uncovered mode is reported as such rather than
  compared against a mismatched sibling's value.
- **sdk/cli/src/main.rs**: `figma diff` summary line reports
  `multi-mode-mismatch` count.
- **sdk/README.md**: documents the new `multi-mode-mismatch` class.
