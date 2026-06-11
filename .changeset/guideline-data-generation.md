---
"@adobe/spectrum-design-data": minor
---

Add `guidelines/` — structured guideline documents for non-component S2 pages.

- **guidelines/*.json**: generated from `docs/s2-docs/{designing,fundamentals,developing,support}/`;
  each file validates against `guideline.schema.json` with `documentBlocks` body.
- **guidelines/manifest.json**: catalog for MCP discovery (`slug`, `title`, `category`,
  `status`, `sourceUrl`, `file` per entry).
- **package.json**: adds `"./guidelines/*"` export subpath and `"guidelines/"` to `files`.
