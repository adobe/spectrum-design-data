# Internal architecture audit

## Status and method

Recorded on 2026-10-05 before application restructuring. This is the internal
review required by [the execution plan](architecture-alignment-plan.md).
Upstream compatibility is evaluated separately, after this document.

The audit inventories all tracked maintained areas, parses every tracked source
TypeScript file, traces representative owning boundaries, runs existing unit
checks, and exercises representative browser workflows. It is not a proof that
every function is correct, a full accessibility/security certification, or an
exhaustive browser test run. Recommendations require the plan's approval gate.

The initial worktree contained user edits in `src/components/ChangelogPanel.tsx`
and its CSS. They were not changed. Results describe that starting worktree,
not an untouched upstream checkout.

Approved A-C remediation is now implemented. Original findings and baseline
results below remain the pre-change evidence, not current verification failures.
See the [implementation handoff](architecture-alignment-plan.md) and
[gap completion record](design-data-alignment-gaps.md) for changes, checks, and
the approved D/E implementation and remaining acceptance boundaries. The original
audit exit and approval recommendations below are historical, not current gates.
The later [joint target-contract proposal](../design-data-target-contract.md) and
[draft taxonomy PR review](../design-data-pr-1454-review.md) supplement this audit with
separate SDK/spec/app/target evidence. They identify projection/materialization,
taxonomy ownership, and portability assumptions to revisit; no runtime rewrite,
storage migration, or extension of this original coverage ledger is claimed.

The approved taxonomy slice is tracked separately in the source-controlled
[canonical gap register](../design-data-gap-register.md) and the
[local RFC draft](../rfcs/taxonomy-ownership-and-projections.md). These distinguish
local implementation from alignment acceptance and upstream adoption; this
historical audit is not a new acceptance record.

## Coverage ledger

Counts use `git ls-files` before adding audit documents. Generated output,
dependencies, local credentials, and ignored configuration are excluded from
authored-code review. Tracked result/configuration artifacts are accounted for,
not treated as domain data.

| Area | Inventory and review disposition |
| --- | --- |
| Source | 320 tracked files; all 293 source TS/TSX files parsed for imports, ownership, storage calls, and repeated named-function bodies |
| Tests | 51 tracked files; 342 TS/TSX files parsed across source, tests, and Storybook; package scripts, standalone assertions, fixtures, and browser helpers distinguished |
| Domain features | 104 files across 14 domains; defaults, storage, generators, integrity checks, saved-state registration, and interoperability boundaries traced |
| Components | 87 files; generic chrome, domain editors, stories, picker math, and markup/execution boundaries identified |
| Panels and views | 36 panel files and 41 view files; owning composition, domain adapters, lazy views, and generator consumption reviewed structurally |
| Pages | 11 files; page registry and navigation traced; planned placeholders retained as intentional until roadmap changes |
| State | Eight files; persisted envelope, view-state separation, namespace, write queue, and edit-mode ownership reviewed |
| Contexts and utilities | Three context and four utility files; IMS singleton/provider readiness, icon markup, and chrome helpers identified |
| Data and assets | Two data files and four SVG assets; JSON/default-loader structure reviewed; assets excluded from numeric/model refactoring |
| Styling and icons | CSS/import ownership and 16 icon files inventoried; S2/RAC/raw-token integration identified; no visual redesign or asset deletion recommended |
| Build and tooling | Package scripts, TS project references, ESLint configs, Vite, Playwright, Storybook, package-manager metadata, and local workspace configuration reviewed |
| Instructions and docs | 39 tracked `.agents` entries, instruction aliases, root guidance, README, roadmap, and four existing docs inventoried; applicable ownership/verification rules reviewed |

The 14 feature groups are: changelog (2), color-system (14), edit-session (1),
foundations (2), impact (13), insights (3), logic (13), modes (15), platforms (1),
scales (10), size (4), spacing (4), tokens (14), and typography (8).

Fourteen strict JSON files parsed successfully. The two TS configuration files
use JSONC and pass TypeScript's configuration parser; comments are not a data
error. Do not validate JSONC with plain `JSON.parse`.

