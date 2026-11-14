---
"@adobe/design-data-mcp": minor
"@adobe/design-data-wasm": patch
---

`design-data-render` takes an `icon` field to replace a content icon: `{ "set": "workflow",
"name": "edit" }`, or `"none"`. It now reports a diagnostic when `options.icon` is passed,
because that option is not drawn. Fixes #1794.
