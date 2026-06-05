# `@adobe/design-data-agent-mcp`

MCP server and Claude Code skill for the [Spectrum Design Data](../../packages/design-data/) agent surface. Shells out to the `design-data` CLI — all logic stays in the Rust SDK.

## Install

### Claude Code (skill + optional MCP)

Add the Spectrum Design Data marketplace, then install the spec-generic skill:

```
/plugin marketplace add adobe/spectrum-design-data
/plugin install design-data-agent@spectrum-design-data
```

For Spectrum tokens with zero setup (embedded snapshot), install `design-data@spectrum-design-data` instead — see [`tools/design-data-skill/`](../design-data-skill/).

### Cursor (skill)

Cursor Settings → Rules → **Add Rule** → **Remote Rule (GitHub)** → paste:

```
https://github.com/adobe/spectrum-design-data/tree/main/tools/design-data-agent-mcp/skills/design-data
```

### npm (MCP server)

```sh
npx @adobe/design-data-agent-mcp
```

Requires the `@adobe/design-data` CLI on `PATH` (or set `DESIGN_DATA_BIN`).

## MCP server

Configure your MCP client to run:

```sh
npx -y @adobe/design-data-agent-mcp
```

Or from a repo clone:

```bash
node tools/design-data-agent-mcp/src/index.js
```

### Environment variables

| Variable                 | Default       | Description                                       |
| ------------------------ | ------------- | ------------------------------------------------- |
| `DESIGN_DATA_BIN`        | `design-data` | Path to the `design-data` binary                  |
| `DESIGN_DATA_ROOT`       | —             | Absolute root that relative paths are anchored to |
| `DESIGN_DATA_PATH`       | `.`           | Dataset root path                                 |
| `DESIGN_DATA_COMPONENTS` | —             | Override components directory                     |
| `DESIGN_DATA_FIELDS`     | —             | Override fields directory                         |
| `DESIGN_DATA_SCHEMAS`    | —             | Override schema path (for `validate`)             |
| `DESIGN_DATA_EXCEPTIONS` | —             | Override exceptions path (for `validate`)         |

> **Relative paths and the working directory.** The MCP client launches this
> server with the working directory inherited from wherever the editor was
> opened — which may be a subdirectory of your repo (e.g. `sdk/`), not the repo
> root. Relative `DESIGN_DATA_*` paths are therefore anchored to a known root
> rather than the process CWD:
>
> 1. If `DESIGN_DATA_ROOT` is set (recommended), relative paths resolve against
>    it. Set it to the absolute path of your repo root. This is the reliable
>    option when the server is launched via `npx`.
> 2. Otherwise, relative paths resolve against the server package's own location
>    in the monorepo (only correct when running the server from inside the repo
>    checkout).
>
> Absolute `DESIGN_DATA_*` paths are always used as-is.

### Example (Cursor `.cursor/mcp.json`)

```json
{
  "mcpServers": {
    "design-data-agent": {
      "command": "npx",
      "args": ["-y", "@adobe/design-data-agent-mcp"],
      "env": {
        "DESIGN_DATA_ROOT": "/abs/path/to/your/repo",
        "DESIGN_DATA_PATH": "packages/design-data/tokens",
        "DESIGN_DATA_COMPONENTS": "packages/design-data/components",
        "DESIGN_DATA_FIELDS": "packages/design-data/fields"
      }
    }
  }
}
```

### Example (Claude Desktop `claude_desktop_config.json`)

```json
{
  "mcpServers": {
    "design-data-agent": {
      "command": "npx",
      "args": ["-y", "@adobe/design-data-agent-mcp"],
      "env": {
        "DESIGN_DATA_BIN": "design-data",
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

## Skill

The Claude Code skill lives at [`skills/design-data/SKILL.md`](skills/design-data/SKILL.md). It shells out to `npx @adobe/design-data` for validate, query, resolve, diff, and write operations against local datasets.

## License

Apache-2.0
