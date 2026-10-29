# Spectrum Studio

A parametric design-systems authoring tool for **Adobe Spectrum design data**. It is a systems design tool, not a token editor: designers author a design system as formulas, parameters, modes and rules, and the system generates the data. There is nothing else like it in the industry. It is built for the needs of Spectrum, an enterprise design system that is multi-platform, multimodal and adaptive (end users adjust contrast, text size, density and more).

All output is data that follows the **Spectrum Design Data specification** (the `design-data` project), for use in every Adobe product. The goal is a one-stop, end-to-end editing experience: foundations, modes, tokens, semantic structure, rules, components, platforms, review and release, all in one place. See [docs/ROADMAP.md](docs/ROADMAP.md).

How it works in brief: designers define **foundations** (color, typography, spacing, size, radius, elevation, motion) as formulas with parameters. These generate **primitive tokens**. **Modes** override parameters, and some parameters are exposed as end-user adaptive controls. Structures, a shared taxonomy and rules then produce semantic tokens. Because every value comes from a system, a change to one parameter propagates predictably, and manual overrides stay visible and revertible.

The tool codifies systems-design best practices: **modularity, reusability and composability**, from primitive tokens through semantic tokens and structures to components. New work should extend that chain by reusing and composing existing pieces (formulas, scales, modes, structures, option groups, taxonomy terms) rather than adding one-off values or parallel concepts.

The stack (React, Vite, React Spectrum S2) is an implementation detail. What matters is the systems model.

## Monorepo context

This package lives at `docs/spectrum-studio` in the `adobe/spectrum-design-data` monorepo. It is private (`@adobe/spectrum-studio`, never published) and is ignored by changesets. The root `AGENTS.md` rules apply here (pnpm only, moon for tasks, conventional commits, a `Copyright YYYY Adobe. All rights reserved.` header on new files). These package-level exceptions are deliberate:

- **Tests:** this package keeps `tsx` check scripts (`tests/*.ts`) and Playwright instead of AVA (see the package exceptions in the root `TOOLING_STANDARDS.md`). Only the checks listed in the `test:ci` script run in CI. Checks that fail today are tracked in `docs/known-debt.md` (DEBT-030 to DEBT-033).
- **Task tracking:** debt stays in `docs/known-debt.md` (Working rule 5), not in beads (`bd`). The root `bd` rule applies to monorepo-level work.
- **Reference data:** the design-data reference is the monorepo itself (`packages/design-data`, `packages/design-data-spec`). `DESIGN_DATA_PATH` overrides it to compare against another checkout.
- **Moon tasks:** `moon run spectrum-studio:typecheck`, `:build` and `:test` run in CI. `:lint` (ESLint), `:dev`, `:e2e` and `:e2e-storybook` are local only.
- **Node:** the monorepo toolchain pins Node 22.12.0 (Vite 8 needs `^20.19.0 || >=22.12.0`).

## Start here (new to this project)

**Domain map** (where to look, and which skill to read first):

| Area | Code | Skill |
| --- | --- | --- |
| Foundations (color, typography, spacing, size, …) | `src/features/<foundation>/`, `src/panels/foundations/` | `color-system`, `data-vis`, `formula-engine` |
| Formulas, interpolations, rules | `src/features/logic/`, `src/features/scales/`, `src/pages/logic/` | `formula-engine` |
| Modes and adaptive controls | `src/features/modes/` | `modes` |
| Tokens | `src/features/tokens/`, `src/pages/Tokens.tsx` | `tokens` |
| Taxonomy and naming (Registry) | `src/features/taxonomy/`, `src/pages/Registry.tsx` | `taxonomy-vocabulary` |
| Structures | `src/features/structures/`, `src/panels/structures/`, `src/views/structures/` | `structures` |
| Typography | `src/features/typography/`, `src/panels/typography/`, `src/views/typography/` | `typography` |
| Elevation | `src/features/elevation/`, `src/panels/elevation/`, `src/views/elevation/` | `elevation` |
| Saving, Changes, Impact | `src/features/changelog/`, `src/features/impact/`, `src/features/edit-session/` | `authoring-lifecycle` |
| Alignment with design-data, Analysis page | `src/features/design-data/`, `src/data/design-data-gaps.json` | `design-data-contract` |
| UI, components, previews | `src/components/`, `src/panels/`, `src/views/` | `component-catalog` |

**Data flow:** foundation formulas → primitive tokens (per mode) → code export and previews. Preview, tokens and export all read from the same generator. Edits are tracked by the change log and counted in Impact.

**Principles that most often affect a contribution** (the full set is in the roadmap):

1. System-first: values come from formulas and rules. Manual overrides must stay visible and revertible.
2. Modular, reusable, composable: define once, reference everywhere. Prefer composing existing primitives, formulas and terms over duplicating or special-casing.
3. One generation path: do not build a second way to compute a value for a preview.
4. Differences from design-data are shown as diagnostics. They never block loading or editing (Working rule 2).
5. Any change to persisted design data must keep Changes parity (see Cross-component validation).

