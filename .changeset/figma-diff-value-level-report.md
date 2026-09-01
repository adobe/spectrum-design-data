---
"@adobe/spectrum-design-data": minor
---

New `figma diff` CLI command reports a value-level, read-only comparison
between the manifest-resolved dataset and a Figma file's actual variable
values (closes spectrum-design-data-11k.6).

- **sdk/core/src/figma/import.rs**: add `diff_values`, classifying every
  Figma variable and design-data token as match / value-mismatch /
  figma-only / design-data-only / renamed / skipped-uncovered, reusing
  the value-comparison codec `build_import_overrides` uses.
- **sdk/cli/src/main.rs**: `figma diff --file-key --token [--snapshot]
  [--mapping] [--manifest] --format pretty|json`.
- **sdk/core/src/figma/{mapping,import}.rs**: normalizes opacity,
  font-weight/style naming, `dp` units, and per-scale mode alignment
  (only when the aligned scale actually matches) so `figma diff` reports
  only genuine drift; a `--mapping`-renamed design-data-only entry now
  reports its real legacy key; `renamed` prints separately from the
  counts it can overlap with.
