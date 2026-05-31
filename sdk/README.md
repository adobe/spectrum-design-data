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
│       ├── cache/      # derived redb cache over canonical JSON (default-on)
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

### cache-build

Build a portable `.redb` cache asset from a token dataset (for WASM web tools or offline distribution).

```bash
design-data cache-build packages/tokens/src -o index.redb
design-data cache-build packages/tokens/src \
  --mode-sets-path packages/design-data-spec/mode-sets \
  --components-path packages/design-data-spec/components \
  -o index.redb
```

### Derived cache (CLI/TUI)

The SDK builds a **derived, content-addressed redb cache** over the canonical JSON on disk. JSON remains the source of truth; the cache is rebuildable and never load-bearing (any cache error falls back to JSON parsing).

| Variable / flag           | Purpose                                                               |
| ------------------------- | --------------------------------------------------------------------- |
| `DESIGN_DATA_CACHE_DIR`   | Override the OS cache root (default: `dirs::cache_dir()/design-data`) |
| `DESIGN_DATA_LOG=debug`   | Log cache miss/rebuild/fallback events to stderr                      |
| `design-data cache-build` | Emit a portable `index.redb` blob for WASM or CI artifacts            |
| `--mode-sets-path`        | Include spec mode-sets catalog in cache build (resolved by default)   |
| `--components-path`       | Include spec components catalog in cache build (resolved by default)  |

Cache files live at `<cache_root>/cache/<tokens-version>/<dataset-key>.redb` and are gitignored (`*.redb`). The dataset key incorporates the tokens root and any configured catalog directories.

**Schema v2** persists tokens, query indexes (`idx_*`), inline mode-set docs co-located in the token tree, and spec catalog `mode_sets` / `components` tables. Stale v1 caches auto-invalidate on upgrade.

**Invalidation** uses per-file size + mtime (not a full content hash) for speed. A stale miss only forces a rebuild. **Known limitation:** sidecar name directories merged by `from_json_dir_with_names` are not part of the cache build path.

**Cache file keys:** `open_cached` (tokens only) and `open_cached_with_catalogs` produce different on-disk files for the same tokens root. CLI/TUI pass catalogs; WASM/tools using plain `build_bytes` / `open_cached` get a separate entry unless they use the `*_with_catalogs` variants.

**Platform manifest (CLI/TUI):** Both surfaces apply a configured `[source].manifest` at session start via the shared `design-data-core::manifest::apply_configured` helper. Query/find use the platform-scoped token set and index; `:resolve` layers manifest mode-set restrictions through `cascade::resolve_property`. The TUI header shows `N platform` (vs `N tokens`) when a manifest is active. CLI `primer` reports token count from the hydrated graph (catalogs included); it does not apply a platform manifest filter.

Opt out of the cache layer when depending on `design-data-core` as a library:

```toml
design-data-core = { path = "../core", default-features = false }
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

Versions are managed via [changesets](https://github.com/changesets/changesets) at the repo root. Run `pnpm run version` (which chains `changeset version && moon run :version`) so the npm bump and the Rust crate versions stay in sync. The explicit `run` is required — bare `pnpm version` invokes pnpm's built-in version command and skips the script. `moon run sdk:version` (`scripts/sync-cargo-version.mjs`) mirrors the npm version from `cli/package.json` into `cli/Cargo.toml` and `tui/Cargo.toml`.

### Platform package version locking

`@adobe/design-data` is a thin JS launcher that delegates to a native binary shipped in one of four platform packages (`@adobe/design-data-darwin-arm64`, `-darwin-x64`, `-linux-x64`, `-win32-x64`). The launcher pins these as `optionalDependencies` using `workspace:*`, which pnpm resolves to the exact version at publish time.

All five packages **must** publish at the same version every release, or `npm i -g @adobe/design-data` will pull a launcher that points at a stale (or missing) binary. This is enforced by a [`fixed`](https://github.com/changesets/changesets/blob/main/docs/fixed-packages.md) group in [`.changeset/config.json`](../.changeset/config.json):

```json
"fixed": [
  ["@adobe/design-data", "@adobe/design-data-darwin-arm64", "@adobe/design-data-darwin-x64", "@adobe/design-data-linux-x64", "@adobe/design-data-win32-x64"]
]
```

With `fixed`, a changeset targeting only `@adobe/design-data` bumps and republishes all five together — contributors never need to write changesets for the platform packages. The release workflow also runs `sdk/scripts/test-sync-cargo-version.mjs` as a pre-publish guard to abort if any platform version drifts. Do not add the four `*-mcp`/`-spec`/`-tui` packages to this group; they version independently.
