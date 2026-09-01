---
"@adobe/spectrum-design-data": minor
---

New `figma diff` CLI command reports a value-level, read-only comparison
between the manifest-resolved dataset and a Figma file's actual variable
values (closes spectrum-design-data-11k.6).

- **sdk/core/src/figma/import.rs**: add `diff_values`, `DiffReport`,
  `DiffEntry`, `DiffClass`, and `DiffCounts`. Classifies every Figma
  variable and design-data token as match / value-mismatch / figma-only /
  design-data-only / renamed / skipped-uncovered, reusing the same
  value-comparison codec as `build_import_overrides` and the same
  export name-set diff `figma::audit::audit_names` uses.
- **sdk/cli/src/main.rs**: `figma diff --file-key --token [--snapshot]
  [--mapping] [--manifest] --format pretty|json`; `--snapshot` diffs
  offline against a captured `VariablesMeta` snapshot, no API call.
- **sdk/core/src/figma/{mapping,import}.rs**: the codec now normalizes
  opacity (0-1 fraction vs Figma's 0-100), font-weight/style naming, `dp`
  units, and per-scale mode alignment, so `figma diff` reports only
  genuine value drift.
