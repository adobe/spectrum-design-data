---
"@adobe/spectrum-design-data": minor
---

`figma diff`/`figma pair` now resolve the atomic Typography leaf variables
instead of reporting them `figma-only` (closes spectrum-design-data-11k.10.3).

- **sdk/core/src/figma/import.rs**: `invert_name` normalizes atomic
  Typography-collection names (`Font size/100`, `Line height/Font size 100`,
  `Font weight/Extra bold`, etc.) to their legacy keys, recovering 47 of the
  177 `figma-only` Typography variables.
- **sdk/cli/src/main.rs**: `PAIR_NAME_PREFIXES` adds the Typography grouping
  prefixes (`Heading/`, `Body/`, `Title/`, `Detail/`, `Code/`) so `figma pair`
  covers them; most report `ambiguous` since design-data models these
  groupings as composites, not per-field tokens.
- **sdk/core/tests/fixtures/figma/s2-typography.mapping.json**: new curated
  mapping for the 5 grouping variables that pair cleanly by value.
