# [**@adobe/design-data-mcp**](https://github.com/adobe/spectrum-design-data/tree/main/tools/design-data-mcp)

MCP server for [Adobe Spectrum](https://spectrum.adobe.com) design tokens, component schemas,
and design guidelines. Runs fully in-process via an embedded Spectrum snapshot — no network
access, no CLI binary, and no configuration required.

## Install in Claude Desktop (Extension)

Download the latest `design-data.mcpb` from the
[releases page](https://github.com/adobe/spectrum-design-data/releases) and drag it into
**Claude Desktop → Settings → Extensions**.

No API keys or configuration needed. The extension installs and runs offline.

## Setup via npx (Cursor / Claude Desktop manual config)

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

### Claude Desktop (manual config)

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

| Tool                         | Description                                                                        |
| ---------------------------- | ---------------------------------------------------------------------------------- |
| `design-data-primer`         | Session-start overview: token count, mode-sets, components, guidelines, provenance |
| `design-data-query`          | Filter tokens by query expression (`component=button`, `property=color-*`)         |
| `design-data-suggest`        | Natural-language token suggestions with Jaccard similarity confidence scores       |
| `design-data-component`      | Full component schema (variants, sizes, states, props) by kebab-case ID            |
| `design-data-resolve`        | Resolve a token's concrete value for a mode context (colorScheme, scale, contrast) |
| `design-data-guideline-list` | List available Spectrum design guideline pages, optionally filtered by category    |
| `design-data-guideline`      | Full guideline document by slug ID (purpose, rules, accessibility, examples)       |

## License

Apache-2.0 — see the [project repository](https://github.com/adobe/spectrum-design-data) for details.
