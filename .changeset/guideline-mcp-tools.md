---
"@adobe/design-data-mcp": minor
---

Add `design-data-guideline` and `design-data-guideline-list` MCP tools.

- **design-data-guideline-list**: lists available guideline pages from `manifest.json`;
  supports optional `category` filter (designing, fundamentals, developing, support).
- **design-data-guideline**: fetches a full guideline document by kebab-case ID.
- **design-data-primer**: now includes a `guidelines` summary (count + categories).
- **loadDataFile**: extracted shared helper used by both component and guideline loaders.
