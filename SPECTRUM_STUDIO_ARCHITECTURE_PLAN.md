<!-- Copyright 2026 Adobe. All rights reserved. -->

# Spectrum Studio: architectural necessities for the monorepo

Evaluation of `docs/spectrum-studio/docs/migration-to-spectrum-design-data.md` against the monorepo's standards (`AGENTS.md`, `TOOLING_STANDARDS.md`, `.moon/`, `.github/`, `.ai/`, `.lintstagedrc.js`). Every item below was checked against the working tree on 2026-10-28.

## Status (2026-10-29): Phases A to F done, Phase G pending

Where the plan differs from what was built:

* **Location:** `docs/spectrum-studio` (not `packages/`). `docs/*` was already in `pnpm-workspace.yaml`.
* **Dependencies:** the studio's direct dependencies are pinned to the exact versions of its original lockfile. Eight root `pnpm.overrides`, each scoped to one parent, hold back transitive drift that broke Node 22.12 (`undici`), crashed the build (native parcel/swc/lightningcss/msgpackr/esbuild versions) or changed bundles (`fast-uri`). The three patches moved to the repo root `patches/`. Security overrides were skipped by decision.
* **Node:** the toolchain is now 22.12.0 (`.moon/toolchains.yml`, root `engines`). Three tools' `engines` changed from `~20.12` to `>=20.12.0`. Release workflows stay on 20.17.0 (separate change).
* **CI:** `spectrum-studio:typecheck`, `:test` (the 40 passing checks, `test:ci`) and `:build`. ESLint is local-only until DEBT-032 is fixed. Changesets ignore the package.
* **Formatting:** Prettier applied, with a root `.prettierignore` for generated, byte-compared and text-asserted files. Studio markdown is excluded from remark (`.lintstagedrc.js`), because remark pads tables and inflates them 2 to 3 times.
* **Pins:** only `APP-PLATFORMS` was re-pinned. 11 other pins were already stale before the move (DEBT-034).
* **Verified:** CI guard logic (0 uncovered tasks), the 21 Node CI targets on Node 22.12, `typecheck`, `test:ci`, `build`, and `.ai` validation. After formatting, 892 of 895 code files compile to identical output once layout is normalized. The other 3 are the intended pin and two whitespace-only differences inside template literals.
* **Known debt (not caused by the move):** 28 failing `test:*` scripts (DEBT-033 and related), ESLint errors (DEBT-032), stale pins (DEBT-034), an ambiguous Working rule 2 (DEBT-035). All are in `docs/spectrum-studio/docs/known-debt.md`.

Open: RFC placement (`docs/rfcs/` vs `docs/proposals/`), and whether to relax the exact dependency pins later.

**Guardrail for every step:** no change to studio UI, behavior, data or generation logic. Changes are limited to config, tooling, metadata, comment-only headers and formatting. Formatting is verified by the studio pin and parity tests (see Phase F).

## Decisions recorded

| Topic            | Decision                                                                            |
| ---------------- | ----------------------------------------------------------------------------------- |
| Node             | Bump the monorepo toolchain (Vite 8 needs `^20.19 \|\| >=22.12`; moon pins 20.17.0) |
| Tests            | Documented AVA exception. Keep `tsx` scripts and Playwright                         |
| Formatting       | Format everything, then re-pin SHA-256 pins that the format pass changes            |
| Task tracking    | Studio keeps `docs/known-debt.md`; `bd` applies to monorepo-level work              |
| Copyright        | Script-add headers (comment-only)                                                   |
| Missing dotfiles | Copy `.agents/`, `.storybook/`, `.env.example` in from the source repo              |

## Answers to your direct questions

| Question                      | Answer                                                                                                                                                                                                                                             |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Does it need a root script?   | Yes, one. Add a `moon.yml` and register it in `.moon/workspace.yml`. Add the root `package.json` `pnpm.patchedDependencies` and `overrides`. No new root `scripts` entries are needed, because the repo runs tasks as `moon run <project>:<task>`. |
| Does it need a linter?        | Studio keeps its own ESLint (`eslint.config.js`). The root has no ESLint, and `component-options-editor` also owns its config. Prettier and remark come from the root pre-commit hook. A `lint` moon task wraps `pnpm lint`.                       |
| What gets checked against it? | See the rules table below.                                                                                                                                                                                                                         |

## Rules that will apply to the new content

