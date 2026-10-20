---
"@adobe/design-data-agent-mcp": patch
---

Correct the CLI requirement in the MCP README (h890.35).

- **tools/design-data-agent-mcp/README.md**: the `design-data` CLI is also
  needed when `DESIGN_DATA_CONFIG` is set (the platform cascade uses
  `catalog export`), and must be 0.13.0 or newer.
