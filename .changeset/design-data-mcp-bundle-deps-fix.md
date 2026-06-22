---
"@adobe/design-data-mcp": patch
---

Fix MCPB bundle missing zod/v4 and harden file-path validation.

- **scripts/generate-mcpb.mjs**: Fix `resolvePackageDir` to always walk up to
  the package root (the ancestor `package.json` with matching `name`), avoiding
  nested `dist/cjs/package.json` stubs that exposed empty deps. The MCP SDK's
  full dependency tree (zod, express, hono, ajv, jose, cors, eventsource, …) is
  now correctly vendored into the bundle.
- **src/tools/design-data.js**: Add path-containment check in `loadDataFile` —
  resolve the final path and assert it stays within the intended subdirectory
  before reading; rejects `..` traversal and absolute-path escapes.
- **test/bundle-smoke.test.js**: New offline smoke test that spawns the staged
  bundle, sends JSON-RPC initialize + tools/list, and asserts all 7 tools return
  cleanly with no `Cannot find module` errors.
