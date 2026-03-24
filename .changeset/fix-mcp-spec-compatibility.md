---
"@adobe/spectrum-design-data-mcp": patch
"@adobe/s2-docs-mcp": patch
---

Fix MCP spec compliance for strict clients like Kiro and Claude

- Remove invalid `required: true` from individual property definitions in tool `inputSchema` objects (JSON Schema requires `required` as a string array on the parent object, not a boolean on properties)
- Upgrade `@modelcontextprotocol/sdk` from `^0.5.0` to `^1.27.1`
- Return tool execution errors as results with `isError: true` instead of throwing (per MCP spec)
- Read server version dynamically from `package.json` instead of hardcoding
