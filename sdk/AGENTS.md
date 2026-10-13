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
  `packages/design-data/tokens/*.tokens.json`, `packages/design-data/{mode-sets,components,fields,guidelines}/*.json`, etc. invalidate the build
* **WASM**: `sdk/wasm/` has a separate `Cargo.toml` and is also in the pnpm workspace
  via `sdk/tui/` (the TUI's npm package wraps the Rust binary)
* **`sdk/target/` is \~29 GB** — never read into it; it's gitignored

## Copyright

New Rust files: `// Copyright YYYY Adobe. All rights reserved.` (current year, `//` style).
New YAML/moon.yml: `# Copyright YYYY Adobe. All rights reserved.`

## Testing

`moon run sdk:test` runs all unit and integration tests via `cargo nextest run --workspace`
(schedules all tests across one pool instead of one binary at a time — much faster with
\~27 integration-test binaries across the workspace). Doctests aren't run by nextest;
`moon run sdk:test-doc` (`cargo test --workspace --doc`) covers those separately.
No AVA — the Rust crates do not use JavaScript testing frameworks.

Local install: `cargo install cargo-nextest@0.9.114 --locked` (or `cargo binstall cargo-nextest`).
Pinned to 0.9.114 because newer releases require rustc 1.91+, ahead of this repo's
pinned `rust-toolchain.toml` (1.88.0). CI installs via `taiki-e/install-action`,
which fetches a prebuilt binary and isn't affected by this constraint.

### Local test performance (macOS)

On managed macOS machines, both Gatekeeper/XProtect and CrowdStrike Falcon re-scan
freshly built test binaries on exec, which can dominate wall-clock time — not
compile/link (see bead `spectrum-design-data-tdb`). Two independent mitigations,
neither of which this repo can configure for you:

* **Gatekeeper**: `sudo spctl developer-mode enable-terminal`, then enable your
  terminal app under **System Settings → Privacy & Security → Developer Tools**.
* **CrowdStrike Falcon**: request a path exclusion for `sdk/target/` (or your
  Cargo target dir) from your org's CrowdStrike admin/IT security team. Don't
  attempt to disable or bypass the Falcon agent yourself — it's centrally
  managed via MDM.
