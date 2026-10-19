---
"@adobe/design-data-agent-mcp": minor
"@adobe/design-data-tui": minor
---

Make component reads follow the selected platform cascade (closes h890.30).

<!-- Copyright 2026 Adobe. All rights reserved. -->

- **design-data component**: with a platform selected, returns the merged
  component (extension components, implementation rows, replacements).
  Unchanged with no platform.
- **design-data catalog export --out DIR**: new command writing the
  platform-merged `components/` and `guidelines/` catalogs.
- **sdk/core manifest::load_merged_catalogs**: loads both through
  `apply_configured`.
- **design-data-agent-mcp**: reads catalogs from `catalog export` instead of
  copying extension files in JS. Needs a `design-data` with `catalog export`.
