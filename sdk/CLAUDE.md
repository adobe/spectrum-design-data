# SDK — Rust Workspace

<!-- Copyright 2026 Adobe. All rights reserved. -->

This is a Cargo workspace containing the Rust implementation of the design-data SDK.

## Crates

| Crate              | Path        | Purpose                                                          |
| ------------------ | ----------- | ---------------------------------------------------------------- |
| `design-data-core` | `sdk/core/` | Core logic: token resolution, component schema parsing, registry |
| `design-data-cli`  | `sdk/cli/`  | CLI binary (the `design-data` executable)                        |
| `design-data-tui`  | `sdk/tui/`  | Terminal UI (also has a `package.json` for pnpm workspace)       |
| `design-data-wasm` | `sdk/wasm/` | WASM bindings                                                    |

## Tasks (always via moon, not cargo directly)

```bash
moon run sdk:build       # cargo build --workspace
moon run sdk:test        # cargo test --workspace
moon run sdk:lint        # cargo clippy --workspace -- -D warnings
moon run sdk:fmt         # cargo fmt --all (local only)
moon run sdk:codegen     # regenerates core/src/registry_data.rs from token JSON
moon run sdk:codegen-check  # verifies codegen is up to date (CI)
moon run sdk:tui         # run the TUI locally
```

Note: build and test both depend on `codegen-check` — if token JSON files changed,
run `moon run sdk:codegen` first or the check will fail.

## Key Facts

* **Rust toolchain**: pinned in `sdk/rust-toolchain.toml` — don't override it
* **Crates are internal-only** for now — not published to crates.io
* **Embedded data**: `core` embeds token snapshots at compile time; changes to
  `packages/tokens/src/*.json`, `packages/design-data/**/*.json`, etc. invalidate the build
* **WASM**: `sdk/wasm/` has a separate `Cargo.toml` and is also in the pnpm workspace
  via `sdk/tui/` (the TUI's npm package wraps the Rust binary)
* **`sdk/target/` is \~29 GB** — never read into it; it's gitignored

## Copyright

New Rust files: `// Copyright YYYY Adobe. All rights reserved.` (current year, `//` style).
New YAML/moon.yml: `# Copyright YYYY Adobe. All rights reserved.`

## Testing

`cargo test --workspace` runs all unit and integration tests.
No AVA — the Rust crates do not use JavaScript testing frameworks.
