---
name: verify-change
description: Choose which checks to run, and when, after changing code in spectrum-studio. Use before running any test, lint, build, Playwright, or performance command, and when finishing an implementation plan. Maps changed paths to the narrowest covering check and sets rules for slow checks, browser smoke paths, and the final report.
---

# Verify a change

Goal: prove the change works with the smallest check that covers it. Slow
checks are the exception, not the default. Use `pnpm`, never `npm`.

## Before running anything

State one line: **what changed, which check covers it, why.** If no check
applies (docs, rules, comments), say so and run nothing.

## Tiers

| Tier | When | Checks |
| --- | --- | --- |
| 1. Targeted | After each meaningful edit | The affected `tests/*.ts` script from the map below. `pnpm typecheck` only if types, exports, schema or file moves changed |
| 2. Domain | When the domain's change is finished | The full domain row from the map (all scripts listed), plus `pnpm test:changelog` and `pnpm test:impact` if persisted design data changed |
| 3. Feature complete | Once, when the whole feature is done | `pnpm lint`. Add `pnpm build` only if build config, bundling, or data-vis inputs changed. One browser smoke path if the UI changed |
| 4. Slow, gated | Only if a trigger below applies or the user asks | Performance chains, Playwright suites, `test:data-vis`, `test:design-data-sdk`, `analyze:design-data`. Run each at most once, at the end |

`pnpm typecheck` = `check:category-icons` + `check:changelog-coverage` + `tsc` (app and node).
`pnpm lint` = `typecheck` + ESLint. `pnpm build` = `check:category-icons` + data-vis bundle build + `vite build`.

## Path to check map

| Changed area | Tier 1 and 2 checks |
| --- | --- |
| `features/color-system`, `panels/color-system`, `views/color-system`, `components/color-picker`, `components/palette` | `test:color-picker`, `test:color-output`, `test:custom-contrasts`, `test:polarity`, `test:contrast-multiplier`, `test:color-analysis`, `test:gray-defaults`, `test:palette` |
| `color-system/data-vis` (features, panels, views) | `test:data-vis-editors`, `test:data-vis-interpolation`, `test:sequential-defaults`; the full `test:data-vis` chain only at tier 4 |
| `features/tokens`, `panels/tokens`, `views/tokens` | `test:tokens`, `test:token-aliases`, `test:value-preview`, `test:primitive-references` |
| `features/taxonomy`, `panels/registry`, `views/registry` | `test:taxonomy`, `test:taxonomy-order`, `test:taxonomy-identity`, `test:taxonomy-sources`, `test:canonical-names`, `test:classification`, `test:registry-projection`, `test:taxonomy-projection` |
| `features/modes` | `test:modes`, `test:mode-combinations`, `test:mode-integrity`, `test:mode-ui` |
| `features/changelog`, `features/impact`, `features/edit-session` | `test:changelog`, `test:impact`, `test:component-impact`, `test:persistence`, `check:changelog-coverage` |
| `features/design-data`, `src/data/design-data-gaps.json`, `docs/design-data-gap-register.md` | `test:design-data-gaps`, `check:design-data-gaps`, `test:design-data`, `test:design-data-assessment`, `test:design-data-coverage`, `test:design-data-materialization`, `test:design-data-portable-contract`, `test:dimension-artifacts`, `test:shadow-artifacts`. Regenerate the register doc with `pnpm gaps:docs` |
| `features/scales`, `spacing`, `size`, `radius` | `test:scales`, `test:scale-library`, `test:spacing`, `test:size`, `test:radius`, `test:dimension-analysis` |
| `features/logic`, `panels/logic`, `components/logic` | `test:logic`, `test:logic-formulas`, `test:tshirt-sizing`, `test:tshirt-integration` |
| `features/typography`, `panels/typography`, `views/typography` | `test:typography`, `test:typography-tokens`, `test:typography-preview`, `test:typography-analysis`, `test:typography-reference` |
| `features/elevation` | `test:elevation`, `test:shadow-artifacts` |
| `features/structures`, `panels/structures`, `views/structures` | `test:structures`, `test:structure-elements`, `test:structure-references`, `test:structure-padding-icons`, `test:base-structure-defaults` |
| `features/components`, `panels/components` | `test:components` |
| Category icons, icon catalog | `check:category-icons`, `test:category-icons` |
| `src/data/design-system.*` defaults or schema | `test:defaults` (`pnpm schema:defaults` regenerates), `check:changelog-coverage` |
| Foundation creation, foundations panels | `test:foundation-creation` |
| Home page | `test:home-quick-links` |
| Layout-only views, panels, pages (no logic) | `pnpm typecheck`, plus the one Playwright spec for that surface |
| Storybook stories | the matching `tests/e2e/storybook-*.spec.ts` only, via `pnpm test:e2e:storybook` |
| Docs added, moved, renamed or archived | `pnpm check:docs-index` (every doc listed in `docs/README.md` or `docs/archive/README.md`, every index link resolves). Also `check:design-data-gaps` if a doc cited by the gap register moved |
| Rules, skills, other markdown | No tests |

Tests with no `package.json` script (run directly with `pnpm exec tsx tests/<file>.ts`): `color-scale-defaults`, `token-preview-controls`, `token-table-presentation`, `favicon`.

## Slow checks and their triggers

Run only when the trigger applies, or the user asks. Once, at the end.

| Check | Trigger |
| --- | --- |
| `test:prioritized-work` (19 scripts) | Workers, derived/prioritized work, virtualizer, transitions, code chunking, or authoring validation/persistence batching changed (`*.worker.ts`, `*Work.ts`, `features/code`) |
| `test:color-system` | Color scale generation, CSS library generation, or their workers changed |
| `test:data-vis` (builds a bundle, then 10 scripts) | Data-vis generation, export, or the data-vis build config changed |
| Playwright (`pnpm exec playwright test tests/e2e/<name>.spec.ts`) | A UI surface changed. Run the one spec for it, never the whole folder. Config starts `pnpm dev` itself |
| Storybook e2e | A story or the component it covers changed |
| `test:design-data-sdk`, `analyze:design-data` | Only when the user asks. They need the reference checkout (`DESIGN_DATA_PATH`) |

## Browser smoke paths

- Color-system changes: open Foundations, open the Colors subpanel, open the Scale Editor, open the Evaluation view, exercise any changed comparison or output control. The existing `tests/e2e/color-system-smoke.spec.ts` covers this.
- Any other UI surface: open the changed surface, perform the changed interaction once.
- Every smoke path collects `pageerror` events and asserts the list is empty. Typecheck and build do not replace this.

## Rules

- Do not re-run a passing check without a code change.
- After a failure, re-run only the failing check.
- Do not "validate" by re-reading code. Run a named check or say none applies.
- Do not run `pnpm build` to check types. Use `pnpm typecheck`.
- If a command seems slow, say so and ask before repeating it. Timings have not been measured yet; record them here when the user shares them.
- When a check fails, first find out whether it also fails at the last commit, before trying to fix it. Extract HEAD into a scratch folder outside the repo (`git archive HEAD | tar -x -C <scratch>`, then link `node_modules`) and run the same check there. If it fails identically, it was already failing: do not change code to fix it. Report it, with the check name, the error, and what you learned, and ask the user whether to investigate. Never use `git stash`, `git checkout`, or a reset to test this; the working tree and stashes may hold the user's unfinished work.
- Never fix a failing check by updating a pin, fingerprint, or snapshot. See `authoring-lifecycle` and `design-data-contract`.

## Final report format

```
Checks run: <command> - pass/fail (one line each)
Checks skipped: <command> - <reason> (one line each)
```
