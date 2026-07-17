---
name: design-data-agent
description: >
  Validate, query, resolve, diff, and author spec-conformant design tokens and components using the
  design-data MCP tools against a local dataset. Use when the user asks about design tokens, a design
  system, token lookup, spec-conformance, drift detection, or token authoring on custom data.
metadata:
  author: adobe
  version: "1.8.4"
when_to_use: >
  Trigger on: design system, design tokens, spec-conformant, drift, validate tokens, token
  authoring, custom dataset, DESIGN_DATA_PATH, design-data validate, design-data diff,
  design-data write, product-context.json.
allowed-tools: mcp__design-data-agent__primer, mcp__design-data-agent__query_tokens, mcp__design-data-agent__resolve_token, mcp__design-data-agent__describe_component, mcp__design-data-agent__validate_usage, mcp__design-data-agent__diff_datasets, mcp__design-data-agent__write, mcp__design-data-agent__start_authoring_session, mcp__design-data-agent__authoring_session_step_intent, mcp__design-data-agent__authoring_session_step_classification, mcp__design-data-agent__authoring_session_step_values, mcp__design-data-agent__authoring_session_commit, mcp__design-data-agent__authoring_session_cancel, mcp__design-data-agent__authoring_session_get, mcp__design-data-agent__authoring_session_list
---

# design-data agent skill

`@adobe/design-data-agent-mcp` provides in-process wasm tools for validating, querying,
resolving, diffing, and authoring spec-conformant tokens and components from any dataset
on the local filesystem.

Set two path variables once and reference them throughout:

```bash
export DESIGN_DATA_PATH=./packages/design-data/tokens
export DESIGN_DATA_SPEC_PATH=./packages/design-data
```

For Spectrum tokens with zero setup (embedded snapshot), use the `design-data` skill instead — this skill targets custom or repo-local datasets.

## Bootstrap

Add `@adobe/design-data-agent-mcp` to your `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "design-data-agent": {
      "command": "npx",
      "args": ["-y", "@adobe/design-data-agent-mcp"],
      "env": {
        "DESIGN_DATA_PATH": "./packages/tokens/src",
        "DESIGN_DATA_COMPONENTS": "./packages/design-data/components",
        "DESIGN_DATA_FIELDS": "./packages/design-data/fields"
      }
    }
  }
}
```

Adjust paths to match your dataset layout.

***

## Session start — call `primer` first

Call `primer` at the start of every session that touches design data. It returns the active
dimensions, component list, taxonomy fields, and token count — structural context that scopes
all subsequent lookups. No inputs required.

***

## Token lookup

### Resolve a token to its literal value — `resolve_token`

Required: `property` (string) — e.g. `"accent-background-color-default"`
Optional: `colorScheme` (`"light"` or `"dark"`), `scale` (`"desktop"` or `"mobile"`),
`contrast` (`"regular"` or `"high"`)

### Query tokens by filter expression — `query_tokens`

Required: `filter` (string)

Valid filter keys: `property`, `component`, `variant`, `state`, `colorScheme`, `scale`,
`contrast`, `uuid`, `$schema`.

Filter syntax examples:

```
property=background-color
property=*background*
component=button
component=button,state=hover
property=background-color|property=border-color
$schema=https://spectrum.adobe.com/page/design-token/
```

> **Exit codes:** `0` = matches found; empty array = no matches (not an error).

***

## Component info — `describe_component`

Required: `id` (string) — kebab-case component ID, e.g. `button`, `action-button`

Returns the component contract: `name`, `displayName`, `options`, `anatomy`, `states`,
and `tokenBindings`.

***

## Validation — `validate_usage`

Optional inputs:

* `path` — dataset path (defaults to `DESIGN_DATA_PATH`)
* `strict` (boolean) — treat warnings as errors
* `schema_path` — override schemas directory (defaults to `@adobe/spectrum-tokens` schemas)

Runs Layer-1 JSON-Schema structural validation and Layer-2 relational rules.
Returns `{ valid, errors, warnings }`.

> **Note:** `--exceptions-path` (SPEC-007 naming allowlist) is not supported in the
> in-process path. Use the `design-data` CLI directly if you need exceptions support.

***

## Dataset diff — `diff_datasets`

Required: `oldPath`, `newPath`
Optional: `filter` (substring to narrow results by token name)

Returns `{ renamed, deprecated, reverted, added, deleted, updated }`.

***

## Product-layer authoring — `write`

Write or update the product context document in the dataset.

Optional inputs: `output` (defaults to `$DESIGN_DATA_PATH/product-context.json`),
`rationale` (string)

***

## Token authoring session

Use the following tools in sequence to create a new token through the wizard:

1. **`start_authoring_session`** — start a session (returns `session_id`)
2. **`authoring_session_step_intent`** — provide natural-language intent; get token suggestions
3. **`authoring_session_step_classification`** — set layer, property, name fields
4. **`authoring_session_step_values`** — set mode-specific value rows
5. **`authoring_session_commit`** — validate and write the token to disk
6. **`authoring_session_cancel`** — cancel without writing

Helper tools: `authoring_session_get` (inspect state), `authoring_session_list` (all active sessions).

`authoring_session_commit` accepts an optional `schema_path` to override the schemas directory
for Layer-1 JSON-Schema validation before writing.

> **Note:** `authoring_session_step_intent` (NLP suggestion ranking) still delegates to the
> `design-data` CLI because the NLP `suggest` API is not yet on the wasm surface.

***

## Gotchas

* **Scale values:** `desktop` and `mobile` — not `medium`/`large`.
* **Contrast values:** `regular` and `high` — not `standard`/`high`.
* **`query_tokens` returns `[]`** when no tokens match — not an error.
* **`diff_datasets` filter** matches by token name substring (case-insensitive).

## When working in Cursor

Cursor Settings → Rules → **Add Rule** → **Remote Rule (GitHub)** → paste this URL:

```
https://github.com/adobe/spectrum-design-data/tree/main/tools/design-data-agent-mcp/skills/design-data
```
