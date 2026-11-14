---
name: design-data-agent
description: >
  Validate, query, resolve, diff, and author spec-conformant design tokens and components using the
  design-data MCP tools against a local dataset. Use when the user asks about design tokens, a design
  system, token lookup, spec-conformance, drift detection, or token authoring on custom data.
metadata:
  author: adobe
  version: "1.15.23"
when_to_use: >
  Trigger on: design system, design tokens, spec-conformant, drift, validate tokens, token
  authoring, custom dataset, DESIGN_DATA_PATH, design-data validate, design-data diff,
  design-data write, product-context.json.
allowed-tools: mcp__design-data-agent__primer, mcp__design-data-agent__query_tokens, mcp__design-data-agent__suggest_token, mcp__design-data-agent__resolve_token, mcp__design-data-agent__describe_component, mcp__design-data-agent__validate_usage, mcp__design-data-agent__diff_datasets, mcp__design-data-agent__write, mcp__design-data-agent__start_authoring_session, mcp__design-data-agent__authoring_session_step_intent, mcp__design-data-agent__authoring_session_step_classification, mcp__design-data-agent__authoring_session_step_values, mcp__design-data-agent__authoring_session_commit, mcp__design-data-agent__authoring_session_cancel, mcp__design-data-agent__authoring_session_get, mcp__design-data-agent__authoring_session_list
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
      "args": ["-y", "@adobe/design-data-agent-mcp@latest"],
      "env": {
        "DESIGN_DATA_PATH": "./packages/tokens/src",
        "DESIGN_DATA_COMPONENTS": "./packages/design-data/components",
        "DESIGN_DATA_FIELDS": "./packages/design-data/fields"
      }
    }
  }
}
```

Adjust paths to match your dataset layout. Pin `@latest` — the embedded Spectrum snapshot is
baked into the wasm at build time and travels with the package version, so there's no separate
data update to run, but plain `npx -y <pkg>` (no tag) can reuse a cached older build.

***

## Session start — call `primer` first

Call `primer` at the start of every session that touches design data. It returns the active
dimensions, component list, taxonomy fields, and token count — structural context that scopes
all subsequent lookups. No inputs required.

***

## Token lookup

### Resolve a token to its literal value — `resolve_token`

Required: `property` (string) — the bare `name.property` segment, e.g. `"background-color"`
or `"corner-radius"` (see `primer().properties` for the full list). **Not** a flattened
legacyKey like `"accent-background-color-default"` — that form never resolves.
Optional context: `colorScheme` (`"light"` or `"dark"`), `scale` (`"desktop"` or `"mobile"`),
`contrast` (`"regular"` or `"high"`). Optional narrowing: `component`, `variant`, `state`, and
`colorRole`. Set `excludeDeprecated` to omit tokens with `lifecycle.deprecatedIn`.

> **Gotcha:** when several tokens share a property, use `variant`, `state`, or `colorRole` to
> narrow the match, then check `ambiguous` and `deprecated` on the result. `component` is
> sparsely populated in the current dataset, so prefer the other fields when available.
> `resolve_token` still uses cascade ranking when multiple candidates remain; use `query_tokens`
> to inspect the full candidate set.

### Query tokens by filter expression — `query_tokens`

Required: `filter` (string)

Valid filter keys: `property`, `component`, `variant`, `state`, `colorScheme`, `scale`,
`contrast`, `uuid`, `$schema`.

Filter syntax examples:

```
property=background-color
property=*background*
property=background-color|property=border-color
$schema=https://spectrum.adobe.com/page/design-token/
```

> **Gotcha:** `component=<id>` currently always returns `[]` — tokens aren't
> component-indexed in this dataset. Use `describe_component` to see a component's known
> token bindings instead.

> **Exit codes:** `0` = matches found; empty array = no matches (not an error).

### Suggest a token from a description — `suggest_token`

Required: `intent` (string) — a natural-language description of the design need,
such as `"primary CTA button background color"`.

Optional: `limit` (number, default `5`) — the maximum number of suggestions to return.
Results are ranked by confidence using token names, name-object fields, and description
text. Use this when the user describes what they need rather than knowing a token name.

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

> **Note:** The standalone `suggest_token` tool calls the wasm `suggest` API directly.
> `authoring_session_step_intent` still delegates to the `design-data` CLI for
> session-state-aware ranking within an authoring flow.

***

## Component previews and fonts (CLI)

The `design-data` CLI draws a component's visual recipe. SVG needs no setup; PNG text uses
Adobe Clean Spectrum VF when it is installed.

```bash
design-data render button --format svg > button.svg
design-data render button --format png --output button.png   # --pixel-ratio N, default 2
design-data fonts          # exit 0: found; exit 1: the bundled fallback would be used
design-data fonts --json   # { found, fallback, using, rejected, related, searched, help }
```

* The font is found by itself (font folders and Creative Cloud's font cache), or chosen
  with `--font <file.ttf>` (repeatable) or `DESIGN_DATA_FONT=<file.ttf>`. A chosen font also
  sets the layout text widths, so SVG output changes when `--font` is passed.
* When `render --format png` falls back to the bundled Source Sans 3 it prints a warning
  with the install steps. Relay it: say the text may differ slightly from Adobe Clean
  Spectrum VF and the image is not exact. Do not tell the user to download anything when
  `design-data fonts` exits 0.
* Adobe employees get the font from the Brand Center
  (<https://inside.corp.adobe.com/content/inside/en/brand-center/font.html>, employees
  only): install the `.ttf` (not the `.otf`, which uses PostScript outlines and cannot be
  read). Creative Cloud's "Adobe Clean" is a different font and is not used. Someone
  outside Adobe cannot get it, so the fallback is the best result; say so.
* If the user says the font is installed but `design-data fonts` says it is not, ask for
  the file's path and use `--font` or `DESIGN_DATA_FONT`. Never offer or attach the font file.

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
