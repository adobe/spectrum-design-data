---
"@adobe/design-data-spec": minor
"@adobe/design-data-wasm": minor
"@adobe/design-data-mcp": minor
"@adobe/design-data-agent-mcp": patch
"@adobe/design-data-skill": patch
---

The token tier is now visible to people and tools.

- **Query:** `tier=<primitive|semantic|component>` is a filter key; spec `query.md` lists it.
- **Results:** WASM `TokenResult` has `tier` and `tierSource`; the MCP query tool shows `tier`; CLI
  `query` and `resolve` print it.
- **Primer:** fields list `allowedTokenTiers` and `impliesTokenTier`; `tokenTiers` explains the
  derivation. The MCP primer returns `tokenTiers` and `fieldTiers`.
- **Docs:** token-format, taxonomy, authoring-workflow and agent-surface chapters and the
  design-data skill describe tiers.
