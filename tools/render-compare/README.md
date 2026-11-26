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

Exit 0 is PASS, 1 is FAIL (a diff), 2 is a vacuous run or a setup error (missing CLI, wrong layout, empty matrix). The last line says `render-compare: PASS`, `FAIL` or `VACUOUS (exit 2)`. `--changed` with no changed component prints that and exits 0.

## What it does

1. **BASE CLI.** BASE is `origin/main` (fetched first; `--no-fetch` skips it). When the PR is behind main, BASE is the merge base of the two instead, and the run says so (`NOTE: PR is N commit(s) behind ...`), so main's own changes never show as PR diffs; `--base-ref REF` overrides. `base-cli.sh ensure <sha>` builds the CLI from `git archive` of the commit into `~/.cache/sdd-render-compare/<sha>/` (`src/` is the BASE repo root, `bin/design-data` the CLI, own `CARGO_TARGET_DIR`, removed after the build unless `KEEP_TARGET=1`). A `<sha>.lock` directory (holding the builder's pid) stops two callers building the same commit twice; the second waits and reuses the result. A lock whose builder is dead (killed build) is taken over at once, or after 2 minutes if it has no pid file. A cold build needs 15 GB free (`RC_MIN_FREE_GB`). `--same-cli` skips the build and only extracts the BASE data tree.
2. **Layout.** Both runs use the CLI with cwd = a repo root and `--path packages/design-data`. A root without `dataset.json`, `visuals/`, `components/` or a non-empty `relationships/` is refused (exit 2): from `packages/design-data` the CLI loads no relationships and every binding silently fails.
3. **Matrix.** Built from the component and recipe data of both trees (union, deduplicated by the full case), in two parts. *Single factor:* every size x color scheme (light, dark, wireframe) x scale x state set (none, each state, hover+down); label values (empty, one letter, short, long wrapping, unicode); every boolean, enum, text/string (empty, one letter, short, long, unicode), number and array (0, 1, 3 and 7 items) option value, each at the first, middle and last size in all three mode pairs, with the first single states and label variants; icon unset, set (`workflow:edit`) and `none`. *Combinations:* a greedy all-pairs (pairwise) cover over every option (each with an "unset" value), the state sets and the icon, so every pair of values of any two options (enum x boolean, text x boolean, array x state, ...) is drawn at least once, with size and mode rotated across the rows; plus the all-first, all-true and all-last combinations. The run prints the total case count, the number run, and the option-pair cover (`N of M value pairs covered by the cases run`; 100% unless `--sample` thins it). `--sample N` keeps about 1/N of the cases, chosen by a seeded hash (`--seed`) so no option family aliases away. Not in the matrix: slot fills, three-way combinations.
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

`tools/render-compare/selftest.sh` (about two minutes, needs the cached BASE CLI or `CLI=<path>`) proves the matrix keeps option values, arrays and wireframe and covers every option pair; the harness passes on identical data, fails when a recipe color or an option-conditional fill (disabled + outline) changes, fails loudly (exit 2) from the wrong directory, on a layout without relationships, and on a vacuous run; and a stale lock is taken over. It is not wired into CI: it needs a CLI build.

## Limits

The default run covers `render --batch`, `render --format png` (sample) and `spec-sheet --all` only. Not covered: slot fills, platform manifests, `behavior test`, `validate`, three-way option combinations. `prune` has no in-use guard: do not prune while a run is using the cache. `--changed` sees untracked files but not unsaved ones. Token names are display text and are ignored in scenes and SVG `data-tokens`; a rebind to a different token with the same value is not seen (a changed value is). Rows in spec sheets keep token names, so a rename shows as one row lost and one gained.
