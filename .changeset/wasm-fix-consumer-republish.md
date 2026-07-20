---
"@adobe/design-data-wasm": patch
"@adobe/design-data-agent-mcp": patch
"@adobe/design-data": patch
---

Fixes a packaging bug where the `@adobe/design-data-wasm` npm tarball omitted
the nested `pkg/node/package.json` and `pkg/web/package.json` files. Without
them, Node's ESM/CJS module-type resolution incorrectly inherited
`"type": "module"` from the wasm package root, causing every real consumer's
`import("@adobe/design-data-wasm")` to crash with `ENOENT: no such file or
directory, open './design_data_wasm_bg.wasm'`. The previously published
`0.4.0` is permanently broken and unusable — this releases a fixed version and
republishes the two dependents against it.

- **@adobe/design-data-wasm**: fix the `files` allowlist to include the
  per-target `package.json` manifests.
- **@adobe/design-data-agent-mcp**: bump `@adobe/design-data-wasm` dependency
  to the fixed version.
- **@adobe/design-data**: bump `@adobe/design-data-wasm` dependency to the
  fixed version.
