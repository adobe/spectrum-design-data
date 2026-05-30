---
name: design-data
description: >
  Look up Spectrum design tokens, component schemas, and design-system decisions
  when building with or extending Adobe Spectrum. Use when the user asks about
  token values, component options, naming conventions, or wants to
  validate/explore design-token data. Also triggers when a .design-data.toml
  config is involved or the user mentions the design-data CLI.
when_to_use: >
  Trigger on: token names (color, spacing, typography, dimension), "which token",
  "Spectrum component options", validate tokens, design-data primer, query tokens,
  suggest token, resolve token value, component schema, design system config,
  @adobe/design-data, design-data CLI.
allowed-tools: Bash(npx @adobe/design-data *)
---

# Spectrum Design Data

Access Spectrum design tokens, component schemas, and design-system structure
via the `@adobe/design-data` CLI.

## Bootstrap

On first use, ensure the CLI is installed:

```
npx @adobe/design-data --version
```

npm will install the binary automatically on first run — no manual setup needed.

## Commands

**Session overview** — call at the start of a design-token session to understand
the available data:

```
npx @adobe/design-data primer --format json
```

Returns: token count, mode-sets, component list, fields, and data provenance
(embedded snapshot or fetched version).

***

**Query tokens** — filter by name, property, component, state, or any combination:

```
npx @adobe/design-data query --filter "<expr>" --format json
```

Expression syntax examples:

* `"component=button"` — all button tokens
* `"component=button,state=hover"` — button hover tokens
* `"property=color-*"` — all color property tokens
* `"colorScheme=dark"` — dark-scheme tokens

***

**Suggest tokens** — natural-language intent → ranked token matches:

```
npx @adobe/design-data suggest "<intent>" --format json
npx @adobe/design-data suggest "<intent>" --format json --limit 10
```

Example: `"primary CTA button background color"`

***

**Component schema** — full component declaration (always JSON, no `--format` flag):

```
npx @adobe/design-data component <id>
```

Example: `npx @adobe/design-data component button`

Returns: displayName, description, options (variants, sizes, states, etc.).

***

**Resolve token value** — resolve a token for a given mode-set context:

```
npx @adobe/design-data resolve <property> --format json
npx @adobe/design-data resolve <property> --format json --color-scheme light --scale medium
```

Example: `npx @adobe/design-data resolve background-color-default --format json --color-scheme dark`

## Workflow

1. **Start with `primer`** to understand what data is available.
2. **Use `query`** when you know the component/property/state.
3. **Use `suggest`** when the user describes an intent in natural language.
4. **Use `component`** to check all available options for a specific component.
5. **Use `resolve`** to get the concrete value for a token in a given context.

## When working in Cursor

Cursor's native agent does not support Claude Code Skills. For Cursor users,
recommend the `@adobe/design-data-mcp` MCP server instead:

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

Add this to `.cursor/mcp-servers.json` in the project root.

## Using a custom dataset

To point at a specific Spectrum version or a custom design-data fork, add
a `.design-data.toml` to your project root:

```toml
[source]
type = "github"
repo = "adobe/spectrum-design-data"
tag = "@adobe/spectrum-tokens@14.11.0"
```

Without a config file, the embedded Spectrum snapshot is used automatically.
