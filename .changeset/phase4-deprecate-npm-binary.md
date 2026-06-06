---
"@adobe/design-data": major
"@adobe/design-data-agent-mcp": patch
---

Rename `@adobe/design-data-js` → `@adobe/design-data`; remove binary npm packages.

- **@adobe/design-data** (was `@adobe/design-data-js`): package renamed; all
  import paths (`@adobe/design-data/load`, `/write`, `/session`, `/validate`) are
  unchanged. Update your `package.json` dependency name to `@adobe/design-data`.
- **sdk/npm/\***: platform binary packages (`darwin-arm64`, `darwin-x64`,
  `linux-x64`, `win32-x64`) and the CLI npm wrapper removed; use the Rust CLI
  binary directly or the wasm package instead.
- **tools/design-data-agent-mcp**: dependency name updated to `@adobe/design-data`.