### How to guide a contributor

When a contributor states a goal, **before writing code**:

1. Map the goal to the domain map above. Read the matching skill and the matching section of [docs/known-debt.md](docs/known-debt.md).
2. If it fits a roadmap initiative or epic, name it (for example "this is part of EPIC-1.3 Spacing") and follow Roadmap alignment below.
3. Reply in a few sentences: what the goal touches, the recommended approach in this codebase, the constraints that apply (changelog parity, gap register, tests), and anything related that already exists and should be reused.
4. Offer alternatives only when there is a real trade-off. Ask only what you cannot determine from the code or docs.
5. If the goal conflicts with a principle or open decision in the roadmap, say so.

Do this once per goal, not at the start of every session. If the contributor's request is small and specific, skip the orientation and just do it within the rules below. Do not summarize this file back to the contributor.

---

## Working rules (apply to every task)

### 1. Scope discipline

- Build only what the user asked for. Do not add UI chrome, helper or empty-state text, badges, summaries, extra columns, extra data, settings, or copy that was not requested.
- Plans separate **Requested** from **Proposed additions**. Proposed additions are listed as suggestions and are not built unless the user approves them.
- Labels, wording, and data shown in the UI come from the request, existing project content, or the content guidelines. Do not invent them.

### 2. Differences from design-data are diagnostics, never failures

- The app must start, load, render, and stay fully editable however its data differs from design-data. In `pnpm dev`, nothing may refuse to load or disable editing because of divergence.
- Report a difference as an issue the user can see (what, where, severity, suggested fix). Do not report it with a thrown error, a disabled control, or a blank view.
- Do not add `throw` or `assert*` calls that run at module load, or on stored or authored data, because of differences from the reference. Reference-derived checks belong in tests and scripts, which may fail. Unreadable data (for example corrupt JSON) may fall back to defaults only if the app says what was set aside.
- Existing module-load asserts on shipped data (`src/data/defaults.ts`, `src/features/taxonomy/standardContract.ts`) check the app's own integrity, not the reference. They predate this rule; do not copy that pattern for reference differences. Browser storage is temporary during development: do not build backup or recovery for it. `src/features/edit-session/storage.ts` still blocks saving after a failed restore until Reset all; do not change it without the user's approval.
- Classify new or changed data against design-data: **New** (app only; an upstream candidate, never a blocker), **Missing** (reference has it, app does not; a delta to close), **Inconsistent** (both have it and it differs; fix it or record it as an intentional policy), or **Aligned**. Link or add the gap entry as described in Cross-component validation below.
- Lint and build gates for design-data alignment belong in the parent design-data repository later. Do not add them here.

### 3. Test scoping

- Before running any test, say in one line what changed, which check covers it, and why.
- Start with the narrowest check: the affected `tests/*.ts` script, then `tsc`. Run `pnpm lint` and `pnpm build` once when a feature is complete, not after every edit. Use the `verify-change` skill to pick checks.
- Playwright (`tests/e2e`), performance and long chains (`test:prioritized-work`, `test:color-system`, `test:data-vis`) run only when the change touches what they cover or the user asks. Run each at most once, at the end.
- Do not re-run a passing check without a code change. Do not "validate" by re-reading code; run a named check or say none applies.
- When a check fails, first confirm whether it also fails at the last commit (see `verify-change`). If it was already failing, report it and ask before fixing it. Never use `git stash`, `git checkout`, or a reset to find out.
- The final message lists the checks run (with results) and the relevant checks skipped (with the reason).

### 4. Rule stewardship

After finishing a feature, check whether it introduced a new pattern, component, or convention; hit a repeated mistake; or showed that a rule, skill, or this file is missing, wrong, or stale. Also check for drift in the places agents rely on: a doc added, moved, or archived without updating `docs/README.md` or `docs/archive/README.md` (run `pnpm check:docs-index`), a new or renamed component missing from `component-catalog`, and a new domain missing from `authoring-lifecycle`. If so, end the final message with a **Rule suggestions** block of at most three items. Each item names the file, the proposed change, and the evidence from this task. Do not edit or create any rule, skill, `AGENTS.md`, or `docs/ROADMAP.md` without the user's explicit approval. If there is nothing evidence-based to suggest, say nothing.

### 5. Surface and resolve debt