## Current architectural decisions

| Decision | Evidence and consequence |
| --- | --- |
| Client-only React/Vite application | `src/main.tsx`, `src/App.tsx`, and `vite.config.ts`; no production report backend may be added implicitly |
| S2 application chrome and authoring surfaces | `src/App.tsx`, pages, panels, and views; some source also imports RAC primitives and raw Spectrum CSS tokens, which require contextual review rather than automatic replacement |
| Feature-owned domain state | 96 direct `jotai` import sites in the static scan; models, state, and calculations predominantly stay in `src/features/` |
| Shared persistence | `src/state/persist.ts`; namespace `leonardo:v1`, version/data envelopes, optional migrations, debounced idle writes, lifecycle flush, nonfatal storage errors |
| Shared dimension generation | Spacing and size use `generateDimensionScale` and `createDimensionFoundationState`; their thin adapters are legitimate specialization, not needless duplicate engines |
| Shared formula/rounding vocabulary | Logic/scales/foundations own reusable definitions and evaluation; exact typography rounding behavior is intentionally preserved |
| Explicit edit-session baseline | `src/features/edit-session/state.ts`; persisted snapshot v4, Save refreshes the baseline, Cancel restores captured domains |
| Separate saved token projection | `src/features/tokens/browserSavedState.ts`; uses snapshot/default fallbacks and domain generators; Analysis must reuse this distinction |
| App-owned shipped dataset | `src/data/design-system.defaults.json` declares local authoring data, not a design-data export; `DesignSystemDataset` is a local interface |
| Multiple token representations | Lightweight color tokens, generic browser records, mode-aware export rows, override maps, and generated foundation values have separate contracts |
| Sample Home insights | `src/features/insights/state.ts` imports fixtures; do not label those metrics as a live dataset comparison |
| Central page composition | `src/pages/BrowsingContext.tsx` routes Home plus nine other page keys; a dedicated Analysis page should extend this convention |

No feature-to-page/panel/view/component import was found in the resolved local
static import graph. That is a useful boundary to preserve. It does not mean
every dependency is acyclic or every domain editor is correctly located.

## Findings and recommended slices

### AUD-001: application type checking is not an effective required gate

Priority: high. Confidence: confirmed.

`package.json` runs `tsc --noEmit && eslint .`. The root `tsconfig.json` has an
empty files list and project references. Direct application checking reports 49
errors, while the root invocation reaches ESLint without catching those errors.
Vite's checker is enabled for development serving, not the production build.

Check: `pnpm exec tsc --project tsconfig.app.json --noEmit --pretty false`.
Errors include S2 prop mismatches and color-coordinate tuple types, not just
unused imports. Do not suppress the errors to make the gate green.

Recommendation: approve a distinct validation slice that checks app and tooling
projects explicitly and repairs the relevant current errors. Keep it separate
from model alignment and preserve user edits.

### AUD-002: shipped defaults reference a nonexistent schema

Priority: high for validation/reporting. Confidence: confirmed.

The dataset's `$schema` is `./design-system.schema.json`, but no such file exists
next to `src/data/design-system.defaults.json`. The loader uses
`freezeDeep(dataset as DesignSystemDataset)`; a cast and freezing do not establish
runtime conformity.

Check: resolve the JSON `$schema` relative to the dataset and test its existence;
inspect `src/data/defaults.ts`. Domain validators do not replace a root dataset
contract.

Recommendation: define and validate an explicit app authoring-dataset contract,
then document its relationship to supported export formats. Do not relabel the
authoring JSON as an upstream dataset without validation.

### AUD-003: shipped default data is split between JSON and code

Priority: high for complete reports. Confidence: confirmed.

The JSON contains foundations, mode sets, platforms, adaptive claims, overrides,
rules, and interpolations. `SCALE_TYPE_DEFAULTS` in
`src/features/scales/scaleType.ts` separately defines typography, spacing, and
size formulas. There is no `scaleTypes` entry in the dataset or its interface.

Check: importing both defaults sources confirms three code-authored formulas
that a JSON-only report would omit. Defaults, generation, edit snapshots, and
revert all consume these definitions.

