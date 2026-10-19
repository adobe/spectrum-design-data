---
title: "Configuring design-data for your platform"
date: 2026-10-19T12:00:00Z # noon UTC avoids local-timezone date rollback in the `date` liquid filter
author: Spectrum Design Data
category: Concepts
description: >-
  How implementation teams install the design-data CLI, choose between the CLI,
  MCP server, and WASM package, and select a platform manifest through
  `.design-data.toml`, an environment variable, or a flag.
---

Every design-data tool starts from the foundation dataset: the Spectrum tokens,
components, and guidelines that every platform shares. A platform manifest is an
opt-in layer on top. It pins a foundation version, filters or overrides tokens,
and adds platform-owned extensions such as which package implements each
component. If you select nothing, you get the foundation.

This guide covers getting the tools, writing the configuration, and checking that
your platform is the one being read.

## Pick a runtime

| Runtime                                     | Install                                                                 | Platform support                                                    |
| ------------------------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------- |
| CLI and TUI (`design-data`)                 | Homebrew, macOS                                                         | Full: `--platform`, `DESIGN_DATA_PLATFORM`, `default_platform`      |
| MCP server (`@adobe/design-data-agent-mcp`) | `npx -y @adobe/design-data-agent-mcp@latest`, or the Claude Code plugin | Through `DESIGN_DATA_CONFIG`; shells out to the CLI                 |
| WASM (`@adobe/design-data-wasm`)            | `pnpm add @adobe/design-data-wasm`                                      | Foundation only; `Dataset.embedded()` carries the embedded snapshot |

The CLI and TUI are one binary. Running `design-data` with no subcommand opens the
TUI. There's no npm wrapper for either. Homebrew is the supported install for
now, and native installers for other operating systems are future work.

## Install the CLI

```sh
brew tap adobe/spectrum-design-data https://github.com/adobe/spectrum-design-data
brew install adobe/spectrum-design-data/design-data
design-data --version
```

Without any configuration, the CLI reads the dataset embedded in the binary, so
it works offline. To pin a different foundation version, add a `[source]` block
to `.design-data.toml`. See the [CLI README](https://github.com/adobe/spectrum-design-data/tree/main/sdk/cli).

The catalog commands in this guide (`catalog export`, and `component` with a
platform selected) need a CLI newer than 0.12.1.

## Describe your platform

A platform manifest is a directory shaped like this:

```text
platforms/<id>/
  manifest.json
  extensions/
    tokens/  components/  fields/  guidelines/  mode-sets/
    relationships/  platform-extensions/  implementations/
```

`manifest.json` holds the foundation version pin, identity fields, filters, and
overrides. Each `extensions/` category holds one artifact per file; you can split
a category across as many files as you like. `extensions/implementations/` is
where a platform records which package and import path implement a component.
The [manifest spec](/spec/manifest/) defines every field and
category. Validate yours with:

```sh
design-data validate-manifest --platform <id>
```

Register the manifest in a `.design-data.toml` at the root of your project:

```toml
default_platform = "react-spectrum"

[platforms]
react-spectrum = "platforms/react-spectrum/manifest.json"
web-components = "platforms/web-components/manifest.json"
```

Each entry is a local path, relative to the file, or a `github` pin to a manifest
in another repository. A repo with exactly one manifest can keep using the older
top-level `manifest = "path/to/manifest.json"` key. It still works.

List what's configured. A `*` marks the default:

```sh
design-data platform list
design-data platform show react-spectrum
```

## Choose a platform

The CLI picks the first match from this list:

1. `--manifest <path>`, on commands that accept it
2. `--platform <id>`
3. `DESIGN_DATA_PLATFORM`
4. `default_platform` in `.design-data.toml`
5. The legacy top-level `manifest` key
6. No platform: foundation data only

An unknown id is an error that lists the configured ids.

Put `--platform` after the subcommand:

```sh
design-data validate-manifest --platform ios   # works
design-data --platform ios validate-manifest   # fails
```

Before the subcommand, the CLI reads `validate-manifest` as the TUI's dataset
path and stops with `path does not exist`.

## Read platform data

With a platform selected, `component` returns the merged component: extension
components, implementation rows, and replacements.

```sh
design-data component button --platform react-spectrum
```

To write the merged catalogs to disk, use `catalog export`:

```sh
design-data catalog export --out ./catalog --platform react-spectrum
```

It writes `components/`, `guidelines/`, and `guidelines/manifest.json` under
`--out`, creates the directory if needed, and removes stale `.json` files from
`components/` and `guidelines/` first. Without a platform it exports the
foundation catalogs. Relationships aren't part of the export.

## Use a platform from the MCP server

The MCP server reads platform data by running the CLI at startup (for the platform
lookup, the token query, and the catalog export). Point it at
your config and name the platform:

```json
{
  "mcpServers": {
    "design-data-agent": {
      "command": "npx",
      "args": ["-y", "@adobe/design-data-agent-mcp@latest"],
      "env": {
        "DESIGN_DATA_CONFIG": "/abs/path/to/your/repo",
        "DESIGN_DATA_PLATFORM": "react-spectrum"
      }
    }
  }
}
```

`DESIGN_DATA_CONFIG` takes a `.design-data.toml` or the directory that holds it.
If you omit `DESIGN_DATA_PLATFORM`, the server asks the CLI which platform
`default_platform` selects. The `design-data` binary must be on `PATH`, or set
`DESIGN_DATA_BIN`, and it needs `catalog export`. If resolution fails, the server
logs a warning and keeps serving its local dataset, which is the installed
`@adobe/spectrum-design-data` package, `DESIGN_DATA_PATH`, or the embedded
snapshot. None of those include your platform, so check the server's stderr
when a platform seems to be missing.

## Where to go next

- The [manifest spec](/spec/manifest/) for every field and extension category.
- [`platforms/`](https://github.com/adobe/spectrum-design-data/tree/main/platforms) for the incubating React Spectrum, Web Components, and iOS manifests.
- The ejection steps in `platforms/README.md`, when your team is ready to own its manifest in its own repo.
