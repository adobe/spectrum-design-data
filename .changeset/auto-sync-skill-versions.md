---
"@adobe/design-data-skill": patch
"@adobe/design-data-agent-mcp": patch
"@adobe/s2-docs-mcp": patch
---

Automate SKILL.md metadata.version sync on release so CI passes without manual edits.

- **scripts/sync-skill-version.mjs**: new shared script that rewrites `metadata.version`
  (and `metadata.designDataVersion` where present) in a SKILL.md frontmatter from the
  package's `package.json` version after `changeset version` runs.
- **tools/design-data-skill/moon.yml**, **tools/design-data-agent-mcp/moon.yml**,
  **tools/s2-docs-mcp/moon.yml**: add a `version` moon task that calls the script so
  `moon run :version` (invoked by the `pnpm run version` release script) keeps SKILL.md
  in sync automatically.
- **.github/ci-targets.json**: add the three new `version` tasks to `excludedFromCI`.
