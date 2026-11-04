# [**@adobe/design-data**](https://github.com/adobe/design-data)

CLI tool for working with [Adobe Spectrum](https://spectrum.adobe.com) design tokens and component schemas.

## Install

**Homebrew (macOS):**

```sh
brew tap adobe/spectrum-design-data https://github.com/adobe/spectrum-design-data
brew install adobe/spectrum-design-data/design-data
```

Homebrew is the supported install for now. Native installers for other
operating systems are future work.

> The `@adobe/design-data` npm package is JS/wasm library glue, not the CLI —
> `npm install -g @adobe/design-data` does **not** install the `design-data` command.

## Usage

```sh
# Get a structural overview of the Spectrum dataset (great for AI agent sessions)
design-data primer --format json

# Query tokens by name or property
design-data query "property=color*"

# Get AI-powered token suggestions for a given intent
design-data suggest "primary background color"

# Resolve a token's value for a given mode-set context
design-data resolve color-background-layer-1 --color-scheme light

# Print a component schema
design-data component button

# Validate a design-data directory
design-data validate ./my-tokens
```

## Read-only value-resolution batches

`design-data resolve-values` reads a JSON batch from standard input. It does not
load an embedded dataset, apply a platform manifest, or write files. Reporting
adapters supply the records and declared mode contexts explicitly.

```sh
design-data resolve-values < comparison-input.json
```

The input has `records`, `modeSets`, and `queries` arrays. Each record contains `id`, `source`,
and a canonical token object in `raw`. Each query contains the record `id` and a
`context` object, such as `{"colorScheme":"dark","contrast":"regular"}`.
Optional `selectConcept: true` selects the context-appropriate sibling of the
starting record's concept; by default the starting record is exact.
Each mode-set declaration supplies `name`, `modes`, and `default`.

The JSON result has one entry per query: `id`, `selectedId`, `label`, `context`,
`value`, `chain`, and `issue`. Concept selection uses the core cascade resolver:
filter incompatible contexts, then apply declared-default specificity. UUID
references retain exact targets. Unavailable targets, cycles, duplicate UUIDs,
ambiguous siblings, and missing or incompatible contexts return a null value and a
diagnostic. They never substitute an arbitrary value. Malformed batches fail
the command with a nonzero exit status.

## Configuration

Drop a `.design-data.toml` in your project root to point at a specific dataset version:

```toml
[source]
type = "github"
repo = "adobe/spectrum-design-data"
tag = "@adobe/spectrum-tokens@14.11.0"
```

Without configuration, the embedded Spectrum snapshot is used automatically (offline, zero-setup).

To apply a platform manifest, register it under `[platforms]` and select it with
`--platform <id>` (after the subcommand), `DESIGN_DATA_PLATFORM`, or
`default_platform`. `design-data catalog export --out DIR` writes the
platform-merged component and guideline catalogs. See
[Configuring design-data for your platform](https://opensource.adobe.com/spectrum-design-data/articles/configuring-design-data-for-your-platform/).

## License

Apache-2.0 — see the [project repository](https://github.com/adobe/spectrum-design-data) for details.
