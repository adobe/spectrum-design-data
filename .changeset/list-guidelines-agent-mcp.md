---
"@adobe/design-data": minor
"@adobe/design-data-agent-mcp": minor
"@adobe/design-data-mcp": patch
---

Add guideline discovery to the agent MCP server.

- **tools/design-data-agent-mcp**: add the `list_guidelines` read tool and shared catalog loading.
- **tools/design-data**: expose manifest-backed guideline catalog loading.
- **tools/design-data-mcp**: reuse the shared guideline catalog loader.