Recommendation: make the complete default contract explicit before reporting.
Either centralize definitions without behavior drift or provide one documented,
validated composition loader. Include locked/hidden/migration fallbacks as
separate categories, not ordinary shipped concepts.

### AUD-004: platform validation allows ambiguous identities

Priority: medium. Confidence: confirmed.

`isPlatformList` in `src/features/platforms/state.ts` accepts duplicate IDs and
empty IDs. `resolvePlatforms` chooses the first matching ID and silently removes
unresolved IDs. This loses evidence a comparison report needs.

Check: `isPlatformList([{id:"web",name:"Web"},{id:"web",name:"Other"}])`
and a single empty-ID record both return true.

Recommendation: validate nonempty unique identities and return/report dangling
references at the comparison boundary. Investigate authored-data compatibility
before changing runtime fallback behavior.

### AUD-005: exact repeated implementations can drift

Priority: medium. Confidence: confirmed body equality; extraction needs review.

TypeScript AST inspection found three repeated named-function bodies:

- `writeReferences` in changelog state and logic state.
- Default-mode lookup in modes model and cascade export.
- `isBindingRecord` in shared dimension foundations and typography model.

Recommendation: use the existing mode helper and choose appropriate shared
owners for binding validation and reference writes. Preserve type predicates and
setter semantics. Run logic, modes, spacing, size, typography, and revert checks
according to the actual consumers of each extraction.

### AUD-006: mode/foundation dependency cycles complicate reuse

Priority: medium architecture risk, not a confirmed runtime failure.

Resolved non-type-only imports contain cycles through color state, mode selection,
mode preview, foundation documents, and typography state, plus selection/preview
mutual imports. Representative browser tests pass today.

Recommendation: distinguish pure resolution functions from Jotai orchestration
when approving the comparison engine. Move the smallest needed pure contract,
not every mode module. Verify module initialization and all affected UI consumers.

### AUD-007: some assertion tests are outside package-script discovery

Priority: medium. Confidence: confirmed.

`tests/changelog.ts`, `tests/impact.ts`, `tests/typography.ts`, and
`tests/typography-tokens.ts` have no direct package command. Direct invocation of
the changelog test fails at its dark-background assertion: 304 affected color
concepts versus 310 expected. The other three pass.

The failed assertion assumes every color concept changes; the current browser
collection also includes palette concepts. Whether this is a stale assertion or
an accounting defect remains unresolved. Do not change expected counts merely
to pass the test.

Recommendation: inspect category/concept classification and the six unaffected
records, then approve a targeted repair and a discoverable test command. Fixture
helpers are not standalone assertion suites and should not be invoked as such.

### AUD-008: old adapters/configuration and domain editors need disposition

Priority: low, verification required before deletion or moves.

The source-only graph found 41 files with no static incoming import after excluding
stories, workers, and entry points. This includes icon modules and barrels that
may be loaded dynamically or by tests. It is not an unused-code verdict.

Older color/spacing primitive-impact adapters are not registered by the current
impact source index, which uses the unified browser projection. Legacy ESLint
configuration coexists with the active flat config. Domain-specific authoring
editors remain under `src/components/logic/` despite current panel ownership rules.

Recommendation: trace source/test/dynamic consumers and classify each candidate
as retained compatibility, deliberate fixture, removable dead code, or a scoped
ownership move. Do not delete placeholders merely because their epic is planned.

## Domain, state, and defaults matrix

All 14 direct `persistedAtom` call sites supply validators; the shared dimension
factory instantiates separate spacing and size documents. Validator presence
does not imply deep identity/reference integrity, as AUD-004 demonstrates.

