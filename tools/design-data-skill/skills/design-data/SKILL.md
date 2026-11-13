---
name: design-data
description: >
  Look up Spectrum design tokens, component schemas, and design-system decisions
  when building with or extending Adobe Spectrum. Use when the user asks about
  token values, component options, naming conventions, or Spectrum design
  guidelines. Read-only lookup against an embedded Spectrum
  snapshot; it does not generate component code.
metadata:
  author: adobe
  version: "2.1.0"
  designDataVersion: "3.12.0"
when_to_use: >
  Trigger on: token names (color, spacing, typography, dimension), "which token",
  "Spectrum component options", design-data primer, query tokens, suggest token,
  resolve token value, component schema, Spectrum guideline, @adobe/design-data-mcp.
allowed-tools: mcp__plugin_spectrum-design-data_design-data__design-data-primer, mcp__plugin_spectrum-design-data_design-data__design-data-query, mcp__plugin_spectrum-design-data_design-data__design-data-suggest, mcp__plugin_spectrum-design-data_design-data__design-data-component, mcp__plugin_spectrum-design-data_design-data__design-data-component-search, mcp__plugin_spectrum-design-data_design-data__design-data-resolve, mcp__plugin_spectrum-design-data_design-data__design-data-guideline-list, mcp__plugin_spectrum-design-data_design-data__design-data-guideline, mcp__plugin_spectrum-design-data_design-data__design-data-visual-recipe, mcp__plugin_spectrum-design-data_design-data__design-data-render
---

# Spectrum Design Data

Read-only lookup of Spectrum design tokens, component schemas, and design
guidelines through the `@adobe/design-data-mcp` MCP server. The server runs
in-process against a Spectrum snapshot embedded in the package.

This skill complements React Spectrum and Spectrum Web Components guidance. It
answers from data; it does not generate components or integrate with a framework.

## Setup

Installing the `spectrum-design-data` **plugin** (Claude Code or GitHub Copilot) registers
the MCP server for you: no manual MCP configuration. Requires Node.js `>=20.12.0`.
The first run downloads the pinned package with `npx`; after that, lookups use the
embedded snapshot.

If you installed only this skill folder (for example as a Cursor rule), the tools
are not available until you add the server yourself, pinned to the version this
skill was written for:

```json
{
  "mcpServers": {
    "design-data": {
      "command": "npx",
      "args": ["-y", "@adobe/design-data-mcp@1.11.0"]
    }
  }
}
```

## Tool names

Tools are listed below by their server names. Clients prefix them: Claude Code
exposes the plugin's tools as `mcp__plugin_spectrum-design-data_design-data__<tool>`, and a
manually configured server as `mcp__design-data__<tool>`. Use whichever the client
lists.

## Tools

### `design-data-primer`

Overview of the embedded dataset: token count, mode-sets, component list, taxonomy
fields, guidelines, and provenance (`provenance.designDataVersion` is the snapshot
version). **Call this first in a session.** No required inputs.

### `design-data-query`

Filter tokens by expression. Required: `filter` (string), e.g. `component=button`,
`component=button,state=hover`, `property=*color*`, `state=hover,colorScheme=dark`.
Filterable fields: `property`, `component`, `variant`, `state`, `colorScheme`, `scale`,
`contrast`, `uuid`. `component` matches the tokens a component's relationships bind to.
Returns an array of matching tokens (empty when none match).

### `design-data-suggest`

Rank tokens against a natural-language intent. Required: `intent` (string), e.g.
`"primary CTA button background color"`. Optional: `limit` (number, default 5).

### `design-data-component`

Full component declaration (displayName, description, options such as variants,
sizes, states, booleans). Required: `id` (kebab-case, e.g. `action-button`).

### `design-data-component-search`

Find components by name, description, or docs text. Required: `query` (string).
Optional: `category` (string), `limit` (integer, default 10). Returns id,
displayName, category, and a snippet; pass the id to `design-data-component`.

### `design-data-resolve`

Resolve a token property to its value for a mode context. Required: `property`
(string, e.g. `corner-radius`). Optional: `colorScheme` (`light`/`dark`),
`scale` (`desktop`/`mobile`), `contrast` (`regular`/`high`), and narrowing by
`component`, `variant`, `state`, `colorRole`, or `excludeDeprecated`. Errors when no
token matches. Active tokens rank above deprecated ones. Ambiguity can still occur:
when `ambiguous: true`, the `token` is only the top pick; narrow further or report the
`alternatives` instead of presenting one value as definitive.

### `design-data-guideline-list` and `design-data-guideline`

`design-data-guideline-list` lists guideline pages (optional `category`:
`designing`, `fundamentals`, `developing`, `support`). `design-data-guideline`
returns one page by `id`, the `slug` from the list (e.g. `colors`).

### `design-data-visual-recipe` and `design-data-render`

`design-data-visual-recipe` returns a component's visual recipe by `id`; only
components with a recipe are available (the error lists them). `design-data-render`
draws one as SVG text. Required: `component`. Optional: `size` (default `m`),
`states` (e.g. `["hover"]`), `options` (object), `colorScheme`, `scale`, `label`,
`width` (px). SVG only; there is no PNG output.

## Workflow

1. `design-data-primer` to see what data exists.
2. `design-data-query` when you know the property, component, or state.
3. `design-data-suggest` when the user describes an intent.
4. `design-data-component-search`, then `design-data-component`, for component options.
5. `design-data-resolve` for a concrete value in a given mode.
6. `design-data-guideline-list`, then `design-data-guideline`, for design guidance.
7. `design-data-render` to draw a component as SVG; `design-data-visual-recipe` to read its recipe.

## Limits

* Read-only; nothing is written or validated.
* Answers reflect the embedded snapshot, not the live Spectrum site. Report
  `provenance.designDataVersion` when the version matters. The primer makes a
  best-effort registry check and adds `provenance.datasetStatus` when a newer data
  package exists (set `DESIGN_DATA_SKIP_VERSION_CHECK=1` to disable it).
* Guidelines are an imported copy of public Spectrum site content and may lag it.
* Custom datasets, validation, diffing, and authoring are out of scope; use the
  `design-data-agent` skill from the
  [spectrum-design-data repository](https://github.com/adobe/spectrum-design-data/tree/main/tools/design-data-agent-mcp).
