<!-- Copyright 2026 Adobe. All rights reserved. -->

# Standing author rules (local-host authors), spectrum-design-data, 2026-11-22

Status: a copy maintained by the orchestrator. Where a line is marked SUPERSEDED, the marked text wins.

You are an AUTHOR in your own worktree only. No asks\_\* tools ever.

* CI and merge state are YOUR job: after every push run `gh pr checks <n>` until nothing is pending (including Rust), read failed logs (`gh run view <run> --log-failed`), fix what you caused. A known flake (AVA timeout in design-data-mcp under load) may be re-run once: say so. If the PR conflicts or is behind main, merge origin/main with a merge commit subject `chore(design-data): merge origin/main ...` (commitlint rejects the default subject), keep both sides in shared fixtures, re-test, push. Do not end your turn until the PR is open and CI has no pending checks.
* NEVER `git stash`. Push only your own branch with `--force-with-lease`. Do not merge PRs, close beads or issues. ALWAYS TICK the CLA checkbox in the PR body (`- [x]`): Garth has signed the CLA and does not want it asked each time. Never touch the shared main checkout /Users/garthdb/repos/spectrum-design-data (branch, files, stash): work only in your worktree.
* `pnpm install` then `chmod 644 tools/design-data-mcp/src/cli.js` (never commit that mode change or paseo.json). Run AVA as `pnpm exec ava`.
* Legacy output must stay byte-identical (`design-data migrate legacy-output` then `git diff --stat packages/tokens` empty) for any data or engine change. `design-data validate`: no new errors (report counts before and after).
* Tests: `cargo test --workspace --no-fail-fast`, `cargo fmt --check`, `cargo clippy -D warnings`, the sdk-wasm gate per .github/workflows/ci.yml, `moon run sdk:codegen-check` or the CI equivalent when schemas or the registry change. Every NEW or changed validation rule must be registered in `default_rules()` and DISABLING it must FAIL a test (guard list in sdk/core/src/lib.rs); show a mutation check for each new behavior (the test fails when the fix is reverted).
* CLI version rule (sdk/cli/AGENTS.md, tools/cli-minimum-gate/gate.sh) (SUPERSEDED: the 0.63.0 example below was outdated; the current tagged version is whatever `git ls-remote --tags origin 'design-data-cli@*'` shows; check it, do not assume): check that output and main's `sdk/cli/Cargo.toml` version. If main's version is already tagged and your PR changes anything under sdk/ (CLI-visible behavior), bump `sdk/cli/Cargo.toml` and `sdk/Cargo.lock` to the next patch version. If main already has an untagged next version (another PR bumped it), do NOT bump again. Data-only or CI-only PRs never bump. Never change dataset.json requires.cli unless the CLI minimum gate fails without it (then say so). LAYOUT\_REVISION and dataset layoutRevision move together only if snapshots change geometry (read sdk/cli/AGENTS.md).
* Changesets: write the file directly in .changeset (no interactive wizard), validate with `node tools/changeset-linter/src/cli.js check --fail-on-warnings`, body at most 20 lines. Patch for fixes, minor for new fields and behavior, per .ai/rules/changesets.md.
* PR body: fill every section of .github/PULL\_REQUEST\_TEMPLATE.md in a private file made with `mktemp` OUTSIDE the repo, `gh pr create --body-file`, re-read with `gh pr view <n> --json body` to confirm it is yours; conventional commit title; `Fixes #N` for the issue. New files start with `Copyright 2026 Adobe. All rights reserved.`
* Report: write the FULL final report to the path named in your task, with sections: what changed (file level), gates, mutation checks, 'Decisions I made' (each tagged meaning / contract / local-reversible / scope), 'Questions for Garth' (one item per question: the question in one line, 2 to 4 options, a recommendation, Blocks, If unanswered, evidence; or `none`). Do not decide meaning calls yourself: report them. End your final message with the report path and a 5-line summary (PR URL, result, gates, top risks, number of questions). Commit WIP often.
* DISK: the local disk filled up on 2026-11-22 (126 MB free). Reviewers and authors must delete their own `mktemp -d` scratch directories (scratch cargo targets are 4 to 7 GB each) and any scratch worktrees BEFORE ending their turn, and must not build into a new CARGO\_TARGET\_DIR when an existing warm one for the same worktree exists. Check `df -h /System/Volumes/Data` before a cold build; stop and report if less than 15 GB is free.

