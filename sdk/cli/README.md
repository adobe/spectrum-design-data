# [**@adobe/design-data**](https://github.com/adobe/design-data)

CLI tool for working with [Adobe Spectrum](https://spectrum.adobe.com) design tokens and component schemas.

## Install

**Homebrew (macOS):**

```sh
brew tap adobe/spectrum-design-data https://github.com/adobe/spectrum-design-data
brew install adobe/spectrum-design-data/design-data
```

**Cargo (any platform with a Rust toolchain):**

```sh
cargo install design-data-cli
```

**Manual download (Linux/Windows, or any platform):**

Grab the binary for your platform from the latest
[`design-data-cli@*` GitHub Release](https://github.com/adobe/spectrum-design-data/releases),
`chmod +x` it (Unix), and put it on your `PATH`. Checksums are in `SHA256SUMS`.

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
