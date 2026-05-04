---
"@adobe/s2-docs-mcp": patch
---

Conform `.claude-plugin/marketplace.json` to the Claude Code plugin marketplace schema so `/plugin marketplace add adobe/spectrum-design-data` succeeds. Adds the required top-level `name` and `owner` fields, and replaces the non-schema `path` field on the plugin entry with `source: "./tools/s2-docs-mcp"`. Updates the install instructions in the docs site to the canonical `s2-docs@spectrum-design-data` form.
