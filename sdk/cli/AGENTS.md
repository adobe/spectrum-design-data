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

**Layout revision.** Bump `LAYOUT_REVISION` only when the engine changes how existing recipes lay out in a way an old CLI cannot reproduce from the same dataset: a geometry or structure change that alters the scene for data that already existed. Example: how a container sizes its children. Do not bump for a resolved color or value that comes from new data, or from a new engine feature an old CLI ignores (a new recipe prop, default or option). Examples: the tag cross color via `inherit: contentColor`, color-slider defaults, `strokeDash`. `requires.cli` is what protects consumers from data an old CLI cannot draw, not the revision. A changed `recipe-snapshots.json` is not by itself a reason to bump. The revision and the dataset move together: `resolve_data_source` refuses a dataset whose `layoutRevision` is newer than the CLI's, and an older one only warns on stderr (`layout_revision_warning`, `core/src/visual.rs`). So a rev-N dataset is refused by every CLI below N, and the gate cannot vouch for rev-N data before the CLI that draws it is released. Bump `LAYOUT_REVISION`, the `sdk/cli/Cargo.toml` version (with `sdk/Cargo.lock`), `layoutRevision` in `packages/design-data/dataset.json` and `requires.cli` together in one PR, after the previous release is tagged, with a `@adobe/spectrum-design-data` changeset. A test fails if the constant and the dataset disagree. The check reads `<tokens root>/../dataset.json` and `visuals/`, so it does not fire for a dataset that moves `tokens/` via `paths.tokens` or for platform recipes outside `visuals/`.

**Minimum CLI.** `packages/design-data/dataset.json` carries `requires.cli`, an exact version (never a range, and no maximum): the oldest released CLI that reads the data correctly. `resolve_data_source` refuses a dataset whose `requires.cli` is newer than this CLI, or whose `layoutRevision` is newer than `LAYOUT_REVISION` (`core/src/data_source/requirements.rs`); an older revision still only warns on render. `--ignore-data-requirements` is the only escape: a global flag, never a config or environment setting, and it warns on every run. The TUI does not go through this check. Raise `requires.cli` only to a CLI that has been released, or to this checkout's own version in the same change; `tools/cli-minimum-gate/gate.sh` (the `CLI minimum gate` workflow) downloads the released minimum and fails if it cannot draw the smoke set, or draws it differently from the CLI built here. It checks the declared minimum and the current CLI only, and only `render` output: a version in between can still regress, and a break in `query`, `validate` or another command is not caught. The check reads `<tokens root>/../dataset.json` and only when the tokens directory is named `tokens`, so a dataset that moved it is skipped. `platform show` reports an unmet requirement as a finding instead of refusing. Data released before the field existed has none and is not checked. A test fails if this checkout's `dataset.json` needs more than this CLI.

**Project CLI range.** `.design-data.toml` can carry a top-level `cli_version`, a semver range (`DesignDataConfig::cli_version`, parsed when the config loads, so a bad range fails every command). It is the project's own pin, for a project that commits generated output; it is separate from a dataset's `requires.cli`. `main` classifies the command once (`produces_committed_output`: `render`, `render-compare`, `export`, `spec-sheet`, `site`, `catalog export`, `figma export`) and `enforce_project_cli_range` checks the range once, before dispatch, for every command, because a command like `render-compare` never resolves a dataset. Outside the range those commands error and every other command warns, with the same `--ignore-data-requirements` escape; `platform show` is skipped because it reports the range as a finding itself. A config error only stops the output commands, since the others do not need the config. A new command that writes files a project commits belongs in that list. A prerelease build is compared as its release. CLIs older than the key reject `.design-data.toml` (`deny_unknown_fields`), which fails loudly but does not say "upgrade".

## platform doctor

`design-data platform doctor [ID] [--latest]` (`cli/src/doctor.rs`) runs the checks that already exist and reports them as `ok`, `note`, `warn`, `FAIL` or `skip`; it exits 1 only on `FAIL`. It reuses the primitives of the commands the checks came from (`load_configured_manifest` and `apply_configured`, `unresolved_platform_bindings` for MANIFEST-001, `check_project_pin` for MANIFEST-002, `data_requirements` and `project_cli_range_finding`, `check_platform_identity`) so it cannot drift from them; add a new check by reusing a primitive, not by re-implementing it. It resolves with `resolve_data_source_unchecked` and `enforce_project_cli_range` skips it: unmet requirements are findings, never a refusal, because doctor has to run when the CLI is too old. It loads the foundation graph without the manifest, clones it and applies the manifest, so `shadowed_artifacts` can compare against the unmodified foundation. `--latest` is the only check that uses the network (the GitHub releases API through `latest_foundation_version`), and a failure there is a warning.

## suggest-context

`design-data suggest-context --out <file>` (core: `sdk/core/src/context_suggest.rs`) writes a review file of proposed relationship contexts for the records SPEC-092 flags. It never writes data and refuses an `--out` inside the dataset. Tiers: `binding`, `sibling`, `template`; each run re-measures every tier against the existing human contexts (own context hidden) and marks template proposals `needs review` unless their basis reaches 80% main-word agreement. Applying a review file is a separate step.

## PNG rendering and fonts

`design-data render --format png --output <file>` draws a recipe with the pure-Rust rasterizer in the `design-data-png` plugin crate, `sdk/plugins/png/` (a `SceneRenderer` registered in `scene_renderers()`, which also feeds the `--format` list; the CLI, TUI and `sdk/wasm` depend on it, the slim `sdk/wasm-visual` build does not). No crates are added: it has its own PNG encoder, anti-aliased fill, SVG path parser and TrueType/variable-font reader. `--pixel-ratio` sets density (default 2).

* **Font:** never embedded or committed except Source Sans 3 (SIL OFL, `plugins/png/src/fonts/`), the fallback. The target is Adobe Clean Spectrum VF, found by `plugins/png/src/font/discover.rs` (font folders and Creative Cloud's `livetype` cache, identified by header and `name` table, never by file name) or chosen with `--font` or `DESIGN_DATA_FONT`. The decision and its wording live in `font/resolve.rs` and are shared by the CLI, `design-data fonts`, and the WASM `chooseFont` used by the MCP server.
* **`wdth` is always 100.** Adobe Clean Spectrum VF defaults to its narrowest width (62.5) and weight 100, so an axis left unset is wrong. The recipe's weight sets `wght`.
* **A chosen font also sets layout widths** (`Font::text_metrics`), so `--font` changes SVG output too. The committed Source Sans 3 table stays the default and keeps the goldens stable.
* **Tests:** variable-font outlines are checked against fontTools instances in `plugins/png/src/font/testdata/ss3-instances.json` (regenerate with fontTools' `instancer` at wght 400, 700 and 900). Adobe Clean Spectrum VF is never used in fixtures or snapshots.
* `design-data fonts` exits 1 when the fallback would be used, so it doubles as a setup check.
