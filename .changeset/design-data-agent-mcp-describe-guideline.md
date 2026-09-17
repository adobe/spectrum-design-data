---
"@adobe/design-data": minor
"@adobe/design-data-mcp": minor
"@adobe/design-data-agent-mcp": minor
---

Add a guideline-read tool to design-data-agent-mcp, closing the read/write
asymmetry with describe_component (closes spectrum-design-data-9fe.7).

- **tools/design-data/src/guideline.js**: new shared `loadGuideline(dir, id)`
  helper (path-traversal guarded) used by both MCP servers.
- **tools/design-data-mcp/src/tools/design-data.js**: `design-data-guideline`
  now delegates to the shared loader instead of duplicating it.
- **tools/design-data-agent-mcp/src/tools/read.js**: new `describe_guideline`
  tool reads a guideline's documentBlocks back by slug ID.
- **tools/design-data-agent-mcp/src/config.js**: new `guidelinesDir` /
  `DESIGN_DATA_GUIDELINES` resolution, mirroring `componentsDir`.