| Rule (source)                                          | Applies how                                                                                                                                     | Status today                                                                                                                                                                      |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| pnpm 10.17.1 only (`AGENTS.md`)                        | `packageManager` removed from the package and the package's own lockfile and `pnpm-lock.yaml` deleted (root owns both)                          | Not done: still `pnpm@10.17.0` and its own lockfile with 8 `artifactory.corp.adobe.com` entries                                                                                   |
| Workspace membership                                   | `docs/*` is already globbed                                                                                                                     | Done. Root lockfile already has the studio importer and 0 Artifactory entries                                                                                                     |
| pnpm `overrides` and `patchedDependencies` (root only) | Move to root `package.json`. Move `patches/` to repo root                                                                                       | **Not done.** The root lockfile has neither block, so the three `react-aria`, `react-stately` and `unplugin-parcel-macros` patches are not applied and the build is likely broken |
| moon tasks (`TOOLING_STANDARDS.md`)                    | `moon.yml` plus `.moon/workspace.yml` entry (`layer: application`)                                                                              | Not done                                                                                                                                                                          |
| CI target guard (`ci-targets.json`)                    | Every `runInCI` task listed under `node` or `excludedFromCI`, or `check-ci-coverage.mjs` fails                                                  | Not done                                                                                                                                                                          |
| Node 20.17.0 vs Vite 8                                 | Bump `.moon/toolchains.yml`, root `engines.node`, and confirm `.github` setup. Own change, with other packages' tests as evidence               | Conflict confirmed (`vite` engines: `^20.19.0 \|\| >=22.12.0`)                                                                                                                    |
| AVA (`TOOLING_STANDARDS.md`)                           | Exception documented. Studio keeps `tsx` and Playwright                                                                                         | Needs doc edit                                                                                                                                                                    |
| Prettier and remark (`.lintstagedrc.js`)               | Runs on every staged js/ts/json/yml/md file. Remark skips only a fixed list of paths                                                            | Studio unformatted: will be reformatted on first commit                                                                                                                           |
| commitlint conventional commits, husky                 | Applies to import commits                                                                                                                       | The raw import commit needs `--no-verify` once, or the hook reformats it                                                                                                          |
| Changesets (`access: public`)                          | Private package. Add `docs/spectrum-studio` to `.changeset/config.json` `ignore`, or accept a version entry. **Verify** with `changeset status` | Undecided                                                                                                                                                                         |
| Copyright header                                       | `Copyright YYYY Adobe. All rights reserved.` on new files. Not CI-enforced (no check found)                                                     | 886 of the 886 source/script/test files lack it                                                                                                                                   |
| `.ai/` single source (`ai:check` in CI)                | `inventory.json` entry; `AGENTS.md` plus a `CLAUDE.md` that only points to it; rules under `.ai/rules/` with globs                              | `CLAUDE.md` is already a symlink to `AGENTS.md` (check the validator accepts symlinks). No inventory entry yet. `.agents/` is missing from the copy                               |
| `.gitignore`                                           | Add `storybook-static`, `test-results`, `playwright-report`, `.env.local`. The root ignores only `dist`, `.env` and `.env.test`                 | Not done                                                                                                                                                                          |
| Agent task tracking (`bd`)                             | Studio exception documented in its `AGENTS.md`                                                                                                  | Needs maintainer sign-off                                                                                                                                                         |

## New findings not in the migration plan

1. **Pinned patches are not applied.** The root lockfile has no `patchedDependencies` or `overrides`. Moving them to the root is a build blocker, not just tidying.
2. **The copy is missing hidden files.** `.agents/` (15 skills and rules that `AGENTS.md` cites about ten times), `.storybook/` (all `storybook` scripts), `.env.example`, `.nvmrc`. `storybook` and `storybook:build` cannot run today.
3. **Root lockfile churn.** `git diff --stat pnpm-lock.yaml` shows +5344/-266. Other packages' resolutions moved (for example `typescript` 5.8.3 to 5.9.3 and `@types/node` 22 to 24 for commitlint). Review for unintended upgrades before committing, and check the other packages' tests.
4. **Reference root default.** `scripts/design-data-loader.ts:12` still defaults to `../spectrum-design-data`. In the monorepo it must resolve to the repo root. The loader also expects the Rust binary at `sdk/target/debug/design-data`, so the moon tasks that use it need `deps: [sdk:build]`, like `packages/design-data` does.
5. **Two kinds of SHA-256 pins.** `assessmentPins.ts` holds 32 pins. `APP-*`, `TARGET-*` and `PR-REVIEW-RECORD` fingerprint studio-owned material. Re-pinning those after formatting is straightforward. `CURRENT-*`, `DRAFT-*` and `BASE-*` fingerprint upstream files under `packages/design-data` and `packages/design-data-spec`. Studio's formatting does not change them, but the live monorepo copy can differ from the revision they were assessed against. Treat them as an independent check (Phase F).

## Plan

Each phase is one reviewable commit. Run phases in order. None touches studio runtime code.

**Phase A: complete the import (blocks install)**

1. Hidden files are now present (done). Remove `.nvmrc` (superseded by the moon toolchain) and `.github/copilot-instructions.md` (replaced by `.ai/rules/`; GitHub reads only the root `.github`). Keep the `.claude` and `.cursor` symlinks to `.agents` for now, and check that `pnpm ai:check` accepts them.
2. Delete the package's `pnpm-lock.yaml`. Confirm no `.npmrc` or `.env.local`.
3. Extend `.gitignore` as above.
4. Gate: `git grep -n -i "artifactory"` returns nothing in the package.

**Phase B: workspace build**

