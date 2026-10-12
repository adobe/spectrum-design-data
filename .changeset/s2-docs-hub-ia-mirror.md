---
"@adobe/s2-docs-mcp": minor
---

Mirror the Spectrum Hub IA in `docs/s2-docs`; serve the MCP from design-data.

- **docs/s2-docs**: components split into `web/rsp` and `web/swc`.
- **docs/s2-docs**: guidelines sit at their Hub paths; stale index files removed.
- **tools/s2-docs-mcp**: reads `packages/design-data/components`.
- **tools/s2-docs-mcp**: categories come from component metadata; scrape tasks removed.
