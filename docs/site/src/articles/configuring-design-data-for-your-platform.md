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

A data release can also say which CLI it needs. If a dataset's `dataset.json` has
`requires.cli` (for example `"0.40.0"`), or a `layoutRevision` newer than your
CLI's, the CLI stops with an error that names the version to install, instead
of reading the data wrongly. Pin an older data release, or update the CLI.
`--ignore-data-requirements` reads it anyway and warns on every run; it is only
a flag, not a config setting. Data released before this field existed isn't
checked.

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

It also checks your own recipes in `extensions/visuals/`. A binding that names a
relationship property and context, or a token, that the foundation data does not
have fails with `MANIFEST-001`. This is how a context the foundation renamed in
a newer release shows up when you bump the pin. A binding passes when it
resolves for at least one option combination (a placeholder like `{style}`
expands over the declared values, and a record pinned to `isSelected: true`
counts), so this check does not ask that every combination resolve; `design-data
render --strict` does. `design-data validate` does not run `MANIFEST-001`.

`validate-manifest` also checks that the pin agrees with itself. You state the
foundation release twice: the manifest's `foundationVersion` and the `[source]`
`tag` (or npm `version`) in `.design-data.toml`. If they name different
releases, it fails with `MANIFEST-002`. The package prefix doesn't count:
`@adobe/spectrum-design-data@3.15.1` and `3.15.1` are the same release. A `sha`
or `branch` source, or a version that isn't exact, can't be compared, so it only
warns. A `path` source, or no `[source]`, is skipped. `design-data platform show`
reports the same result.

Before you move the `foundationVersion` pin, see what the new release changes for
you:

```sh
design-data platform impact --from 3.13.0 --to 3.15.1
```

`--from` defaults to the manifest's `foundationVersion`. The command reads the
component changelogs of the `--to` release and lists the entries that touch what
your recipes bind: relationship contexts and tokens, the options they read, and
relationships your manifest overrides or removes. **BREAKS** means a binding
names something that was renamed or removed (a context rename shows both names),
and the command exits 1. **CHANGES** means a binding still resolves, to a
different token or value. It does not yet cover the manifest's token
`overrides`, or changes to a foundation recipe you did not replace. Pass
`--changelog-dir` to read a local `changelog/` instead of fetching the release.

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

It writes `components/`, `guidelines/`, `guidelines/manifest.json`, and the
foundation icon sets under `icons/` (copied as-is) under `--out`. It also writes
the visual recipes under `visuals/`, one per component with its `sizeScale`,
with the platform's recipes replacing or joining the foundation ones. Like
`components/`, `visuals/` is keyed by real component names: a component the
platform manifest aliases (`componentAliases`, such as `button` → `button-ios`)
stays the foundation recipe under its own name, and the platform recipe is the
separate `button-ios.json`, so apply the alias yourself. It creates
the directory if needed and removes stale `.json` files from `components/`,
`guidelines/`, `icons/`, and `visuals/` first. Without a platform it exports the
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

* The [manifest spec](/spec/manifest/) for every field and extension category.
* [`platforms/`](https://github.com/adobe/spectrum-design-data/tree/main/platforms) for the incubating React Spectrum, Web Components, and iOS manifests.
* The ejection steps in `platforms/README.md`, when your team is ready to own its manifest in its own repo.
