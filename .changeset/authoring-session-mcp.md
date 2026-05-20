---
"@adobe/design-data-agent-mcp": minor
---

Add MCP authoring-session tools — wizard state machine for agents (RFC #973 Q4).

- **sdk/core/src/authoring/draft.rs** (new): serializable DTOs shared between
  TUI wizard and MCP sessions.
- **sdk/core/src/authoring/session.rs** (new): on-disk session state machine
  (`start`, `step_intent`, `step_classification`, `step_values`,
  `commit`, `cancel`, `get`, `list`).
- **sdk/tui/src/wizard.rs**: import `WizardScreen`, `WizardPath`, `ValueKind`
  from core; remove local definitions.
- **sdk/cli/src/authoring.rs** (new): `authoring-session` CLI subcommand with
  JSON output.
- **tools/design-data-agent-mcp/src/tools/authoring.js** (new): 8 MCP tools
  wrapping the CLI subcommand.
