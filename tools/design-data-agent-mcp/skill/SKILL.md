---
name: design-data
description: >
  Validate, query, resolve, and author spec-conformant design tokens and components using the
  design-data CLI. Use when the user asks about design tokens, a design system, Spectrum, token
  lookup, spec-conformance, drift detection, or token authoring.
---

# design-data CLI skill

`design-data` is the reference CLI for the Spectrum Design Data specification. It validates, queries, resolves, and authors spec-conformant tokens and components from any dataset on the local filesystem.

Set two path variables once and reference them throughout. The token dataset and the spec catalog (components, fields, dimensions) live in separate directories:

```bash
export DESIGN_DATA_PATH=./packages/tokens/src
export DESIGN_DATA_SPEC_PATH=./packages/design-data-spec
```

***

## Session start — call `primer` first

Call `primer` at the start of every session that touches design data. It returns the active dimensions, component list, taxonomy fields, and token count — structural context that scopes all subsequent lookups.

```bash
design-data primer "$DESIGN_DATA_PATH" --format json \
  --components-dir "$DESIGN_DATA_SPEC_PATH/components" \
  --fields-dir     "$DESIGN_DATA_SPEC_PATH/fields" \
  --dimensions-dir "$DESIGN_DATA_SPEC_PATH/dimensions"
```

Always pass `--components-dir`, `--fields-dir`, and `--dimensions-dir` explicitly. These directories live under `packages/design-data-spec/`, not under the token dataset. The CLI defaults probe those paths relative to CWD, so omitting the flags when running from an arbitrary directory (or with an absolute `DESIGN_DATA_PATH`) produces empty `components`, `taxonomyFields`, and `dimensions`.

The payload includes `specVersion`, `manifest`, `dimensions`, `components`, `taxonomyFields`, and `tokenCount`.

***

## Token lookup

### Resolve a token to its literal value

```bash
design-data resolve <property> "$DESIGN_DATA_PATH" --format json \
  [--color-scheme light|dark] \
  [--scale desktop|mobile] \
  [--contrast regular|high]
```

Example:

```bash
design-data resolve accent-background-color-default "$DESIGN_DATA_PATH" \
  --format json --color-scheme dark --scale desktop
```

### Query tokens by filter expression

```bash
design-data query "$DESIGN_DATA_PATH" --filter "<expr>" --format json
```

Valid filter keys: `property`, `component`, `variant`, `state`, `colorScheme`, `scale`, `contrast`, `uuid`, `$schema`. Any other key is a parse error. The dimension keys (`colorScheme`, `scale`, `contrast`) accept the same enum values as the `resolve` flags (`light`/`dark`, `desktop`/`mobile`, `regular`/`high`).

Filter syntax examples:

```
property=background-color
property=*background*
component=button
component=button,state=hover
property=background-color|property=border-color
$schema=https://spectrum.adobe.com/page/design-token/
```

> **Exit codes:** `0` = matches found; `1` = no matches (returns `[]` — not an error); `>1` = error.

***

## Component info

```bash
design-data component <id> --components-dir "$DESIGN_DATA_SPEC_PATH/components"
```

Returns the component contract: `name`, `displayName`, `options`, `anatomy`, `states`, and `tokenBindings`. Output is always JSON; there is no `--format` flag on this subcommand.

Pass `--components-dir` explicitly for the same reason as `primer` — the default probes CWD-relative paths that won't resolve in agent contexts.

Example:

```bash
design-data component button --components-dir "$DESIGN_DATA_SPEC_PATH/components"
```

***

## Validation

```bash
design-data validate "$DESIGN_DATA_PATH" --format json \
  [--schema-path <path>] \
  [--exceptions-path <path>] \
  [--strict]
```

Returns a `ValidationReport` object: `{ layer: 1|2, errors: [...], warnings: [...] }` where each diagnostic has `rule_id` (e.g. `"SPEC-002"`), `severity` (`"error"` | `"warning"`), and `message`. Layer 1 is schema validation; Layer 2 is cascade-rule validation. `--strict` treats warnings as errors.

***

## Dataset diff

```bash
design-data diff <old-path> <new-path> --format json [--filter <expr>]
```

> **Exit codes:** `0` = no changes; `1` = differences found (returns JSON diff — not an error); `>1` = error.

***

## Product-layer authoring

Write or update the product context document in the dataset:

```bash
design-data write \
  --output "$DESIGN_DATA_PATH/product-context.json" \
  --rationale "Why these overrides exist"
```

Always pass `--output` with an explicit path inside the dataset. The default resolves relative to CWD, which is rarely correct in agent contexts.

Generates a product-context scaffold at the output path (`specVersion`, `layer: "product"`, `rationale`, attribution metadata). Creates the file if absent; overwrites if it already exists. The confirmation string returned to stdout on success is a plain text message — not JSON.

***

## Gotchas

* **Scale values:** `desktop` and `mobile` — not `medium`/`large`.
* **Contrast values:** `regular` and `high` — not `standard`/`high`.
* **`query` exit 1** means no matches and still emits `[]`. Only `>1` is an error.
* **`diff` exit 1** means changes were found. The JSON diff is in stdout — still a success result.
* **`--format json`** — always pass this in agent and script contexts; the CLI pretty-prints when stdout is a TTY.
