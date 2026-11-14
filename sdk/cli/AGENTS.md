<!-- Copyright 2026 Adobe. All rights reserved. -->

# sdk/cli

The `design-data` command-line interface.

* **Audience:** consumer. **Lifecycle:** active. **npm:** not published.
* Repository-wide rules are in [the root AGENTS.md](../../AGENTS.md). The [repository index](../../docs/repo-index.md) lists every project.

## Commands

```bash
moon run sdk:build
moon run sdk:test
moon run sdk:lint
```

## Releases

Changesets do not release the CLI. `release.yml` builds and tags `design-data-cli@<version>` from the `version` in `sdk/cli/Cargo.toml` (and the Homebrew formula installs from that tag), so bump it, with `sdk/Cargo.lock`, in any PR that changes CLI behavior: minor for a new command or flag, patch for a fix. A changeset is only needed for a JS package the change touches.

## suggest-context

`design-data suggest-context --out <file>` (core: `sdk/core/src/context_suggest.rs`) writes a review file of proposed relationship contexts for the records SPEC-092 flags. It never writes data and refuses an `--out` inside the dataset. Tiers: `binding`, `sibling`, `template`; each run re-measures every tier against the existing human contexts (own context hidden) and marks template proposals `needs review` unless their basis reaches 80% main-word agreement. Applying a review file is a separate step.

## PNG rendering and fonts

`design-data render --format png --output <file>` draws a recipe with the pure-Rust rasterizer in `sdk/core/src/raster/` (feature `raster`, which the CLI and TUI turn on; the slim `sdk/wasm-visual` build does not). No crates are added: it has its own PNG encoder, anti-aliased fill, SVG path parser and TrueType/variable-font reader. `--pixel-ratio` sets density (default 2).

* **Font:** never embedded or committed except Source Sans 3 (SIL OFL, `core/src/raster/fonts/`), the fallback. The target is Adobe Clean Spectrum VF, found by `core/src/raster/font/discover.rs` (font folders and Creative Cloud's `livetype` cache, identified by header and `name` table, never by file name) or chosen with `--font` or `DESIGN_DATA_FONT`. The decision and its wording live in `font/resolve.rs` and are shared by the CLI, `design-data fonts`, and the WASM `chooseFont` used by the MCP server.
* **`wdth` is always 100.** Adobe Clean Spectrum VF defaults to its narrowest width (62.5) and weight 100, so an axis left unset is wrong. The recipe's weight sets `wght`.
* **A chosen font also sets layout widths** (`Font::text_metrics`), so `--font` changes SVG output too. The committed Source Sans 3 table stays the default and keeps the goldens stable.
* **Tests:** variable-font outlines are checked against fontTools instances in `core/src/raster/font/testdata/ss3-instances.json` (regenerate with fontTools' `instancer` at wght 400, 700 and 900). Adobe Clean Spectrum VF is never used in fixtures or snapshots.
* `design-data fonts` exits 1 when the fallback would be used, so it doubles as a setup check.
