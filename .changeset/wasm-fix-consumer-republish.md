---
"@adobe/design-data-agent-mcp": patch
"@adobe/design-data": patch
---

Republished against `@adobe/design-data-wasm@0.4.1`, which fixes a packaging bug
where the npm tarball omitted the nested `pkg/node/package.json` and
`pkg/web/package.json` files. Without them, Node's ESM/CJS module-type
resolution incorrectly inherited `"type": "module"` from the wasm package root,
causing every real consumer's `import("@adobe/design-data-wasm")` to crash with
`ENOENT: no such file or directory, open './design_data_wasm_bg.wasm'`. The
previously published `0.4.0` is permanently broken and unusable.

- **@adobe/design-data-agent-mcp**: bump `@adobe/design-data-wasm` dependency to
  the fixed `0.4.1`.
- **@adobe/design-data**: bump `@adobe/design-data-wasm` dependency to the fixed
  `0.4.1`.
