---
name: design-data
description: >
  Look up Spectrum design tokens, component schemas, and design-system decisions
  when building with or extending Adobe Spectrum. Use when the user asks about
  token values, component options, naming conventions, or wants to
  validate/explore design-token data. Also triggers when a .design-data.toml
  config is involved or the user mentions the design-data CLI.
metadata:
  author: adobe
  version: "1.3.1"
  designDataVersion: "0.12.0"
when_to_use: >
  Trigger on: token names (color, spacing, typography, dimension), "which token",
  "Spectrum component options", validate tokens, design-data primer, query tokens,
  suggest token, resolve token value, component schema, design system config,
  @adobe/design-data, design-data CLI.
allowed-tools: mcp__design-data__design-data-primer, mcp__design-data__design-data-query, mcp__design-data__design-data-suggest, mcp__design-data__design-data-component, mcp__design-data__design-data-resolve
---

# Spectrum Design Data

Access Spectrum design tokens, component schemas, and design-system structure
via the `@adobe/design-data-mcp` MCP server (in-process wasm — no CLI binary required).

## Bootstrap

Add `@adobe/design-data-mcp` to your project's `.cursor/mcp.json` (or equivalent
MCP config) to activate the tools:

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

The server uses an embedded Spectrum snapshot — no environment variables or
dataset path configuration required for read operations.

## Tools

### `design-data-primer`

Get a structural overview of the embedded Spectrum dataset: token count,
available mode-sets (color-scheme, scale, contrast), component list, taxonomy
fields, and data provenance. **Call this at the start of a design-token session.**

No required inputs.

### `design-data-query`

Filter Spectrum tokens by a query expression. Returns an array of matching token objects.

Required input: `filter` (string)

Expression syntax examples:

* `"component=button"` — all button tokens
* `"component=button,state=hover"` — button hover tokens
* `"property=color-*"` — all color property tokens
* `"colorScheme=dark"` — dark-scheme tokens

Returns an empty array when no tokens match.

### `design-data-suggest`

Suggest Spectrum tokens matching a natural-language intent using keyword-overlap
scoring. Returns matches ranked by confidence.

Required input: `intent` (string) — e.g. `"primary CTA button background color"`
Optional input: `limit` (number, default 5)

### `design-data-component`

Get the full component declaration for a Spectrum component by ID. Returns the
component's displayName, description, and all available options (variants, sizes,
states, boolean props, etc.).

Required input: `id` (string) — kebab-case component ID, e.g. `button`, `action-button`

Call `design-data-primer` first to see available component IDs.

### `design-data-resolve`

Resolve the concrete value of a Spectrum token property for a given mode-set context.
Returns the winning token with its resolved value.

Required input: `property` (string) — token property name, e.g. `background-color-default`
Optional inputs: `colorScheme` (`"light"` or `"dark"`), `scale` (`"desktop"` or `"mobile"`),
`contrast` (`"regular"` or `"high"`)

## Workflow

1. **Start with `design-data-primer`** to understand what data is available.
2. **Use `design-data-query`** when you know the component/property/state.
3. **Use `design-data-suggest`** when the user describes an intent in natural language.
4. **Use `design-data-component`** to check all available options for a specific component.
5. **Use `design-data-resolve`** to get the concrete value for a token in a given context.

## When working in Cursor

Install this skill as a **Remote Rule (GitHub)** — same pattern as the s2-docs skill:

Cursor Settings → Rules → **Add Rule** → **Remote Rule (GitHub)** → paste:

```
https://github.com/adobe/spectrum-design-data/tree/main/tools/design-data-skill/skills/design-data
```

For always-available tool access (higher context cost), add the MCP server to
`.cursor/mcp.json` as shown in the Bootstrap section above.

For custom datasets with validate/diff/write, use the `design-data-agent` skill or
`@adobe/design-data-agent-mcp` instead — see
[`tools/design-data-agent-mcp/skills/design-data/SKILL.md`](../../design-data-agent-mcp/skills/design-data/SKILL.md).

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
