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
  instead of falling back to a first/Light candidate; `approx_eq`'s tolerance
  absorbs float32 round-trip noise; a name-inverted match onto a composite
  (array-shaped) token is rejected in favor of the real flat sibling.
- **sdk/core/src/graph.rs**: CTR siblings sharing one `legacyKey` resolve via
  the matching `scope.options` sibling; `from_records` builds
  `legacy_name_index` deterministically instead of first-wins over `redb`'s
  cache-hydration key order.
- **sdk/cli/src/main.rs**: `figma diff` summary reports `multi-mode-mismatch`.
- **sdk/README.md**: documents the new `multi-mode-mismatch` class.
