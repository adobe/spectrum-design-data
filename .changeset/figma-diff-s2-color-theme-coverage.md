---
"@adobe/spectrum-design-data": minor
---

`figma diff`/`figma pair` now resolve most of the `S2.Color-theme` collection
instead of reporting it almost entirely `figma-only` (closes
spectrum-design-data-11k.10.2).

- **sdk/core/src/figma/import.rs**: `invert_name` normalizes nested Figma
  names (`Palette/blue/100`) to dash-form legacy keys instead of only
  stripping the first slash, recovering ~370 Palette variables.
- **sdk/core/src/figma/import.rs**: `collapse_modes` now follows
  `VARIABLE_ALIAS` chains via a new `resolve_figma_value` resolver instead of
  giving up, turning hundreds of `skipped-uncovered` variables into real
  `match`/`value-mismatch` results.
- **sdk/core/src/figma/import.rs**: new `pair_by_value` auto-pairs
  name-unresolvable `Alias/`/`Icon/` variables to design-data tokens by
  resolved value, for human review via a `--mapping` override.
- **sdk/cli/src/main.rs**: new `figma pair` subcommand exposes
  `pair_by_value` (mirrors `figma diff`'s flags).