| Domain | Defaults and persisted key | Important distinctions |
| --- | --- | --- |
| Color | JSON through color defaults; `foundations/color` | Authored scale stops/settings versus generated values; palette, surfaces, publishing, and overrides |
| Typography | JSON through typography defaults; `foundations/typography` | Temporary component-size dependency; referenced formulas/interpolations; explicit bindings |
| Spacing | JSON; shared factory `foundations/spacing` | Shared dimension generator, rule/formula references, pending rules and optional mode bindings |
| Size | JSON; shared factory `foundations/size` | Shared dimension generator; distinct identity/prefix and legacy migration |
| Rules | JSON; `rules/library` | Reusable authored definitions, consumer references, rounding semantics |
| Formulas | TypeScript defaults; `logic/scale-types` | AUD-003; hidden legacy fallbacks are not normal shipped defaults |
| Interpolations | JSON/library composition; `logic/interpolations` | Declarative expressions and parameters; migration/legacy compatibility |
| Modes | JSON/model defaults; `modes/mode-sets` | App mode IDs, keys, presets, default selection, authored foundation overrides |
| Selection | View state; `modes/selection` | Current context is not additional dataset coverage |
| Adaptive claims | JSON; `modes/adaptive-claims` | Ownership/capabilities distinct from discrete output-mode values |
| Platforms | JSON; `platforms` | Currently ID/name only; no inferred manifest or cascade layer |
| Tokens | Generated plus `tokens/color/overrides` and `tokens/browser/edits` | Stable source identities, mode-keyed edits, metadata/lifecycle, authored versus effective output |
| Edit session | Snapshot defaults to null; `edit-session/snapshot` | Saved baseline v4, optional older domains, Save/Cancel/revert contracts |
| Edit mode | Boolean; `view/edit-mode` | UI workflow state, not interoperable domain data |
| Insights/impact/changelog | Derived state or fixtures | Registered saved-state sources and denominators; no new independent persistence model should be invented |

No automatic storage reset or migration occurred during this audit.

## Shared-method opportunities

Retain the existing expression evaluator, scale generator, dimension state
factory, rounding helper, mode-parameter resolver, saved browser-token projection,
and color generators as canonical owners where their contracts fit.

Picker conversions use `colorjs.io`, while generated color/output math includes
specialized linear-light calculations. They are not interchangeable merely
because both handle color. Compare gamut, clipping, coordinate types, precision,
and export/runtime constraints before proposing further unification.

Mark up to three dynamic HTML boundaries for follow-up: Prism code highlighting,
KaTeX formula rendering, and static SVG icon loading. No injection exploit was
established in this audit; review their provenance/options before expanding
inputs. IMS is a separate singleton/provider boundary and must not be introduced
into a pure Node comparison engine.

## Baseline results and verification limits

| Check | Result |
| --- | --- |
| All 15 package-listed non-browser test scripts | Pass |
| Standalone impact, typography, typography-tokens assertions | Pass |
| Standalone changelog assertions | Fail: 304 versus 310 at `tests/changelog.ts:156` |
| `pnpm lint` | Fail: seven existing errors and one warning |
| Direct app project typecheck | Fail: 49 diagnostics |
| `pnpm build` | Pass; main bundle approximately 1.72 MB minified, chunk-size warning |
| Six representative Playwright specs | 25 pass in 44.7 seconds |
| Plan completeness/ASCII and `git diff --check` | Pass |

Browser specs run: Home, color-system-smoke, tokens, spacing, logic, and changelog.
They include existing pageerror collection and cover all four foundations through
token publishing, saved edit cancellation, mode-sensitive impact, and color
subpanel/editor/view rendering. The rest of Playwright, Storybook browser checks,
and mobile layout coverage were not run; they remain implementation gates for
affected slices. A passing sample does not establish complete browser coverage.

Lint findings: unused NavSidebar Settings/Layout imports; disallowed autoFocus
in RuleEditorDialog; four unused Home imports; a Fast Refresh warning for
RoundingRuleEditor. These are pre-existing relative to this documentation work.

## Internal audit exit and next action

Every maintained area has an explicit review disposition. Full-repository
architecture/data triage is complete, with unresolved checks disclosed above.
No architecture repair is approved yet.

Next: inspect all design-data schema/data categories and produce the review,
bidirectional mapping, and gap register. Only then request approval for concrete
code slices. Preserve the defaults/edit-session/generation boundaries identified
here when designing the report command and Analysis page.
