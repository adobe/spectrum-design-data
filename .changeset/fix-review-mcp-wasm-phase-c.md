---
"@adobe/design-data-mcp": minor
"@adobe/design-data-agent-mcp": minor
"@adobe/design-data-skill": minor
---

Fix review findings from Phase C MCP wasm migration.

- **design-data-mcp**: replace hardcoded `indexed` field list with `getIndexedFields()`
  wasm call (was missing `$schema`); cache `Dataset.embedded()`; extract
  `scoreTokensByKeyword` helper; update suggest description to disclose keyword scoring.
- **design-data-agent-mcp validate**: restore Layer-1 JSON-Schema validation via
  `@adobe/design-data-js/validate`; expose `schema_path` input; document exceptions limit.
- **design-data-agent-mcp diff**: fix filter to use camelCase `oldName`/`newName`;
  extract `filterDiffByName` helper.
- **design-data-agent-mcp authoring**: restore `schema_path` on `authoring_session_commit`
  and wire it to Layer-1 validation in `commitSession`.
- **design-data-skill SKILL.md**: fix `allowed-tools` to correct tool names; rewrite
  body to use MCP tool descriptions instead of CLI `npx` commands.
- **design-data-agent-mcp SKILL.md**: fix `allowed-tools` prefix to
  `mcp__design-data-agent__`; rewrite body to use MCP tool descriptions.
- **sdk/core query.rs**: expose `indexed_fields()` public accessor.
- **sdk/wasm registry.rs**: add `getIndexedFields()` wasm export.
