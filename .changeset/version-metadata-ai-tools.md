---
"@adobe/design-data-skill": minor
"@adobe/design-data-agent-mcp": minor
"@adobe/s2-docs-mcp": minor
---

Add version metadata to agent skills; surface dataset provenance in MCP primer output.

- **design-data/SKILL.md**: add `metadata.version` and `metadata.designDataVersion`
  to frontmatter (agentskills.io spec `metadata` block).
- **design-data-agent/SKILL.md**: add `metadata.version` to frontmatter.
- **s2-docs/SKILL.md**: add `metadata.version` to frontmatter.
- **design-data-mcp primer**: return `provenance` object (includes `designDataVersion`).
- **design-data-agent-mcp primer**: return `provenance` for dataset version metrics.
- **skill-version.test.js** (all three packages): AVA tests assert SKILL.md
  `metadata.version` stays in sync with `package.json` on every version bump.
