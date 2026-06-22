---
"@adobe/design-data-mcp": patch
---

Fix MCPB bundle startup, harden path validation, slim bundle, add regression tests.

- **scripts/generate-mcpb.mjs**: Fix `resolvePackageDir` to walk up to the true
  package root (ancestor `package.json` with matching `name`), avoiding nested
  `dist/cjs/package.json` stubs. Fixes missing zod, hono, jose, and all MCP SDK
  transitives. Workspace packages now copied using their `files` allowlist — drops
  Rust sources, devDep `node_modules`, and `pkg/web`; bundle shrinks 9.8 MB → 5.7 MB.
- **src/tools/design-data.js**: Resolve final path and assert containment within the
  intended subdirectory before reading; rejects `..` traversal and absolute-path escapes.
- **test/bundle-contents.test.js**: Assert bundle contains only what it needs — zod
  with `./v4` export, wasm + data JSON present; `ava`, nested `node_modules`, `pkg/web`,
  Rust `src/` absent.
- **test/bundle-smoke.test.js** + **test/helpers/ensure-bundle.js**: Self-generating
  offline smoke test (initialize + tools/list); never silently skips.
- **moon.yml** + **.moon/workspace.yml** + **.github/ci-targets.json**: Register as
  moon project; add `stage` task; wire `design-data-mcp:test` into CI.
