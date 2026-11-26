---
"@adobe/spectrum-design-data": patch
"@adobe/design-data-wasm": minor
"@adobe/design-data-mcp": minor
"@adobe/design-data-visual": patch
"@adobe/design-data-agent-mcp": patch
"@adobe/design-data-skill": patch
---

Every place that shows or matches a token name now uses the legacy name the engine
derives (`extract_legacy_key`), pinned or not (proposal 023, slice 1).

- Wasm `TokenResult` gains `legacyName`.
- Recipe renders, scene `token` labels, the site and spec sheets show legacy names for
  unpinned tokens (about 1,383 labels change; pixels do not).
- A recipe selector's `legacyKey` matches the derived legacy name, and `rank_key` no
  longer counts the `legacyKey` pin as a name field.
- MCP `design-data-query`, `token-usage` and friends return the legacy name, resolve
  mode-dependent aliases through it, and still accept the old `field=value` text.
- Removes 164 token `legacyKey` pins that now equal the derived name. Legacy output
  (`@adobe/spectrum-tokens`) is byte-identical.