## Checklist from recurring reviewer findings (added 2026-11-22, session 5, ask A349)

Run this before you report done. Reviewers found each item in at least one PR ([#2064](https://github.com/adobe/spectrum-design-data/issues/2064), [#2065](https://github.com/adobe/spectrum-design-data/issues/2065), [#2067](https://github.com/adobe/spectrum-design-data/issues/2067), [#2068](https://github.com/adobe/spectrum-design-data/issues/2068), [#2069](https://github.com/adobe/spectrum-design-data/issues/2069)).

1. LEGACY OUTPUT: CI does NOT run `design-data migrate legacy-verify`. Run it yourself, plus `design-data migrate legacy-output --output <mktemp dir>` and `diff -rq <that dir> packages/tokens/src` (without `--output` the command errors and proves nothing). New design-data tokens need `"excludeFromLegacy": true` unless they have a legacyKey on purpose.
2. DEPRECATED TARGETS: check `lifecycle.deprecatedIn` on every token or relationship record you bind, point at or edit. A live record must not point at a deprecated one (frozen archive); report it instead.
3. GOLDENS DRAW CONTENT: goldens and recipe snapshots for groups, collections and slots must draw slot fills and several items (selected and unselected, disabled), not an empty group.
4. MUTATION CHECK: for every new binding or behavior show a mutation (revert, zero or swap it in a scratch copy) that makes a test or golden fail. Say which test failed. "No new rule" is not an excuse for recipes.
5. FIGMA VS TOKENS: design-data tokens are the contract. When Figma or React Spectrum S2 differ from a token, list a source-conflict gap (one flat bead proposal each, labels comp:, layer:, kind:source-conflict, disp:needs-design); never edit data or invent a literal to match Figma.
6. SCRATCH: delete only your own `mktemp -d` directory. Never glob-delete `/var/folders/*/T/tmp.*` (other agents' scratch lives there).
7. CONCURRENT BUILDS: the orchestrator keeps at most 3 cold cargo builds running at once; check `df -h /System/Volumes/Data` before yours.
8. CLAIMS: report what you actually ran. If a command errored (for example a missing flag) the check did not happen.

## Orchestrator process change (A349)

Skip the reviewer's round 2 when an author fix is a few lines and the orchestrator can verify the diff and CI itself (say so in the merge ask). Use a narrow reviewer re-check for changes beyond the asked fixes, new data or engine behavior.

## BASE vs PR render comparison: use the harness (A706, session 9)

Do not hand-roll BASE vs PR comparisons. Once `tools/render-compare` is on main (PR for bead p6ga.43), run from your worktree root, with your PR CLI built (`cd sdk && cargo build -p design-data-cli`):

* `node tools/render-compare/render-compare.mjs --changed` (components your branch touched; any token, registry or engine change runs everything). `--components a,b`, `--sample N` and `--same-cli` (data-only PR: one binary, two data trees) are the other modes.
* It builds ONE base CLI per base commit (origin/main, or the merge base when your branch is behind) in `~/.cache/sdd-render-compare/<sha>/` (lock, 15 GB free check, own target dir): never build your own base CLI. `tools/render-compare/base-cli.sh list` and `prune 3` manage the cache; prune when you finish a round.
* It runs both sides from identical repo-root layouts (never from packages/design-data), generates the full option x state matrix (text/label/content values, icon set/none, booleans, enums, numbers, states, schemes, scales), compares SVG, scenes (token and chain labels and gradient ids neutralised), a PNG sample, stderr/exit codes and `spec-sheet --all` rows, and exits 1 on any diff or vacuous run (nothing rendered, one distinct output, or half the cases with "no relationship" warnings).
* Quote its summary lines (cases total/run, distinct outputs, diffs, rows lost/gained/regrouped, PASS/FAIL) in your report. Reviewers re-run it; if the PR HEAD is behind main it warns, so merge origin/main first.
* Slot fills, platform manifests, `behavior test` and `validate` are not covered: run those yourself.
* Round 2 (A706 review): the matrix now includes an all-pairs cover of options, states and icon (enum x boolean, text x boolean, arrays 0/1/3/7, wireframe) and prints `option-pair cover: N of M`. Exit codes: 0 PASS, 1 diff, 2 vacuous run or setup error. Default coverage excludes slot fills, platform manifests, `behavior test`, `validate` and three-way combinations: run those yourself. If your branch is behind main the harness compares against the merge base and prints a NOTE; a stale lock from a killed build is taken over automatically.
