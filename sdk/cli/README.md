# [**@adobe/design-data**](https://github.com/adobe/design-data)

CLI tool for working with [Adobe Spectrum](https://spectrum.adobe.com) design tokens and component schemas.

## Install

```sh
npm install -g @adobe/design-data
# or use without installing:
npx @adobe/design-data <command>
```

Requires Node.js ≥ 20.12. No Rust toolchain needed — the CLI binary is included via platform-specific optional dependencies.

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

## Configuration

Drop a `.design-data.toml` in your project root to point at a specific dataset version:

```toml
[source]
type = "github"
repo = "adobe/spectrum-design-data"
tag = "@adobe/spectrum-tokens@14.11.0"
```

Without configuration, the embedded Spectrum snapshot is used automatically (offline, zero-setup).

## License

Apache-2.0 — see the [project repository](https://github.com/adobe/spectrum-design-data) for details.
