---
"@adobe/design-data-agent-mcp": minor
---

Anchor relative `DESIGN_DATA_*` paths so MCP tools work when launched from a
monorepo subdirectory (closes #1109).

- **src/config.js**: resolve relative `DESIGN_DATA_PATH`, `DESIGN_DATA_COMPONENTS`,
  `DESIGN_DATA_FIELDS`, `DESIGN_DATA_SCHEMAS`, and `DESIGN_DATA_EXCEPTIONS` against a
  known root instead of the process CWD. Adds the `DESIGN_DATA_ROOT` env var (absolute
  root, works under `npx`) and falls back to the server package root for in-repo runs.
- **src/cli.js**: spawn the `design-data` CLI with `cwd` set to the resolved root so its
  own tier/probe resolution anchors correctly.
- **README.md**: document `DESIGN_DATA_ROOT` and the recommended config.
