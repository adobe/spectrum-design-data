---
"@adobe/s2-docs-mcp": patch
---

Conform `.claude-plugin/marketplace.json` to the Claude Code plugin marketplace schema so
`/plugin marketplace add adobe/spectrum-design-data` succeeds. Adds required top-level `name`
and `owner` fields, replaces the non-schema `path` field on the plugin entry with
`source: "./tools/s2-docs-mcp"`, and updates the docs install snippet to the canonical
`s2-docs@spectrum-design-data` form.
