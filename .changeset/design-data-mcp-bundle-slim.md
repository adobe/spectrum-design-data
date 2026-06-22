---
"@adobe/design-data-mcp": patch
---

Vendor only runtime files in MCPB bundle; drop devDeps and dev artifacts.

- **scripts/generate-mcpb.mjs**: Workspace-source packages (`@adobe/design-data-wasm`,
  `@adobe/spectrum-design-data`) are now copied using their `files` allowlist (the
  same set npm would publish), dropping Rust sources, test fixtures, build configs,
  and nested devDep `node_modules` (ava, design-data-spec, ajv, ajv-formats).
  Registry packages keep whole-dir copy but nested `node_modules` are universally
  excluded — the dependency recursion already flattens all runtime deps to the
  staging root. `pkg/web` (the browser wasm target) is excluded via a per-package
  override since the Node stdio server only loads `pkg/node`.
  Result: packed bundle shrinks from **9.8 MB → 5.7 MB** (unpacked 60 MB → 27 MB).
