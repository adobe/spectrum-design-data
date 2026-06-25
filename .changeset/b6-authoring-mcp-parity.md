---
"@adobe/design-data-agent-mcp": minor
"@adobe/design-data": major
---

feat(authoring): B6 — MCP authoring parity via CLI shell-out (closes #122.6).

- **tools/design-data-agent-mcp/src/tools/authoring.js**: rewritten as CLI adapters; adds
  10 new tools (edit_token, deprecate_token, rename_token, rewire_alias, remove_token,
  add_mode, rename_mode, remove_mode, create_mode_set, remove_mode_set); all session tools
  now shell out to `design-data authoring-session` so commit writes a cascade element;
  classification is catalog-aware via the CLI's validate_classification.
- **tools/design-data-agent-mcp/src/tools/write.js**: repointed to `design-data write` CLI.
- **tools/design-data/src/write.js** (removed): legacy flat-file helpers superseded by cascade.
- **tools/design-data/src/session.js** (removed): in-process session superseded by CLI;
  exported API removed from @adobe/design-data (breaking).
