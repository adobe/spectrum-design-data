# [**@adobe/design-data-mcp**](https://github.com/adobe/design-data-mcp)

MCP server for [Adobe Spectrum](https://spectrum.adobe.com) design tokens and component schemas, powered by the [`@adobe/design-data`](https://www.npmjs.com/package/@adobe/design-data) CLI.

## Setup

### Cursor

Add to `.cursor/mcp-servers.json` in your project root:

```json
{
  "mcpServers": {
    "design-data": {
      "command": "npx",
      "args": ["-y", "@adobe/design-data-mcp"]
    }
  }
}
```

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "design-data": {
      "command": "npx",
      "args": ["-y", "@adobe/design-data-mcp"]
    }
  }
}
```

## Tools

| Tool                    | Description                                                                |
| ----------------------- | -------------------------------------------------------------------------- |
| `design-data-primer`    | Session-start overview: token count, mode-sets, components, provenance     |
| `design-data-query`     | Filter tokens by query expression (`component=button`, `property=color-*`) |
| `design-data-suggest`   | Natural-language token suggestions with confidence scores                  |
| `design-data-component` | Full component schema (variants, sizes, states, props)                     |
| `design-data-resolve`   | Resolve a token's concrete value for a mode context                        |

## Custom dataset

Add a `.design-data.toml` to your project root to use a specific Spectrum version or a custom fork:

```toml
[source]
type = "github"
repo = "adobe/spectrum-design-data"
tag = "@adobe/spectrum-tokens@14.11.0"
```

Without a config file the embedded Spectrum snapshot is used automatically (offline, zero-setup).

## License

Apache-2.0 — see the [project repository](https://github.com/adobe/spectrum-design-data) for details.