1. Package `package.json`: `name: @adobe/spectrum-studio`, `private: true`, remove `packageManager` and the `pnpm` block, add `repository.directory`, `license: Apache-2.0`, `engines`.
2. Root `package.json`: add `pnpm.overrides` and `pnpm.patchedDependencies`. Move `patches/` to the root. Prefer narrow override selectors and check their effect on other packages.
3. Re-run `pnpm install`. Review the lockfile diff (finding 3).
4. Update `referenceRoot` default and `.env.example` (finding 4). Keep `DESIGN_DATA_PATH` as an override.
5. Gate: `pnpm --filter @adobe/spectrum-studio typecheck` and `build`. Compare with the Phase 0 baseline.

**Phase C: Node toolchain (separate PR)**

Raise `.moon/toolchains.yml`, root `engines`, and any CI `setup` pins to a Vite 8-compatible Node. Gate: `moon run :test` for all packages.

**Phase D: moon and CI**

1. Register `spectrum-studio: "docs/spectrum-studio"` in `.moon/workspace.yml`.
2. `moon.yml` modeled on `tools/component-options-editor`: tasks `typecheck`, `lint`, `build`, curated `test`, and `e2e` plus `storybook` with `runInCI: false`.
3. Curated `test` list: `test:defaults`, `test:design-data`, `test:changelog`, `test:tokens`, `test:modes` and similar fast checks. Confirm the list with you before wiring, so nothing in the curated set is arbitrary.
4. Add CI tasks to `ci-targets.json` under `node` (or `excludedFromCI`). Run `node .github/scripts/check-ci-coverage.mjs`.
5. Document the AVA exception in `TOOLING_STANDARDS.md` and the studio `AGENTS.md`.

**Phase E: AI resources and docs**

1. `.ai/inventory.json` entry: `docs/spectrum-studio`, `kind: package`, `audience: maintainer`, `lifecycle: active`, `published: false`, `llms: false`.
2. Rewrite the studio `AGENTS.md`: drop commit-hook, roadmap-path and copilot references that no longer apply, keep the working rules (scope, test scoping, diagnostics, Changes parity), add the `known-debt.md` and AVA exceptions.
3. `.ai/rules/spectrum-studio.md` with `globs: docs/spectrum-studio/**`. Run `pnpm ai:sync` then `pnpm ai:check`.
4. Leave `.agents/` in place and referenced, as the plan says. **Verify** that tools discover it from the repo root.
5. Update `README.md` setup (moon and root `pnpm install`) and keep `docs/README.md` relative so `check:docs-index` still works.

**Phase F: format, headers, re-pin (highest-risk step, so it runs last and in isolation)**

1. Capture baseline: `test:design-data-assessment`, `test:design-data-portable-contract`, `test:changelog`, `check:design-data-gaps`, `check:docs-index`, `typecheck`, `build`.
2. Add copyright headers by script. Apply to `.ts`, `.tsx` and `.mjs` only. Skip `*.json`, generated files and third-party notices (`docs/third-party/`). Comment-only change, but `// ` lines can shift hashes of anything that fingerprints source.
3. Run Prettier and remark over the package.
4. Re-run the baseline checks. Expect hash mismatches on `APP-*`, `TARGET-*` and `PR-REVIEW-RECORD`. Re-pin only those, deliberately, as `assessmentPins.ts` requires ("updated after source review"). Do not touch the upstream pins without confirming the reference revision.
5. Gate: every baseline check equal or better. Diff the generated token and CSS outputs before and after to prove that behavior did not change.

**Phase G: verify**

From the root: `pnpm ai:check`, `moon run :test`, the CI guard, then `pnpm dev` and the smoke path (Foundations, Colors, Scale Editor, Evaluation, Analysis page) asserting an empty `pageerror` list.

## Open questions (none affect studio design or behavior)

Resolved:

1. Location: `docs/spectrum-studio` (matches other apps; `docs/*` is already in `pnpm-workspace.yaml`, so no workspace change). Two levels up from the package is still the repo root, so the `referenceRoot` fix is unchanged.
2. Changesets: ignore for now (add to `.changeset/config.json` `ignore` in Phase D).
3. Public visibility: RFCs and project plans are fine to publish.

Deferred:

4. RFC placement (`docs/rfcs/` vs the monorepo's `docs/proposals/` and `docs/rfc-coordination.md`): separate investigation of what `docs/proposals/` holds and whether the two RFCs are current. Until then they stay in the package, unmoved (they are also pinned evidence).

Resolved by proposal (needs your OK):

5. Curated test list, tiered by what each check needs:
   * **CI tier (node only):** `typecheck`, `lint`, `build`, and the pure `tsx` checks that need no browser, SDK binary or long run. Candidates are the `test:*` scripts other than those below.
   * **Local tier (`runInCI: false`):** `test:e2e`, `test:e2e:storybook`, `storybook*`, `test:color-system` (performance), `test:data-vis` and `test:prioritized-work` (long chains), and `test:design-data-sdk` (needs `sdk/target/debug/design-data`).
   * Phase D times each script first, so the CI tier is a measured list, not a guess.
6. Upstream pins (`CURRENT-*`, `DRAFT-*`, `BASE-*`): leave as they are. In Phase B, run `test:design-data-assessment` once against the in-repo reference and report which pins differ. Per studio working rule 2 a mismatch is a diagnostic, not a failure. You then decide whether to re-assess.
