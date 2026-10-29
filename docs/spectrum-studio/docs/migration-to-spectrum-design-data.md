# Migration plan: Spectrum Studio into `spectrum-design-data`

Knowledge transfer and migration plan for moving this project into the
`adobe/spectrum-design-data` monorepo as a private app package at
`packages/spectrum-studio`. Written for two readers: the person doing the move,
and the agent they will prompt afterwards (see [Agent prompts](#agent-prompts)).

Facts about the monorepo come from a read of the local checkout at
`/Users/nbaldwin/Git/spectrum-design-data` (`main`, origin
`git@github.com:adobe/spectrum-design-data.git`) on 2026-10-28. Items marked
**Verify** were inferred, not confirmed. Re-check them before acting.

## 1. Decisions already made

| Decision | Choice |
| --- | --- |
| End state | Private app package (`"private": true`, never published). Splitting reusable libraries out later is a separate effort. |
| Concurrent development | None. Only the owner is changing the project, so no freeze or sync is needed. |
| Git history | Fresh copy, no history preserved. The old repository stays as the archive. |
| Package name and path | Proposed: `packages/spectrum-studio`, npm name `@adobe/spectrum-studio`. Confirm. |

## 2. Is copy and paste a good start?

Yes as a starting point, no as the whole method. A raw copy of the folder fails in
five places before any code runs, so copy into a branch and run the checklist in
[Phase 0](#phase-0-prepare-this-repo-before-copying) first.

1. **The monorepo is public.** `adobe/spectrum-design-data` is a public Apache-2.0
   repository. This project currently points at the internal Adobe Artifactory
   registry (`.npmrc`, and `pnpm-lock.yaml` has 8 `artifactory.corp.adobe.com`
   entries). GitHub-hosted CI and outside contributors cannot reach it.
   Do not carry over `.env.local`, `.npmrc`, `dist/`, `storybook-static/`,
   `test-results/`, `reports/` or `node_modules/`.
2. **pnpm settings only work from the workspace root.** This project's
   `package.json` has a `pnpm` block (`overrides` and `patchedDependencies` for
   `react-aria`, `react-stately`, `unplugin-parcel-macros`). In a workspace, pnpm
   ignores that block in a package. It must move to the root, and overrides then
   apply to every package in the monorepo.
3. **The monorepo reformats on commit.** The pre-commit hook runs Prettier on
   js/ts/json/yml and remark on markdown (`.lintstagedrc.js`), and there is no
   `.prettierrc` or `.prettierignore`. Every staged Spectrum Studio file would be
   reformatted, and the SHA-256 pinned docs (see below) would be rewritten.
4. **Agent files work differently.** The monorepo has one source of truth in a
   root `.ai/` directory, generated Copilot and Cursor files, and a CI check
   (`root:ai-check`). Spectrum Studio's `.agents/` tree and `.github/copilot-instructions.md`
   do not fit that model.
5. **The design-data reference path changes.** Spectrum Studio finds the reference
   checkout through `DESIGN_DATA_PATH`, defaulting to `../spectrum-design-data`
   (`scripts/design-data-loader.ts`). Inside the monorepo the reference root is the
   repo root, two levels up.

### Git history decision

Decided: import as a **fresh copy with no history preserved**, in one or two
commits, and keep the old repository (`NateBaldwinDesign/gestalt`) as the archive
of history. The old history may contain internal URLs, tokens or registry details
that should not enter a public repository, and the design intent is recorded in
`docs/` and the gap register. Commit messages in the import follow the
monorepo's conventional commit format.

## 3. How the two projects differ

| Area | Spectrum Studio today | Monorepo convention | Impact |
| --- | --- | --- | --- |
| Package manager | pnpm 10.17.0 | pnpm 10.17.1, workspace `packages/*` already globbed | Low. Drop Spectrum Studio's own lockfile. |
| Node | `.nvmrc` 22.12.0 | moon pins Node 20.17.0 (`.moon/toolchains.yml`) | **High.** Vite `^8`, Storybook and Playwright may need newer Node. **Verify** against Vite 8's engines before choosing: bump the toolchain, or hold Spectrum Studio to its own runtime. |
| Task runner | `pnpm` scripts | moon. Tasks live in `moon.yml`; projects are registered in `.moon/workspace.yml`; `inferTasksFromScripts: false` | Needs a `moon.yml`. Spectrum Studio has about 120 `test:*` scripts. Wrap them selectively. |
| Unit tests | `tsx tests/*.ts` scripts, plus Playwright e2e (105 specs) | `TOOLING_STANDARDS.md` requires AVA for all JS and TS tests | Policy conflict. Needs a decision (see section 6). |
| Commits | None enforced | commitlint, conventional commits, husky | Learn the format: `type(scope): description`. |
| Releases | None | changesets, `access: public` | Private package: keep it out of releases. **Verify** whether a changeset is needed for private packages. |
| CI | None | `.github/workflows/ci.yml` runs moon targets listed in `.github/ci-targets.json`. A guard job fails if a `runInCI` task is not listed there. | Every Spectrum Studio moon task needs a target category. |
| Formatting | Dense, long lines | Prettier defaults (no config found), remark for markdown | Needs a one-time format pass or an ignore. |
| AI resources | `.agents/` (rules, skills), symlinked as `.claude`, `.cursor`, `.codex` | Root `.ai/`; `pnpm ai:sync` generates `.github/instructions`, `.cursor/rules`; `.claude/` links to `.ai/` | Needs a mapping (section 5, Phase 4). |
| Agent workflow | Task list tool, `known-debt.md`, rule-stewardship blocks | Root `AGENTS.md` mandates **beads** (`bd`) for all task tracking, forbids markdown TODO lists, and requires `git push` at session end | Conflict. Needs an owner decision. |
| Inventory | n/a | `.ai/inventory.json` lists every project (audience, lifecycle, published) | Add an entry or `ai:check` fails. |

### Existing precedents to copy

`tools/component-options-editor` is the closest sibling: a private, active,
maintainer-audience authoring tool with its own `AGENTS.md`, `moon.yml`, build and
CI targets (`:test`, `:build`, `:validate`). Use it as the template for the
`moon.yml`, `package.json` and `AGENTS.md` shape. Its inventory entry is
`audience: maintainer`, `lifecycle: active`, `published: false`, `llms: false`.

## 4. Knowledge transfer: how Spectrum Studio relates to design-data

An agent working in the monorepo needs to know the following, because the move
changes which of these are separate and which are shared.

1. **Purpose.** Spectrum Studio is a parametric authoring tool that generates data
   following the Spectrum Design Data specification. Its direction is recorded in
   `docs/ROADMAP.md`. Its long-term goal (EPIC-7.4) is to become the authoring UI
   for this repository.
2. **Reference input.** Spectrum Studio reads `packages/design-data` (dataset) and
   `packages/design-data-spec` (specification) as a reference to compare against.
   The Analysis page, `scripts/design-data-vite.ts`, the loader, and the gap
   register all depend on that. Inside the monorepo these are workspace siblings,
   not a separate checkout.
3. **Pinned evidence.** Several things are deliberately frozen to specific
   revisions, and the move can break them silently:
   - Offline profile bundles under `src/data/design-data-*-profile/` (component,
     shadow, t-shirt), pinned to upstream commits.
   - `docs/design-data-pr-1454-review.md` is SHA-256 pinned (`PR-REVIEW-RECORD`)
     and watched by the Vite plugin. Do not edit, move or let a formatter touch it.
     `docs/design-data-target-contract.md` is also an evidence pin.
   - The gap register `src/data/design-data-gaps.json` cites archive doc paths
     and commits, and `scripts/check-design-data-gaps.ts` reads
     `docs/archive/design-data-alignment-gaps.md`. Moving or reformatting docs
     breaks those checks.
4. **Policy: differences are diagnostics.** Spectrum Studio must start and stay editable
   however its data differs from design-data. Do not convert alignment gaps into
   thrown errors or build gates, and do not add alignment lint gates to this
   repository (the working rules say those belong in the parent repo later, which
   is now this repo, so confirm with the owner before changing that).
5. **Already-proposed upstream work.** `docs/rfcs/` holds two proposals for
   design-data (`taxonomy-ownership-and-projections`,
   `classification-standard-and-migration`). The monorepo tracks RFCs in
   `docs/rfc-coordination.md` and proposals in `docs/proposals/`. Decide whether
   these RFCs move to `docs/proposals/` in the monorepo or stay with the package.
6. **Terminology mapping.** Spectrum Studio's concepts map to spec concepts: foundations
   and formulas have no upstream equivalent yet (proposed as portable authoring
   definitions); structures and taxonomy map to `packages/design-data` registry
   and name objects; mode sets map to `mode-sets/`; component assignments map to
   the CTR relationship format (`spec/relationship-format.md`). The
   `design-data-target-contract.md` document holds the authoritative detail.

## 5. Migration plan

### Phase 0: prepare this repo before copying

Do these in the Spectrum Studio repository, then commit.

1. Run `pnpm install` to refresh `pnpm-lock.yaml` after the IMS and `@adtech`
   removals. **Gate:** `grep -c "artifactory.corp" pnpm-lock.yaml` must be `0`.
   Also confirm whether the `@a4u` registry line in `.npmrc` is still needed
   (no `@a4u` package appears in the lockfile). If not, remove it.
2. Run `pnpm check:docs-index`, then `pnpm lint` and `pnpm build` once. Record the
   results as the baseline. Run the tests you rely on and note any already failing.
3. Confirm no secrets, tokens or internal hostnames in tracked files
   (`git grep -n -i "artifactory\|corp.adobe\|token\|secret"`).
4. Decide the open questions in section 6 that block Phase 1.

### Phase 1: import

1. In the monorepo, create a branch (for example `feat/spectrum-studio-import`).
   Do not work on `main`.
2. Copy to `packages/spectrum-studio/`, **excluding**: `.git`, `node_modules`,
   `dist`, `storybook-static`, `test-results`, `reports`, `.env.local`, `.npmrc`,
   `pnpm-lock.yaml`, `pnpm-workspace.yaml` (none exists), `.github/`
   (GitHub only reads the root `.github`), and `.DS_Store`.
3. Commit the raw copy **before changing anything** so the next commits show only
   deliberate edits. If the pre-commit hook reformats files, commit with
   `--no-verify` for this one import commit only, and say so in the message.
   Run the Prettier pass as its own commit later (Phase 5), or skip it with an
   ignore, per the owner's decision.

### Phase 2: make it build in the workspace

1. `package.json`: set `"name": "@adobe/spectrum-studio"`, `"private": true`,
   remove `packageManager` (the root owns it), keep `"type": "module"`. Remove
   the `pnpm` block.
2. Root `package.json` or `pnpm-workspace.yaml`: add `patchedDependencies` and the
   `overrides`. Move `patches/` to the repo root. Review each override for effect
   on other packages before merging. Prefer narrow selectors.
3. Run `pnpm install` at the monorepo root and commit the lockfile change.
4. Update the reference root. In `scripts/design-data-loader.ts`
   (`referenceRoot`) and `.env.example`, default to the monorepo root
   (`resolve(appRoot, "../..")`) instead of `../spectrum-design-data`. Keep
   `DESIGN_DATA_PATH` as an override. Confirm the git-based assessment code
   (`assessmentGitWatchPaths`, `design-data-assessment.ts`) works when the
   reference and the app share one git repository: it currently assumes a
   separate checkout whose revision it can pin. **Verify.**
5. Update path assumptions: `design-data-vite.ts` watches `packages/design-data`
   and `packages/design-data-spec` under the reference root, which still holds.
6. Run, from the package: `pnpm dev`, `pnpm typecheck`, `pnpm build`. Fix only what
   the move broke.

### Phase 3: register with moon and CI

1. Add to `.moon/workspace.yml`: `spectrum-studio: "packages/spectrum-studio"`.
2. Add `packages/spectrum-studio/moon.yml` modeled on
   `tools/component-options-editor/moon.yml`, with tasks for `typecheck`, `lint`,
   `build`, a **curated** `test` (not all 120 scripts at once), and optional
   `e2e` with `runInCI: false`. Set `layer: application`.
3. Add each CI-enabled task to `.github/ci-targets.json` under `node` (or
   `excludedFromCI`). The `ci-targets-guard` job fails otherwise.
4. Decide Node version (section 3) and, if bumping, do it as its own change with
   the other packages' tests as evidence.
5. Playwright and Storybook in CI need browsers installed. Start by keeping them
   out of CI (`runInCI: false`).

### Phase 4: agent resources and documentation

1. Add a `.ai/inventory.json` entry:
   `path: packages/spectrum-studio`, `kind: package`, `audience: maintainer`,
   `lifecycle: active`, `published: false`, `llms: false`.
2. Create `packages/spectrum-studio/AGENTS.md` from Spectrum Studio's current
   `AGENTS.md` (project instructions) and make `CLAUDE.md` only point to it, as
   the monorepo requires. Remove the commit-hook, Roadmap and path references that
   no longer apply. Keep the working rules (scope discipline, test scoping,
   alignment diagnostics, Changes parity).
3. Move the Copilot instructions into the monorepo's model: create
   `.ai/rules/spectrum-studio.md` with `description` and
   `globs: packages/spectrum-studio/**` frontmatter, then run `pnpm ai:sync`.
   Do not keep a package-level `.github/copilot-instructions.md`.
4. Decide where Spectrum Studio's 15 skills and rules live. Simplest first step: leave
   `packages/spectrum-studio/.agents/` in place and referenced by its
   `AGENTS.md`. Later, move skills to `.ai/skills/` with a `studio-` prefix so
   all tools find them. **Verify** that Claude Code and Copilot discover nested
   `.agents` content when started from the repo root; they may not.
5. Resolve the `bd` versus `known-debt.md` and task-list conflict (section 6).
6. Run `pnpm ai:sync` then `pnpm ai:check`. Fix drift. Never edit generated files.
7. Update this project's docs: `README.md` (paths, setup from the monorepo root
   with `pnpm install` and moon), and `docs/README.md` (the `check:docs-index`
   script keeps working only if paths stay relative to the package).

### Phase 5: verify and tidy

1. Run the Spectrum Studio baseline checks from Phase 0 and compare with the baseline.
2. From the monorepo root: `pnpm ai:check`, `pnpm moon run :test`, and the CI guard
   `node .github/scripts/check-ci-coverage.mjs`. Confirm other packages are
   unaffected, especially after any override or Node change.
3. Run `pnpm dev` and walk the smoke path: Foundations, Colors subpanel, Scale
   Editor, Evaluation view, the Analysis page loading the in-repo reference. Assert
   an empty `pageerror` list.
4. Format decision: either one `style: format spectrum-studio` commit, or add
   path ignores for Prettier and remark so the package keeps its style and the
   pinned docs stay byte-identical. The second is safer for the pinned evidence.
5. Open a PR using conventional commit titles. Add a changeset only if the
   monorepo requires one for private packages (**Verify**).
6. Archive the old repository (`NateBaldwinDesign/gestalt`) with a pointer to the
   new location.

## 6. Open questions for the owner

Answer these before or during Phase 1. Defaults in italics are what the plan
assumes if you do not decide.

1. **Package name and path.** *`packages/spectrum-studio`, `@adobe/spectrum-studio`.*
   Or should app packages live under `tools/` or `docs/` like the other apps?
   The root `AGENTS.md` and inventory treat `packages/` as mostly published data
   packages. Confirm that a private app belongs there.
2. **Node version.** *Raise the monorepo toolchain to a version Vite 8 supports,
   as a separate change.* Alternative: lock Spectrum Studio to its own runtime. Who owns
   that call?
3. **Test framework.** *Keep `tsx` scripts and Playwright inside Spectrum Studio, with an
   explicit exception to the AVA rule documented in its `AGENTS.md`.* Or migrate
   to AVA (large effort for about 120 scripts).
4. **Task tracking.** *Spectrum Studio keeps `docs/known-debt.md` and its working rules
   inside the package; the monorepo's `bd` rule applies to everything else.*
   Needs agreement from the monorepo maintainers, since the root says `bd` is
   mandatory for all task tracking.
5. **Formatting.** *Ignore the package in Prettier and remark.* Or reformat once.
6. **Roadmap and RFCs.** Does `docs/ROADMAP.md` stay package-local, and do the two
   RFCs in `docs/rfcs/` move to the monorepo's `docs/proposals/`?
7. **Copyright headers.** The monorepo uses `Copyright YYYY Adobe. All rights
   reserved.` headers on new files. **Verify** whether CI enforces them (the
   options editor has a `copyright` script) and whether Spectrum Studio's roughly 1,000
   tracked files need headers added.
8. **Public visibility.** Spectrum Studio's docs describe internal evidence and unreleased
   direction (taxonomy proposals, upstream gap analysis). Is that appropriate in a
   public repository, or should the package wait for an internal one?
9. **Internal dependencies.** Do you still need the `@a4u` icon packages or any
   other internal-registry dependency? Nothing public CI cannot install may remain.

## Agent prompts

Use these after copying and committing (Phase 1). Open the agent in
`/Users/nbaldwin/Git/spectrum-design-data`.

### Prompt A: integrate

> Read `packages/spectrum-studio/docs/migration-to-spectrum-design-data.md`
> and the monorepo's root `AGENTS.md`, `TOOLING_STANDARDS.md`, `.ai/README.md`,
> `.moon/workspace.yml` and `.github/ci-targets.json`. Then carry out Phases 2
> to 4 for `packages/spectrum-studio`. Do one phase at a time and stop after
> each for review. Do not change other packages, and do not edit files marked as
> pinned evidence. Where the plan says **Verify**, check and report the result
> before acting. List every decision from section 6 you needed and use the stated
> default only if I have not answered it.

### Prompt B: audit only

> Read `packages/spectrum-studio/docs/migration-to-spectrum-design-data.md`.
> Do not change any files. Audit the imported `packages/spectrum-studio` against
> the monorepo conventions and produce a gap report: what breaks, what violates a
> convention, and what is unverified. For each item give the file or setting,
> severity (blocks CI, blocks install, convention only), and the suggested fix.
> Run `pnpm install`, `pnpm ai:check`, and the CI coverage guard read-only if
> possible, and report their output.

I suggest running Prompt B first, then Prompt A with its report in hand.
