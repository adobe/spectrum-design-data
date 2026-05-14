# Spectrum Design Data SDK

A Rust workspace that produces the `design-data` CLI — tooling for validating, resolving, querying, diffing, and migrating Spectrum design tokens against the [Design Data Specification](../packages/design-data-spec/). Includes an optional bridge to the Figma Variables REST API.

Licensed under [Apache-2.0](../LICENSE).

## Workspace layout

```
sdk/
├── core/               # design-data-core library
│   └── src/
│       ├── cascade/    # cascade resolution
│       ├── validate/   # two-layer validation (structural + relational)
│       ├── diff/       # token dataset diffing
│       ├── query/      # filter expressions
│       ├── migrate/    # snapshot, convert, legacy helpers
│       ├── figma/      # Figma Variables bridge (feature-gated)
│       ├── schema/     # JSON Schema registry
│       └── registry/   # design-system registry data
├── cli/                # design-data-cli binary (design-data)
├── scripts/            # Node helpers (codegen, version sync)
├── moon.yml            # moonrepo task definitions
└── rust-toolchain.toml # pinned toolchain (Rust 1.85.0)
```

## Build

The toolchain is pinned in `rust-toolchain.toml` and installed automatically by `rustup`.

From the repo root (preferred — runs codegen checks first):

```bash
moon run sdk:build
```

Or directly inside `sdk/`:

```bash
cargo build --workspace
```

The built binary is at `sdk/target/debug/design-data`.

## CLI usage

All subcommands accept `--help` for full flag documentation.

### validate

Validate a token file or directory against JSON Schemas (Layer 1) and relational catalog rules (Layer 2).

```bash
design-data validate packages/tokens/src
design-data validate packages/tokens/src --strict
design-data validate packages/tokens/src --format json

# Optional overrides
design-data validate packages/tokens/src \
  --schema-path packages/design-data-spec \
  --exceptions-path naming-exceptions.json \
  --mode-sets-path packages/tokens/src/mode-sets \
  --components-path packages/tokens/src/components
```

### resolve

Resolve a single token property to its final value for a given mode context.

```bash
design-data resolve background-color-default packages/tokens/src \
  --color-scheme light \
  --scale desktop \
  --contrast regular
```

### diff

Compare two token datasets and report additions, removals, and changes.

```bash
design-data diff packages/tokens/src packages/tokens-next/src
design-data diff old/ new/ --filter "component=button"
design-data diff old/ new/ --format json
```

### query

List tokens matching a filter expression.

```bash
design-data query packages/tokens/src --filter "component=button,state=hover"
design-data query packages/tokens/src --filter "component=button" --count
design-data query packages/tokens/src --filter "component=button" --format json
```

### migrate

Snapshot and backward-compatibility helpers.

```bash
design-data migrate snapshot packages/tokens/src --output golden.json
design-data migrate verify  packages/tokens/src --snapshot golden.json
design-data migrate convert input/ --output output/
design-data migrate legacy-output input/ --output output/
design-data migrate add-uuids input/ --output output/
design-data migrate roundtrip-verify packages/tokens/src
```

### figma

Interact with the Figma Variables REST API. Requires a `FIGMA_TOKEN` environment variable.

```bash
export FIGMA_TOKEN=<your-token>
design-data figma read   --file-key <KEY>
design-data figma export --file-key <KEY> --output figma-vars.json
```

### primer

Emit a structural overview of the dataset — useful as context at the start of an agent session.

```bash
design-data primer packages/tokens/src
design-data primer packages/tokens/src --format json
```

### component

Return the full component declaration for a given component identifier.

```bash
design-data component button
design-data component action-bar
```

### write

Create or update a `product-context.json` document for a product-layer working copy.

```bash
design-data write -o product-context.json -r "Customizing accent color for brand"
```

## Validation model

Validation runs in two layers:

* **Layer 1 — Structural** (`core/src/validate/structural.rs`): JSON Schema validation against the spec schemas in `packages/design-data-spec/`.
* **Layer 2 — Relational** (`core/src/validate/relational.rs`): Graph-based catalog rules that check cross-token relationships (alias targets, cascade completeness, naming conventions, accessibility declarations, etc.).

Relational rules have stable `SPEC-NNN` IDs and live in [`core/src/validate/rules/`](core/src/validate/rules/). Each file is self-documenting via inline doc comments.

## Development

### Tasks (via moonrepo)

| Command                | What it does                                                  |
| ---------------------- | ------------------------------------------------------------- |
| `moon run sdk:build`   | `cargo build --workspace` (after codegen check)               |
| `moon run sdk:test`    | `cargo test --workspace` (after codegen check)                |
| `moon run sdk:lint`    | `cargo clippy --workspace -- -D warnings`                     |
| `moon run sdk:codegen` | Regenerate `core/src/registry_data.rs` from registry JSON     |
| `moon run sdk:version` | Sync npm version → `cli/Cargo.toml` after `changeset version` |

### Codegen

`core/src/registry_data.rs` is generated from `packages/design-system-registry/registry/*.json` and spec field definitions. Never edit it by hand. CI runs `codegen-check` to detect drift; fix locally with `moon run sdk:codegen`.

### Integration tests

Integration tests live in `sdk/cli/tests/cli_validate.rs` and use [`assert_cmd`](https://docs.rs/assert_cmd) to exercise the binary end-to-end.

### Figma feature flag

The `figma` module in `design-data-core` is gated behind the optional `figma` feature. The CLI enables it by default. Library consumers that don't need Figma can omit the feature to avoid the `reqwest`/`tokio` dependencies.

## Versioning

Versions are managed via [changesets](https://github.com/changesets/changesets) at the repo root. After running `changeset version`, `moon run sdk:version` (`scripts/sync-cargo-version.mjs`) mirrors the npm version from `cli/package.json` into `cli/Cargo.toml`.
