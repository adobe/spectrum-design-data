# `@adobe/design-data-agent-mcp`

MCP server and Claude Code skill for the [Spectrum Design Data](../../packages/design-data-spec/) agent surface. Shells out to the `design-data` CLI — all logic stays in the Rust SDK.

## Claude Code skill

Install by symlinking the `skill/` directory into your Claude Code skills folder:

```bash
ln -s "$(pwd)/tools/design-data-agent-mcp/skill" ~/.claude/skills/design-data
```

Then add the skill to your `~/.claude/CLAUDE.md`:

```markdown
### design-data
- **design-data** (`~/.claude/skills/design-data/SKILL.md`) — design token lookup, validation, and authoring via the design-data CLI. Trigger: `/design-data`
When the user types `/design-data`, invoke the Skill tool with `skill: "design-data"` before doing anything else.
```

## MCP server

Configure your MCP client to run:

```bash
node tools/design-data-agent-mcp/src/index.js
```

### Environment variables

| Variable                 | Default       | Description                               |
| ------------------------ | ------------- | ----------------------------------------- |
| `DESIGN_DATA_BIN`        | `design-data` | Path to the `design-data` binary          |
| `DESIGN_DATA_PATH`       | `.`           | Dataset root path                         |
| `DESIGN_DATA_COMPONENTS` | —             | Override components directory             |
| `DESIGN_DATA_FIELDS`     | —             | Override fields directory                 |
| `DESIGN_DATA_DIMENSIONS` | —             | Override dimensions directory             |
| `DESIGN_DATA_SCHEMAS`    | —             | Override schema path (for `validate`)     |
| `DESIGN_DATA_EXCEPTIONS` | —             | Override exceptions path (for `validate`) |

### Example (Claude Desktop `claude_desktop_config.json`)

```json
{
  "mcpServers": {
    "design-data": {
      "command": "node",
      "args": ["/path/to/spectrum-design-data/tools/design-data-agent-mcp/src/index.js"],
      "env": {
        "DESIGN_DATA_BIN": "/path/to/design-data",
        "DESIGN_DATA_PATH": "/path/to/your/dataset"
      }
    }
  }
}
```

## Tools exposed

| Tool                 | Description                                                     |
| -------------------- | --------------------------------------------------------------- |
| `primer`             | Load full token taxonomy, component list, and field definitions |
| `resolve_token`      | Resolve a token property to its literal value                   |
| `query_tokens`       | Filter tokens by expression                                     |
| `describe_component` | Fetch component schema and token bindings                       |
| `validate_usage`     | Validate token usage and return a diagnostic report             |
| `diff_datasets`      | Compare two datasets and return a semantic diff                 |
| `write`              | Write agent-generated product context to the dataset            |
