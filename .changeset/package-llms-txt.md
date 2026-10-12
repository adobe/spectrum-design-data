---
"@adobe/design-data-spec": patch
"@adobe/spectrum-design-data": patch
"@adobe/design-data-wasm": patch
"@adobe/design-data": patch
"@adobe/design-data-agent-mcp": patch
"@adobe/design-data-mcp": patch
"@adobe/design-data-skill": patch
"@adobe/token-diff-generator": patch
"@adobe/s2-docs-mcp": patch
"@adobe/spectrum-diff-core": patch
---

Ship a generated `llms.txt` with each consumer-facing package (closes #1533).

- **package.json (10 packages)**: add `llms.txt` to the npm `files` list.
- **llms.txt**: generated from each README and `.ai/inventory.json` by `pnpm ai:sync`.
