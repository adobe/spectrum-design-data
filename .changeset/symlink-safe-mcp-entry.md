---
"@adobe/design-data-agent-mcp": patch
---

Fix the MCP server failing to start when launched via npx or a node_modules/.bin shim.

- **src/index.js**: the entry-point guard compared `process.argv[1]` to the
  module URL directly, which never matched when invoked through a symlink (npx,
  pnpm `.bin`). The server exited 0 without starting, surfacing to clients as
  `Failed to reconnect: -32000`. The check now compares resolved real paths.
