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
      "args": ["-y", "@adobe/design-data-mcp@latest"]
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
      "args": ["-y", "@adobe/design-data-mcp@latest"]
    }
  }
}
```

## Staying current

The embedded Spectrum snapshot is baked into the wasm at build time and travels with the
package version — there's no separate data update to run. Pin `@latest` (as above) so `npx`
fetches the newest published version rather than reusing whatever it last cached; `-y` alone
only skips the install confirmation, it doesn't force a re-fetch. Call `design-data-primer` and
check `provenance.designDataVersion` to see which dataset version is embedded.
`design-data-primer` also does a best-effort check against the latest published
`@adobe/spectrum-design-data` version — if the embedded dataset is behind, it adds a
`provenance.datasetStatus` field and logs a one-line warning to stderr. This is silent on
any network failure (offline/air-gapped use is unaffected); set
`DESIGN_DATA_SKIP_VERSION_CHECK=1` to disable the check entirely.

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
