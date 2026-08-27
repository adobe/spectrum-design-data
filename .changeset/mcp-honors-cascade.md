---
"@adobe/design-data-agent-mcp": minor
---

MCP read tools now honor a `.design-data.toml` cascade, not just the embedded
snapshot (closes bead h890.14).

- **src/cascade-bootstrap.js**: new — resolves `DESIGN_DATA_CONFIG` via the CLI
  once at startup, materializes to a temp dataset.
- **src/tools/read.js**: `primer` reflects the cascade when active;
  `describe_component` stays out of scope.
- **src/config.js**, **src/index.js**, **src/cli.js**: wiring for the new
  `DESIGN_DATA_CONFIG` env var and startup bootstrap.
