---
"@adobe/design-data-agent-mcp": minor
---

Make the MCP honor named `[platforms.<id>]` entries, not just the legacy
top-level `manifest` key (closes DNA-1741).

- **src/config.js**: adds `platformId`, read from a new `DESIGN_DATA_PLATFORM`
  env var, mirroring the CLI's own `--platform`/`DESIGN_DATA_PLATFORM`.
- **src/cascade-bootstrap.js**: passes `--platform <id>` to the CLI query
  shell-out and materializes that named entry's `extensions/` catalogs when
  `platformId` is set, instead of always resolving the legacy `manifest` key.
- **README.md**: documents `DESIGN_DATA_PLATFORM`.
