---
"@adobe/design-data-agent-mcp": minor
---

Resolve design data paths independently of the working directory so MCP tools
work when launched from a monorepo subdirectory (closes #1109).

- **package.json**: depend on `@adobe/spectrum-design-data` (`workspace:*`) so the
  data package is linked into the server.
- **src/config.js**: when no env override is set, resolve `tokens`/`components`/
  `fields` from the `@adobe/spectrum-design-data` package via Node module
  resolution (CWD-independent). Explicit `DESIGN_DATA_*` env overrides still win;
  relative values are anchored to the new `DESIGN_DATA_ROOT` (or the server
  package root when unset).
- **src/cli.js**: spawn the `design-data` CLI with `cwd` set to the resolved root.
- **moon.yml / .moon/workspace.yml**: register the project and add
  `dependsOn: ["design-data"]` so moon orders tasks and syncs the dependency.
- **README.md**: document the resolution precedence and `DESIGN_DATA_ROOT`.
