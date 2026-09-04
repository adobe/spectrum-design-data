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
  token is rejected for the real flat sibling; the multi-mode routing guard
  also recognizes CTR-only records' camelCase `setUuid`.
- **sdk/core/src/graph.rs**: CTR siblings sharing one `legacyKey` resolve via
  the matching `scope.options` sibling, now per-context instead of a single
  shared default, with ties broken on smallest uuid; `from_records` builds
  `legacy_name_index` deterministically instead of first-wins.
- **sdk/cli/src/main.rs**: `figma diff` summary reports `multi-mode-mismatch`.
- **sdk/README.md**: documents the new `multi-mode-mismatch` class.