- Whenever you find a gap, debt, redundancy or inconsistency in the code, rules or docs, tell the user in one line: what, where, and whether it relates to the current task.
- Read the matching section of [docs/known-debt.md](docs/known-debt.md) before work in an area. If the task touches an item there, say so in the plan.
- If the item is directly related to the work, include fixing it in the plan as a **Proposed addition** (Working rule 1) and ask before doing it. Do not fix unrelated items or fix anything without the user's answer.
- Add newly found items to `docs/known-debt.md` (with the user's approval, as for other rules and docs). When an item is fixed and its check passes, remove it from the register. Mention each item at most once per task.

## Roadmap alignment (IMPORTANT)

This project is a design system authoring tool with a long-term roadmap in [docs/ROADMAP.md](docs/ROADMAP.md) (initiatives `INIT-n`, epics `EPIC-n.m`).

Before planning or implementing any feature:

1. Read `docs/ROADMAP.md`, including its guiding principles and open decisions.
2. If the request fits an initiative or epic, name it (e.g. "this is part of EPIC-5.1 Rule model").
3. Before building, ask the user which approach to take:
   - **Forward-compatible minimum:** fulfill the request so it doesn't block the larger feature.
   - **Architecture slice:** build the part of the larger feature's architecture that the request needs.
4. If the request conflicts with a guiding principle or an open decision, say so instead of choosing silently.
5. Never implement an initiative or epic beyond what was requested.
6. Suggest roadmap status updates when work finishes. Only edit `docs/ROADMAP.md` with the user's approval.

## Where to find things

Docs: start at [docs/README.md](docs/README.md). Never load `docs/archive/` unless the user names a file in it. The design-data gap register (`src/data/design-data-gaps.json`) is the source of truth for alignment status.

Rules in `.agents/rules/` are not loaded automatically by every tool. Read the ones that match the task before starting:

| Rule | Read it when |
| --- | --- |
| `s2-general.mdc` | Any UI work: sentence case, WCAG 2.2 AA, S2 patterns |
| `spectrum-content-guidelines.mdc` | Writing UI text the user asked for |
| `icons.mdc` | Using or adding icons |
| `storybook-stories.mdc` | Creating or reviewing stories (ask for approval first) |
| `changelog-parity.mdc` | Any change to persisted design data |
| `code-verification.mdc` | Verifying changes (aligned with Working rule 3 and the `verify-change` skill) |
| `build-vite.mdc` | Build or bundler configuration |
| `generate-prd.mdc` | Only when the user asks for a PRD |
| `react-spectrum-charts-helper.mdc` | Only for `@adobe/react-spectrum-charts` work (5,000+ lines; do not load otherwise) |
| `security-global/`, `security-lang/` | Managed security set. Follow `security-global-base.mdc` and pull in specific files as relevant |

Skills in `.agents/skills/` load on demand. Read the matching one before starting:

| Skill | Read it when |
| --- | --- |
| `verify-change` | Before running any test, lint, build, Playwright, or performance command, and when finishing a feature |
| `component-catalog` | Adding or editing any UI: fields, previews, cards, loading, toasts, mode or color controls |
| `authoring-lifecycle` | Adding or changing persisted, editable design data (foundations, collections, token sources): saving, Changes, Impact |
| `design-data-contract` | Anything that may differ from design-data: taxonomy, tokens, modes, schema, outputs, the gap register, the Analysis page |
| `modes` | Mode sets, modes, mode parameters, bindings, text scaling, color scheme or contrast, per-mode token values, mode selection or preview |
| `tokens` | The Tokens page or browser, token generation sources, names and identity, per-mode token edits, aliases, cascade export |
| `color-system` | Color scales, stops, contrast steps, surfaces, palette, polarity, color output, CSS color library, color picker, Scale Editor, color evaluation (data-vis scales have their own skill) |
| `data-vis` | Sequential, diverging or categorical data-vis color scales, categorical suggestions, the data-vis adapter bundle (`build:data-vis`), or any file the adapter imports |
| `formula-engine` | The Logic page; formulas (scale types), custom expressions, interpolations, bindings on scales, rounding, scale-naming or t-shirt-sizing rules, the dimension-scale engine for spacing, size and radius |
| `taxonomy-vocabulary` | The Registry (taxonomy): token names and classification, categories and terms, how foundations name sources, term contributions, the proposed classification standard, size and variant vocabulary |
| `color-management` | Any code that parses, converts, gamut-maps, formats or compares colors; color picker controls, swatches, color-relative UI or visualizations |
| `structures` | Structures (layout scaffolds): slots, template elements, reusable Structure references, T-shirt rule applications, generated semantic layout tokens, the Structure editor, preview and permutations |
| `typography` | Typography: type scale, text zoom, line heights, icon sizing, typography tokens and names, the rem CSS export, the Typography panel and its views, component size |
| `elevation` | Elevation: shadow layers and levels, Depth and shadow color, per-mode shadow opacities, elevation tokens and CSS, the Elevation panel and its views |
| `web-accessibility-checker` | Accessibility review |

## Commands

Run these from `docs/spectrum-studio`, or from the repo root with `pnpm --filter @adobe/spectrum-studio <script>`.

- `pnpm dev` - Start dev server (HTTPS)
- `pnpm build` - Production build
- `pnpm lint` - TypeScript + ESLint
- `pnpm test:ci` - The curated checks that run in CI

## Architecture

- **Client-only application** - No backend/server code; hosted on an internal deployment platform
- Entry: src/main.tsx → src/App.tsx
- UI: React Spectrum S2 only (import from @react-spectrum/s2)

## Source organization

- `src/pages/` composes page-level layouts and connects page navigation, panels, and main-content views.
- `src/views/` contains content rendered in a page's main area, including Elements, Preview, and Code views. Group domain-specific views in subfolders such as `views/color-system/` and `views/typography/`.
- `src/panels/` contains focused editing surfaces and controls, including SubPanel content. Keep authoring forms and configuration controls here rather than in `views/`.
- `src/components/` contains generic reusable UI and application chrome that is not a page's main-content view. Do not place `ViewSwitcher` or a domain-specific sample application here.
- `src/features/` owns domain models, state, calculations, and generation logic; keep presentation-specific view components in `views/`.
- `src/assets/` contains static assets such as images, fonts, and other imported media.
- Reusable domain visualizations that are explicitly shared with an editing panel (for example, `ContrastRamp`) stay with their domain under `views/`; panels import them rather than duplicating visualization logic.
- When adding a file, classify it by responsibility and where it is rendered, not only by the page that currently imports it. Update all imports when moving a module and keep colocated styles beside their view.

## Key Rules

- Use sentence case for all text (not Title Case)
- Follow S2 design system patterns (see .agents/rules/)
- Vite only (no webpack/parcel)
- Before creating a new unique component, ask the user whether they want a Storybook story for it.
- Do not create a story without user approval. When approved, follow `.agents/rules/storybook-stories.mdc` and include focused visual states and interaction coverage.

## Cross-component validation

Step-by-step procedures: `authoring-lifecycle` (persistence, Changes, Impact) and `design-data-contract` (gap register, alignment). The policy below stays authoritative.

- Every feature that changes persisted design data must maintain Changes parity.
  Register its domain and nested fields in the shared change-log contract, assess
  working-versus-shipped comparison and scoped impact denominators, and provide
  validated source/generated reset capabilities or a specific unsupported reason.
  Add mutation, add/remove, exact-count, lifecycle and reset tests. Run
  `pnpm check:changelog-coverage` and affected Changes/impact checks. Follow
  `.agents/rules/changelog-parity.mdc`; do not introduce separate handwritten
  counts, baselines, or silent unavailable-to-zero fallbacks.

- Relevant taxonomy/model/token/export changes must link an existing stable gap ID in `src/data/design-data-gaps.json` or add a separately scoped entry. Record direction, owner, pinned profile/revision, acceptance criteria, evidence/check IDs, blockers and remaining limitations. Keep implementation, alignment disposition and RFC state separate.
- Assess saved/shipped baselines and scoped concept/mode-value denominator effects before changing gap status. Working previews are provisional; unrelated counts, equal values and Cartesian evaluation samples cannot close a gap. Missing or stale reference evidence must remain unassessable. Manual architecture/RFC acceptance requires an explicit review record.
- Run `pnpm test:design-data-gaps` for register/check changes. JSON, Markdown, CLI and Analysis must consume the canonical register and the existing comparison/coverage owners, not independent handwritten closure statuses.

- Product preset defaults (EPIC-2.5) are distinct from modes and themes. `componentSize` lives in typography only temporarily; when touching component size, product defaults, or t-shirt size rules (EPIC-5.1), keep that dependency intact and flag it rather than adding new product-default fields elsewhere.
- When planning any new editable foundation, token, mode, or other domain, evaluate its saved-change baseline, change-log source and token impact counts, system-wide token-concept and mode-value denominators, generated vs. manual classification, revert behavior, and browser coverage. Do not include untracked domains in the impact percentage or count temporary previews as saved edits.
- Component impact is implemented (`src/features/impact/componentImpact.ts`): the share of all component assignments whose effective value changed. A new foundation reaches it only through `componentTokenCatalog` (`src/features/components/references.ts`). The Motion foundation is not implemented (no Motion data or snapshot key). Do not claim a new domain has full impact coverage unless its changelog domain, impact source, token feed, and component feed exist and are tested.
- When changing shared color-system math, formatters, state, or utility imports, run the directly affected unit checks and at least one browser interaction test for every consuming UI surface.
- For color-system changes, the minimum browser smoke path is: open Foundations, open the Colors subpanel, open the Scale Editor, open the Evaluation view, and exercise any changed comparison/output control.
- Every browser smoke path must collect `pageerror` events and assert that the list is empty. A successful typecheck or build does not replace this check because missing imports and render-time dependency failures can pass compilation.
