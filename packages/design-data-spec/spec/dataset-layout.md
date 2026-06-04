# Dataset layout

**Spec version:** `1.0.0-draft` (see [Overview](index.md))

This document defines the normative **directory layout** of a conformant design-data **dataset**: which directories are required, which are optional but registered, how files in each directory are named and validated, how tooling **discovers** a dataset on disk, and the optional root **descriptor** a dataset MAY carry.

A **dataset** is a directory tree that holds design tokens and the optional catalogs (components, fields, mode sets, registry vocabulary) that describe them. The Spectrum foundation dataset lives at `packages/design-data/`, but any design system MAY publish a dataset in this layout.

## Directory layout

A dataset is rooted at a single **dataset root** directory. The following table defines the directories tooling recognizes:

| Directory     | Status                | Contents                                                             | Schema                                                            |
| ------------- | --------------------- | -------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `tokens/`     | **Required**          | Cascade-format token files, named `*.tokens.json`.                   | [`cascade-file.schema.json`](../schemas/cascade-file.schema.json) |
| `components/` | Optional (registered) | One component declaration per `*.json` file.                         | [`component.schema.json`](../schemas/component.schema.json)       |
| `fields/`     | Optional (registered) | Name-object field declarations, one or more `*.json` files.          | [`field.schema.json`](../schemas/field.schema.json)               |
| `mode-sets/`  | Optional (registered) | Mode set declarations, one per `*.json` file.                        | [`mode-set.schema.json`](../schemas/mode-set.schema.json)         |
| `registry/`   | Optional (registered) | Registry value collections (vocabulary), one or more `*.json` files. | [`registry-value.json`](../schemas/registry-value.json)           |

**NORMATIVE:** A conformant dataset **MUST** contain a `tokens/` directory holding at least one `*.tokens.json` file. A dataset with no `tokens/` directory, or a `tokens/` directory containing no `*.tokens.json` file, is **not** conformant.

**NORMATIVE:** When a **registered** directory name (`components/`, `fields/`, `mode-sets/`, `registry/`) is present, the files it contains **MUST** validate against the schema named above. Tooling validating a dataset **MUST** validate the files in every registered directory that is present.

**RECOMMENDED:** A registered directory that exists **SHOULD** contain at least one conformant `*.json` file. An empty registered directory is permitted but **SHOULD** produce a warning, since it usually indicates incomplete data rather than intent.

**NORMATIVE:** Directory names not listed above carry no special meaning and are ignored by dataset-layout validation. Tooling **MUST NOT** treat an unrecognized sibling directory as an error.

### File-naming patterns

| Directory     | Pattern            | Notes                                                                          |
| ------------- | ------------------ | ------------------------------------------------------------------------------ |
| `tokens/`     | `**/*.tokens.json` | May be nested in subdirectories; only `*.tokens.json` files are token sources. |
| `components/` | `*.json`           | One declaration per file.                                                      |
| `fields/`     | `*.json`           | The catalog MAY be split across multiple files.                                |
| `mode-sets/`  | `*.json`           | One declaration per file.                                                      |
| `registry/`   | `*.json`           | One value collection per file.                                                 |

## Dataset discovery

Tooling that operates on "the current dataset" (rather than an explicit path) **MUST** resolve the dataset root using the following precedence. The first match wins; later tiers are only consulted when an earlier tier does not resolve a value.

1. **Explicit override** — a path passed directly by the caller (CLI positional argument or `--*-path` flag, environment variable). Explicit overrides always win.
2. **Config file** — a `.design-data.toml` discovered by walking **up** the ancestor chain from the working directory. A `[source]` block of `type = "path"` names the dataset root (resolved relative to the config file's directory). This is the explicit, portable way to point a project at a dataset outside its own tree.
3. **In-repo probing** — when running inside a monorepo checkout, probe for the standard layout relative to the working directory (`packages/design-data/tokens` and one level up). This preserves the in-repo workflow with zero configuration.
4. **Embedded snapshot** — when no dataset is found on disk, tooling MAY fall back to a snapshot of the foundation dataset embedded in the binary, materialized to a local cache directory.

**NORMATIVE:** The required directory (`tokens/`) and registered optional directories are resolved **relative to the dataset root** determined above. A discovery tier that resolves a dataset root **MUST** look for `tokens/`, `components/`, `fields/`, `mode-sets/`, and `registry/` directly under that root.

The reference implementation of this algorithm lives in the SDK at `sdk/core/src/data_source/mod.rs` (`resolve`, `from_root`, and `probe_cwd`).

## Root descriptor

A dataset **MAY** carry a root **descriptor** to make its structure and target spec version explicit. Two forms are recognized:

* **`.design-data.toml`** — a project-level config (TOML) that primarily declares where the dataset lives (`[source]`) and cache overrides. It is consumed during [discovery](#dataset-discovery) tier 2.
* **`dataset.json`** — an OPTIONAL JSON descriptor placed at the dataset root that **MAY** declare which optional directories are present, pin the spec version the dataset targets, and override default discovery paths. It **MUST** conform to [`dataset.schema.json`](../schemas/dataset.schema.json) (canonical `$id`: `https://opensource.adobe.com/spectrum-design-data/schemas/v0/dataset.schema.json`).

**NORMATIVE:** Neither descriptor is required. A dataset with a conformant `tokens/` directory and no descriptor is fully conformant. When a `dataset.json` is present it **MUST** validate against `dataset.schema.json`, but its absence **MUST NOT** be treated as an error.

## Structural validation

**NORMATIVE:** Validators implementing rule **`SPEC-044`** (`dataset-structure`) **MUST** report an **error** when a dataset path lacks a `tokens/` directory containing at least one `*.tokens.json` file. The check **MUST** fire **before** token- and component-level rules so that downstream rules can assume the dataset structure is present, and so that an incomplete dataset produces a clear "dataset structure is incomplete" diagnostic rather than a cascade of confusing per-file errors.

**RECOMMENDED:** Validators implementing `SPEC-044` **SHOULD** emit a **warning** when a registered optional directory is present but contains no conformant `*.json` file. See `rules/rules.yaml` for the full rule definition.

## References

* [#1114 — Define normative dataset-directory layout and add SPEC-044 structural pre-check](https://github.com/adobe/spectrum-design-data/issues/1114)
* [#1113 — Consolidate Spectrum design data into a single package](https://github.com/adobe/spectrum-design-data/pull/1113)
* [#714 — Design Data Specification (umbrella)](https://github.com/adobe/spectrum-design-data/discussions/714)
* [#715 — Distributed Design Data Architecture](https://github.com/adobe/spectrum-design-data/discussions/715)
