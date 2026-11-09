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

Browser testing is not required merely because UI code or a story changed.
Prefer non-browser checks. If browser evidence is needed, use the smallest
isolated Storybook check that covers the behavior. Common input, focus,
keyboard, menu and layout checks must not run against app pages.

Before testing an actual app page in any browser, ask the user for permission.
Explain the behavior to verify, why an isolated story cannot cover it and the
proposed scope. This includes Playwright, browser canvas actions and manual
inspection. General approval to implement or verify is not permission to test
app pages. Without an explicit answer, skip that check and state the gap.

Follow the search and resource limits in `AGENTS.md`, Working rule 3. Search
only Studio and, when needed, `packages/`; exclude dependency, vendor, cache,
generated-output and report directories. Default to one scoped search and
one resource-heavy job at a time. The task-wide ceiling is 10 concurrent
ripgrep processes, including delegated work; shell `rg` uses `--threads 1`.
Browser runners use `--workers=1`. Do not run builds, tests, type checks or
baseline preparation concurrently.

## Tiers

| Tier | When | Checks |
| --- | --- | --- |
| 1. Targeted | After each meaningful edit | The affected `tests/*.ts` script from the map below. `pnpm typecheck` only if types, exports, schema or file moves changed |
| 2. Domain | When the domain's change is finished | The full domain row from the map (all scripts listed), plus `pnpm test:changelog` and `pnpm test:impact` if persisted design data changed |
| 3. Feature complete | Once, when the whole feature is done | `pnpm lint`. Add `pnpm build` only if build config, bundling, or data-vis inputs changed. A focused Storybook browser check only if needed; app checks require explicit permission |
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
| Layout-only views, panels, pages (no logic) | `pnpm typecheck`; a focused Storybook check only if browser evidence is needed. Ask before any app-page check |
| Storybook stories | Non-browser checks first; if needed, select only affected stories in the matching `tests/e2e/storybook-*.spec.ts`, with `--workers=1` |
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
| App-page Playwright | Only after explicit user permission, with a rationale for why an isolated story cannot cover the behavior. Run only the approved scenario, with `--workers=1`; the config may start `pnpm dev` |
| Storybook e2e | Changed behavior needs browser evidence that non-browser checks cannot provide. Run only affected stories, with `--workers=1`, not the whole suite |
| `test:design-data-sdk`, `analyze:design-data` | Only when the user asks. They need the reference checkout (`DESIGN_DATA_PATH`) |

## Browser scope

- Use isolated stories for basic interactions and rendering. Do not repeat
  their coverage on app pages.
- App-only integration, such as routing or saved state across reload, may
  justify requesting permission. It does not authorize running the check.
  Explain why the specific integration cannot be covered in a story.
- Stay within the approved scenario. Do not expand to other pages, viewport
  matrices or the full suite.
- Collect `pageerror` events in any browser check that is run. Skipping an
  unnecessary or unapproved browser check is not a completion failure.

## Rules

- Do not re-run a passing check without a code change.
- After a failure, re-run only the failing check.
- Do not "validate" by re-reading code. Run a named check or say none applies.
- Do not run `pnpm build` to check types. Use `pnpm typecheck`.
- If a command stalls or the device becomes sluggish, stop task-owned work, report it and ask before retrying. Do not add concurrent jobs or retry while the user is unavailable.
- When a check fails, compare against the last commit in the cheapest scoped way before changing unrelated code. Do not automatically copy the repository, start more servers or run broad baseline checks. Ask before expensive baseline work; app-browser permission still applies. If confirmation is unavailable, report that the baseline is unconfirmed. If the failure is pre-existing, report the check and error and ask before investigating or fixing it. Never use `git stash`, `git checkout` or a reset to test this; the working tree and stashes may hold the user's unfinished work.
- Never fix a failing check by updating a pin, fingerprint, or snapshot. See `authoring-lifecycle` and `design-data-contract`.

## Final report format

```
Checks run: <command> - pass/fail (one line each)
Checks skipped: <command> - <reason> (one line each)
```
