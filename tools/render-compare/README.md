<!-- Copyright 2026 Adobe. All rights reserved. -->

# render-compare

Compares what the `design-data` CLI draws from BASE (`origin/main`) and from a PR checkout: the full option x state matrix per component, SVG, scene JSON, a PNG sample, stderr and exit codes, and `spec-sheet --all` rows. Use it instead of a hand-rolled comparison for any change that can move a rendered pixel, scene value or spec-sheet row (recipes, relationships, tokens, components, the render engine). Internal tooling, not a pnpm package: bash and Node, plus `jq`.

```bash
# from the PR worktree root; the PR CLI must be built (cd sdk && cargo build -p design-data-cli)
node tools/render-compare/render-compare.mjs --changed            # components this branch touched
node tools/render-compare/render-compare.mjs --components button,badge
node tools/render-compare/render-compare.mjs --sample 10          # every 10th case of every component
node tools/render-compare/render-compare.mjs --same-cli           # data-only PR: one binary (the PR CLI), two data trees
```

Exit 0 is PASS, 1 is FAIL (any diff, or a vacuous run), 2 is a setup error (missing CLI, wrong layout). The last lines say `render-compare: PASS` or `FAIL`.

## What it does

1. **BASE CLI.** `base-cli.sh ensure origin/main` builds the CLI from `git archive` of the commit into `~/.cache/sdd-render-compare/<sha>/` (`src/` is the BASE repo root, `bin/design-data` the CLI, own `CARGO_TARGET_DIR`, removed after the build unless `KEEP_TARGET=1`). A `<sha>.lock` directory stops two callers building the same commit twice; the second waits and reuses the result. A cold build needs 15 GB free (`RC_MIN_FREE_GB`). `--same-cli` skips the build and only extracts the BASE data tree.
2. **Layout.** Both runs use the CLI with cwd = a repo root and `--path packages/design-data`. A root without `dataset.json`, `visuals/`, `components/` or a non-empty `relationships/` is refused (exit 2): from `packages/design-data` the CLI loads no relationships and every binding silently fails.
3. **Matrix.** From the component and recipe data of both trees (union, deduplicated): every size x color scheme x scale x state set (none, each state, hover+down), label values (empty, one letter, short, long wrapping, unicode), every boolean, enum, text/string (empty, one letter, short, long, unicode), number option value at the first, middle and last size in two mode pairs, boolean pairs, and icon unset, set (`workflow:edit`) and `none`. `--sample N` keeps every Nth case (offset `--seed`). Slot fills are not in the matrix. The run prints the total and the sampled case count.
4. **Compare.** Per case: render outcome and diagnostics, SVG, scene JSON. Scenes go through `tools/cli-minimum-gate/normalize.jq` (the `token` and `chain` strings blanked); SVGs have `data-tokens` blanked; gradient ids, which hash label text, are renumbered by first use in both. "label-only" counts byte differences that vanish after that. Then a PNG byte compare on `--png-sample` cases (default 20), identical stderr (output paths neutralized) and exit code per component, and `spec-sheet --all`: sheets lost/gained, rows lost/gained/regrouped (a row is the multiset item; regrouped = same row in another block) and any difference outside rows.
5. **Vacuous runs fail.** A side that renders nothing, a run where all cases produce one SVG, or one where at least half the cases carry a `no relationship` / `does not resolve` diagnostic is `VACUOUS RUN` and fails, whatever the diff count.
6. **Report.** Counts per component, distinct output counts, the first `--examples N` (default 5) diffs with the case and the first differing text, timings. `--report FILE` writes the same as JSON. Case outputs are deleted on PASS and kept (path printed) on FAIL or with `--keep`/`--out`.

## Options

`--base-ref REF`, `--base-root DIR`, `--base-cli FILE`, `--pr-root DIR`, `--pr-cli FILE`, `--same-cli`, `--data DIR` (default `packages/design-data`), `--components a,b`, `--changed`, `--sample N`, `--seed N`, `--png-sample N` (0 skips), `--no-spec-sheet`, `--jobs N`, `--examples N`, `--out DIR`, `--report FILE`, `--keep`.

`--changed` maps `components/`, `visuals/` and `relationships/` files that differ from the merge base to components. Any other changed file under the data directory or `sdk/` (tokens, registry, engine; `.md`, test, `behaviors/`, `guidelines/` and `changelog/` files excepted) makes it run every component, and says so.

If the PR HEAD does not contain the BASE commit the report warns: some diffs then come from main, not the PR. Merge `origin/main` first.

## Cache

```bash
tools/render-compare/base-cli.sh list       # cache dirs and sizes
tools/render-compare/base-cli.sh prune 3    # keep the 3 most recent, delete the rest
```

`RC_CACHE` moves the cache. Prune after a review round; a cached commit is only reused until `origin/main` moves.

## Self-test

`tools/render-compare/selftest.sh` (about a minute, needs the cached BASE CLI or `CLI=<path>`) proves the harness passes on identical data, fails when a recipe color changes, and fails loudly (exit 2) from the wrong directory and on a layout without relationships. It is not wired into CI: it needs a CLI build.

## Limits

Not compared: slot fills, platform manifests, `behavior test`, `validate`, any command other than `render --batch`, `render --format png` and `spec-sheet --all`. Token names are display text and are ignored in scenes and SVG `data-tokens`; a rebind to a different token with the same value is not seen (a changed value is). Rows in spec sheets keep token names, so a rename shows as one row lost and one gained.
