---
"@adobe/design-data-mcp": patch
"@adobe/design-data-agent-mcp": patch
---

Tell agents how to stay on the latest bundled dataset (closes the Protopack Web
stale-dataset gap surfaced in Slack).

- **tools/design-data-mcp/src/index.js**: server now sends an `instructions` string
  explaining the embedded dataset travels with the package version and how to check it.
- **tools/design-data-mcp/README.md**: pin `@latest` in the npx configs; add a "Staying
  current" note.
- **tools/design-data-agent-mcp/src/index.js**: same `instructions` addition.
- **tools/design-data-agent-mcp/README.md**: pin `@latest`; add a "Staying current" note.
- **tools/design-data-agent-mcp/skills/design-data/SKILL.md**: pin `@latest` in the
  bootstrap config; note the same.
