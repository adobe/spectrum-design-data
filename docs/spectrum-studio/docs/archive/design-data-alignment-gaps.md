# Alignment gaps and approval packet

## Current governing direction

The joint target-contract pivot supersedes expanding current-dataset ordinal
mappings as the next priority. See [the target proposal and conflict matrix](../design-data-target-contract.md)
and [the pinned PR #1454 review](../design-data-pr-1454-review.md). Original GAP-001
through GAP-009 and A-E approvals remain historical evidence; they are not replaced
or interpreted as permission to implement the new target model.

The user approved the documentation pivot, including a review of
`feat/token-taxonomy-vocabulary-split` as future taxonomy evidence. The destination
is a joint contract with portable derivations and foundation-defined, optionally
used modes. The open draft PR is not merged specification or a dataset to copy.
R1 architectural assessment/evidence modeling is implemented and verified as the
first bounded slice with additive report compatibility. Separately approved R2 now
presents the three assessment planes in Analysis with shared downloads, freshness,
and CLI/page parity. R3's separately approved reporting-only slice now distinguishes
evaluation samples, source assignments, declared bindings and known edit provenance.
R4 now supplies [PC-0.1](design-data-portable-contract-proposal.md) with verified native
round-trip and recorded taxonomy/reference examples, not an adopted portable schema.
Canonical materialization/resolution policy, contract adoption and authored-state
changes remain separate gates. See the execution plan's verified checkpoints.

The subsequent [authoring/storage review packet](../design-data-authoring-storage-contract.md)
records approved local artifact/identity/baseline direction and the user's clarified
goal of persisted foundation-schema artifacts plus generated design-data tokens,
updated while editing. Current derived-token atoms and reporting do not implement
that persistent token collection. Concrete schema/profile/materialization and storage
lifecycle approval is still required before the proposed next production slice.

The user subsequently approved the spacing/size production artifact slice, structured
local-proposal token names **with UUIDs**, and baseline/binding/override emission.
It is implemented and verified for wide-desktop functionality; the
[implementation checkpoint](architecture-alignment-plan.md#spacingsize-artifact-implementation-checkpoint-2026-10-06)
records a remaining standard-width token/Change log overlap. This is a local proposal,
not upstream schema adoption or complete conversion of every foundation.

## Original decision requested

Approve specific architecture slices below before application changes. The
internal audit and upstream review are complete at the documented review depth;
code restructuring, the comparison command, and Analysis page were not implemented
when this packet was prepared. Approval and implementation updates below supersede
that historical state; full comparison acceptance remains open.

Read [the execution plan](architecture-alignment-plan.md),
[internal findings](architecture-alignment-audit.md), and
[upstream review](design-data-alignment-review.md) first. This packet preserves
the original agreement: no imported default data and no upstream changes.

## Classification rules

- **Spec gap:** existing app data has no explicit comparable upstream model.
  Preserve it as app-owned authoring data and document a proposed enhancement.
- **App model/capability gap:** upstream already supports the concept, but our
  current model or UI does not. Do not propose another competing upstream type.
- **Dataset gap:** one dataset lacks a comparable concept or value. This is not
  automatically an implementation requirement or a specification defect.
- **Intentional difference:** different presets, ranges, platforms, private data,
  or values reflect known product decisions. Retain their rationale.
- **Unknown/unassessable:** inputs, context, identity, mapping, or semantics are
  insufficient for a trustworthy comparison. Never report these as confirmed
  missing data.

## App-owned models and extension proposals

The entries below describe direction, not accepted upstream schemas. Each
proposal must have a stable ID, explicit local schema/version, supported fields,
typed references, semantic validation, ownership, lifecycle policy, and examples
derived from current app records. Preserve existing authored IDs; maintain an
explicit mapping to interoperable concept/row IDs instead of reminting them.

Use a documented application namespace for proposed model identities/schema URIs.
Keep authoring objects outside supported token/manifest/component payloads unless
an upstream schema explicitly permits that object. Do not rely on unknown-field
tolerance, document text, or platform schema relaxation as a data model.

### GAP-001: reusable formulas, interpolations, and rounding rules

Classification: spec gap for authoring definitions; generated values representable.

Evidence: `src/features/scales/scaleType.ts`, `interpolationDefinition.ts`,
`expression.ts`, `src/features/logic/model.ts`, and shipped rules/interpolations.
The reviewed upstream typography-scale value type stores output size/line height,
not expression programs, named parameters, rounding depth, or reusable consumers.

Proposed app model: a versioned authoring-program family distinguishing formula,
interpolation, and rounding rule. Retain expression language/version, parameter
definitions and bounds, defaults, locked/overridable/adaptable policy, rounding
factor/depth, input/output units, and stable reference IDs.

Reference semantics: a scale references a definition by ID and supplies permitted
overrides; never duplicate the whole definition per consumer. Reject unresolved
references, cycles, reserved variables, invalid bounds, and nonfinite outputs.
Evaluation remains in the existing parser/generator, not `eval` or a new engine.

Mode/cascade semantics: mode context supplies explicitly bound inputs; generated
results may become mode rows. A formula is not a platform override or composite
typography value. Schema/function version changes require an explicit behavior
decision, not silent recalculation of saved overrides.

Round-trip criterion: definitions and consumer references survive serialization
without losing expression precision, control policies, or rounding behavior;
generated output matches current reference checks. Export policy: output tokens
supported; authoring programs accompany a proposed/local extension separately.

Future contribution: reusable derivation definitions, aligning with EPIC-5.5 and
INIT-9 without implementing the full semantic-rule engine here.

### GAP-002: adaptive parameters, claims, and continuous controls

Classification: spec gap for authoring/runtime-control intent; custom mode axes
and emitted values already supported.

Evidence: `src/features/modes/parameters.ts`, `adaptive.ts`, `capabilities.ts`,
and JSON `adaptiveClaims`. Existing data associates parameters with foundations,
mode ownership, bounds, and adaptive control behavior.

Proposed app model: versioned parameter definitions and claim/binding references,
including unit, range/step, default, owning foundation/path, control capability,
and explicit discrete-versus-continuous behavior. Retain preset values separately
from adaptive ownership and temporary UI preview overrides.

Validation: unique declared parameter IDs, valid owners, compatible units, valid
bounds/defaults, and deterministic ownership rules. A missing owner is diagnostic,
not permission to silently assign a different mode set.

Mode/cascade semantics: preserve existing app resolution and explicit bindings.
Discrete projection uses declared mode keys/defaults; continuous controls do not
create an infinite mode catalog. Platform adaptation would require a deliberate
runtime contract, not arbitrary token-field additions.

Round-trip criterion: claims, bindings, presets, and ranges survive independently;
mode selection and preview behavior stay unchanged. Future contribution:
adaptive-parameter/authoring contract, not a second mode-set schema.

### GAP-003: foundation generation recipes and contrast evidence

Classification: spec gap for recipes/evaluation evidence; output values generally
representable. Upstream semantic accessibility is a distinct existing model.

Evidence: color stops/settings, contrast targets, polarity compensation, gamut,
surface generation, typography/spacing/size input scales, and color evaluation.

Proposed app model: foundation recipes reference programs/rules and preserve
inputs, binding context, generation policy, algorithm version, and units/gamut.
Separate measured evaluation records from authoring settings and generated tokens.
Evaluation records need target/test context, algorithm, output/source identities,
measured value, threshold, and result provenance where such records actually
exist; do not introduce persistent evaluation data simply to fill this proposal.

Validation: existing domain validators plus finite outputs, valid references and
explicit measurement context. Preserve exact linear-light contrast behavior.
Do not equate semantic accessibility declarations with measured color compliance.

Round-trip criterion: recipes regenerate current results; an exported token cannot
be claimed to reconstruct its generating recipe. Future contribution:
foundation derivation and, separately, structured evaluation evidence if needed.

### GAP-004: authoring metadata, working baselines, and UI configuration

Classification: intentionally app-local, except supported metadata projections.

Evidence: `BrowserTokenEdit`, stale value/name baselines, edit-session snapshots,
preview selections, palette/surface `previewRole` and `showInPreview`, and current
draft/released/deprecated UI status.

Proposed app model: keep typed local editing and visualization metadata separate
from interoperable records. Map description and valid lifecycle fields only when
the necessary information exists. Draft/released alone is not an upstream release
version or deprecation record.

Validation and lifecycle: snapshot versioning, declared domain coverage, baseline
identity, namespaced storage, explicit reset policy. Temporary preview controls
must never become saved authoring data or default-dataset coverage.

Round-trip criterion: Save/Cancel/revert and stale-override detection remain exact.
No upstream spec contribution is proposed for window widths, navigation state,
or ephemeral snapshots. A general authoring metadata proposal would need a use
case beyond this app before contribution.

## Supported concepts requiring app work, not new specs

### GAP-005: structured names, primitive/composite values, and aliases

Classification: app interoperability/model gap.

Current browser records carry `string | number` values and `px | empty` units;
color names contain app-specific terms. The upstream model supports structured
property semantics, aliases, composite typography and shadows, and metadata.

Direction: define loss-aware generated-record adapters and explicit vocabulary
mapping. Preserve source identity, unit/value type, authored/effective value,
mode context, provenance, and metadata. Flag unsupported composites/aliases
instead of flattening them. Do not implement new foundation editors solely
because an upstream value type exists.

### GAP-006: declarations versus current export wrapper

Classification: app export-contract gap.

`buildCascadeTokenExport` already creates row/concept identities and mode-aware
color/system rows. Its wrapper and color-centric input are not a complete
dataset-root or cascade-file contract. `colorTokenJsonAtom` also incorporates
active context and preview data and cannot serve as shipped-default input.

Direction: compose a pure, explicit-input projection using existing generators;
emit normalized report records and, only if approved, supported artifact-specific
output. Keep modes, token rows, root descriptors, and authoring recipes distinct.
No import/default adoption is included.

### GAP-007: platform lists versus manifests and vocabulary enhancements

Classification: app model gap; some vocabulary differences may be intentional.

The app has platform ID/name records. Upstream has platform manifests, supported
extensions, restrictions and type-preserving overrides. Do not equate React,
web-components, iOS, Drover, or Qt labels to upstream IDs without a reviewed map.

Direction: validate current list identities; describe mapping and unmodeled
manifest capabilities. Do not build INIT-8 wholesale or reinterpret platform
names as mode axes. Unsupported authoring objects cannot use platform-local
schema overrides, which the spec explicitly disallows.

### GAP-008: component, relationship, taxonomy and documentation authoring

Classification: supported upstream data absent or incomplete in the app.

Components, API options, slots, anatomy, states, CTRs, fields, registry vocabulary,
guidelines, documentation blocks, and semantic accessibility have explicit models.

Direction: report current capability and content coverage. Retain them in dynamic
category discovery so future app records become assessable. Do not populate the
app or implement component/structure/taxonomy editors in this slice.

### GAP-009: future structures, themes and product defaults

Classification: roadmap/open decision, not proven missing-current-data coverage.

Structures are broader than upstream structure name fields; themes are parked;
product-default ownership remains unresolved. There is insufficient authored
default data to claim a concrete representation gap for all of these today.

Direction: keep an anticipated-gap section outside current coverage denominators.
Do not move componentSize or add product-default fields until EPIC-2.5 is resolved.

## Upstream conditions to preserve as diagnostics

- Missing concept metadata on 159 token rows limits concept-level comparison;
  1,208 observed concept IDs are not the total concept denominator by inference.
- The existing SDK reports 12 layout-component schema errors and 1,380 warnings.
  Binary freshness and legacy schema selection are unresolved. These are not app
  dataset gaps and must not be repaired by copying or altering upstream records.
- Compatibility package descriptions and some package-level task/layout guidance
  lag current exports/files. Follow actual supported interfaces and task definitions.
- External schema URI resolution and embedded-versus-standalone component state
  definitions require contextual validator verification before claiming exact
  schema parity. This is not an approved upstream schema change.

## Proposed implementation slices

### A: make verification trustworthy

Files: `package.json`, TS configurations if needed, relevant existing assertions,
and narrowly identified source type/lint fixes. The 49 app type diagnostics span
multiple UI/domain files; approve that scope explicitly rather than expanding a
model repair silently. User ChangelogPanel changes remain protected.

Work: explicit app/tooling typecheck commands; expose existing standalone tests;
investigate the six unaffected color concepts in the changelog assertion;
repair supported, scoped issues rather than suppress errors.

Acceptance: genuine app/tooling checks run; agreed type/lint repairs pass; intended
concept denominator semantics are documented; unit/browser behavior unchanged.
Do not assume all 49 diagnostics share a single root cause.

### B: establish one complete validated default contract

Files: `src/data/defaults.ts`, `src/data/design-system.defaults.json`, a real local
schema if needed, scale/formula default owners, and existing default/model tests.

Work: root runtime validation and real schema reference; complete composition of
JSON plus code-defined formulas, with an explicit decision about centralizing
definitions versus validated composition. Preserve every existing number, formula,
ID, binding, publishing flag and output. Add identity/reference checks, including
platform uniqueness, with an explicit compatibility/reset decision.

Acceptance: root validation rejects malformed records; all current definitions
are represented; shipped data produces identical outputs; no upstream data added;
revert and saved baselines remain correct. Storage reset is allowed but not presumed.

### C: consolidate proven duplication and extract the needed pure boundary

Files: existing modes helper, scales binding/validation owner, logic/reference
owners, changelog consumers, and the smallest affected mode-resolution modules.

Work: remove the three proven repeated implementations after contract review;
extract only pure resolution/projection logic needed by Node reporting. Break
cycles only where needed for this boundary; do not rewrite all Jotai orchestration.

Acceptance: focused consumer checks pass; one generator serves previews, tokens,
and report projections; initialization and mode interactions remain correct;
shared color changes receive all required consuming-surface browser checks.

### D: implement the reusable comparison engine and command

Suggested ownership: pure models/mapping/comparison under `src/features/design-data/`;
filesystem/SDK loading in a Node entry point under `scripts/`. Final names should
follow the actual boundary chosen in B/C; do not create an abstraction per type.

Command contract: `pnpm analyze:design-data -- --design-data-path <checkout>` or
equivalent documented forwarding. Resolve the sibling path from the app root,
not process cwd; allow an explicit override and fail with actionable diagnostics.
Emit a versioned JSON report and generated Markdown at configurable output paths.

Report contract:

- Source: shipped defaults, saved authoring state, or working state, never mixed.
- Inputs: root, version/hash/revision, dirty status, source file/row, schema and
  validator identity, mapping revision, generator context, exclusions and validity.
- Inventory: record type, stable source identity, concept/row distinction,
  semantic name, mode context, layer/platform, value type/unit and authored or
  resolved value provenance; not every category needs token-specific fields.
- Findings: stable diagnostic ID, direction, classification, severity, evidence,
  match confidence, app/upstream locations, mapping rationale and recommended action.
- Metrics: separate counts for token concepts, mode rows/values, relationships,
  components, vocabulary terms and supported/unassessable models. Publish numerator,
  denominator and exclusions; do not collapse unlike counts into one health score.
- Comparison: exact identity or reviewed semantic mappings; explicit ambiguous,
  invalid and unassessable outcomes; unit/gamut-aware comparison and documented
  tolerances. No fuzzy name match silently becomes a confirmed shared concept.
- Determinism: preserve cascade source order; sort presentation separately;
  isolate volatile timestamps. Dynamically discover new categories/schemas.

Validator/resolver choice: inspect a maintained JS/WASM SDK option first; otherwise
use a version-recorded read-only CLI adapter for supported Node operations and
conformance-verified pure/browser comparison. Do not introduce a hand-written
cascade engine without a supported-library assessment and approved need.

Exit policy: dataset differences are informational. Operational/required-input
failures return nonzero with useful partial diagnostics; invalid upstream records
must not silently become "missing in app". Reports never modify input files.

Acceptance: focused fixtures cover both directions, custom modes, UUID/concept
references, ordering, aliases/composites, ambiguity, unit differences, invalid
input, intentional differences, new types, stable output, and unchanged inputs.

### E: implement the separate live Analysis page

Files: existing page/navigation registry, `src/pages/Analysis.tsx`, domain content
under `src/views/analysis/`, comparison feature state/selectors, `vite.config.ts`
and a development-only adapter, focused browser tests and approved stories.

Work: use the same report engine/model as D. Provide distinct defaults and authoring
views; within authoring identify saved versus working data. Use existing edit
snapshots/selectors and pure generation. Never read arbitrary raw localStorage
into a competing model or send user edits to the upstream filesystem.

Live source refresh: server-configured allowlisted roots, dataset/schema/adapter
dependency watching, debounce, latest-result ordering, stale/error handling,
invalid-state diagnostics and explicit source revisions. Exclude generated
reports from watched inputs to prevent loops. No browser-selected filesystem
path, credential access, production Node imports, or new production backend.

Hosted behavior: use a versioned generated snapshot or an honest unavailable
state when local reference data/watch support is absent. Label snapshot age and
reference version. The CLI still works without any dev server.

Acceptance: keyboard-accessible filtering/search/evidence/download controls;
loading/empty/error/partial/stale states; defaults unaffected by edits; saved vs
working state correct through Save/Cancel/revert; live file update visible;
desktop/mobile layout checks; no pageerror events. Home insights remain unchanged.

## Proposed sequence and approval record

Recommended first batch: approve A, B, and C, each with its focused checks.
Then implement D and E on those proven boundaries. Approval of D/E can be given
now as scoped follow-on work, or after reviewing A-C results.

Approval recorded on 2026-10-05: the user approved proceeding with the recommended
first batch, A-C. D/E remain follow-on work and are not authorized by this batch.
Use a validated composition of existing JSON and code-defined formulas for B;
preserve the existing generator imports and formula values. Reset permission
remains available, but no reset is planned unless a concrete incompatibility
requires one. No upstream data is imported.

Full data import/adoption, upstream contributions, new domain editors, rule-engine
completion, roadmap edits, commits and pushes remain excluded. Extension proposals
are documentation for future contributions, not changes in spectrum-design-data.

### A-C completion record: 2026-10-05

A-C are implemented and verified. The effective type/lint gates now pass; defaults
are validated as a complete app-owned composition with a generated schema; the
three duplicated helpers and pure color resolver have shared owners. Existing
JSON values, formula definitions, generated output, and persistence formats are
preserved. No upstream data was adopted and no storage reset was needed.

All 20 standalone checks, lint, and build pass. Browser verification passed 72
application tests and all 25 Storybook tests. The remaining mobile-search failure
was repaired and all four TopBar tests pass. A logged Storybook play assertion
was repaired with an animation-aware wait and its focused test passes. See the
[implementation handoff](architecture-alignment-plan.md) for run boundaries and
the retained build warning.

D/E were explicitly approved on 2026-10-05 after this completion record.
The comparison command, JSON/Markdown reports, and live Analysis page are now
implemented. All 21 standalone checks, lint, build, fixture-backed Analysis
workflows, real-reference download, and the latest serial consuming-surface
browser checks pass. See the [D/E pause checkpoint](architecture-alignment-plan.md)
for exact run boundaries and observed cold-start tooling failures.

Full Phase 5 acceptance remains open: reviewed mappings are not populated, so the
real report has zero confirmed matches. Dedicated mapped structural/gap diagnostics,
resolved-alias and broader cascade/layer conformance, and mapped composite/unit
fixtures still need work. The current partial report preserves 12 upstream SDK
errors as diagnostics rather than app gaps. Existing spec extension proposals
remain proposals, not upstream changes.

### Startup and first mapping update: 2026-10-05

The macro CSS cache regression and lazy dependency-scan startup failures are
repaired and tested without downloads. See the latest
[implementation checkpoint](architecture-alignment-plan.md).

The previously empty default mapping library now contains the narrow reviewed
`foundation-color-ramp-v1` rule. Real reports have 352 mapped rows, 10 equal and
342 different; independent identities and explicit context evidence are retained.
Mapped structure differences have a separate diagnostic and denominator policy.
Comparison, macro, lint/build, and Analysis browser checks pass.

The earlier zero-match count is historical. Broader mappings, dedicated domain
gap diagnostics, and resolved-alias/cascade/composite/unit conformance remain
open; the same 12 upstream SDK validation errors still make the real report
partial. This is not completion of all Phase 5 acceptance criteria.

### Completion batch and projection parity: 2026-10-05

The user approved the evaluation's completion order and reaffirmed an architecture
slice. The first batch addresses GAP-005/GAP-006 projection correctness, malformed
mapping-input diagnostics, and Markdown provenance without changing upstream data,
shipped defaults, persistence, or presentation.

Effective typography/spacing/size token names and exact-mode value overrides now
flow through the same source adapter and edit resolver as Tokens. Bindable mode
values and typography document resolution have pure shared owners, retaining their
existing compatibility exports. Pending dimension rules and unowned base bindings
agree with UI generation; preview values stay excluded. The raw edit definitions
remain separate authoring records and override edits retain existing report IDs.

Mapping validation and Markdown provenance are also complete in this batch.
Malformed optional fields retain partial JSON/Markdown reports and do not trigger
a silent built-in mapping fallback. Markdown exposes the report's source identities,
hashes/versions, validation and resolution limits, scope/policy, independent metrics,
confidence, and both evidence locations. Effective non-color overrides include
generated baseline evidence without reclassifying authoring definitions as tokens.

All 22 non-SDK standalone checks, lint, build, the 26-test affected application
subset, and 25 Storybook browser tests pass; the seven Analysis workflows and
comparison fixtures were rerun after the final evidence addition. The shipped
projection hash is unchanged, and refreshed real reports are byte-reproducible.
See the execution plan's completion checkpoint for exact run boundaries/exclusions.
Mode/platform browser coverage, broader mappings, semantic vocabulary review,
resolved aliases/product layers, and contextual unit/composite conformance remain
open. The real report retains 12 upstream validation errors and disabled resolved
comparison; no full Phase 5/6 completion or upstream spec adoption is claimed.
The user separately approved removing two unused imports from their concurrent
navigation edit. Latest lint/build and eight Analysis/color browser checks pass;
the user's navigation choices and CSS edits remain preserved.

### Mode/platform diagnostics and next mapping approval boundary: 2026-10-05

The next approved architecture slice completes diagnostics on normalized foundation
inputs and reviews non-color mapping candidates; it does not implement broader
semantic mappings or enable resolution. Confirmed row pairs now report differing or
undeclared contexts, missing required declared defaults, and matched mode vocabulary/
default differences. Registry platform terms are classified using declared type, not
filenames or inferred aliases. Invalid required inputs suppress speculative gaps;
supplementary diagnostics retain independent category counts and one matched pair.

All 22 non-SDK checks, lint/typechecks, build, and nine Analysis/color browser tests
pass. An isolated temporary-checkout test verifies real watched declaration reload,
existing color-mapping recomputation after adding a fixture palette row, invalid-input
recovery, filters/evidence/downloads, and CLI/page findings/metrics. Its extended
focused rerun also passes; no new mapping rule is introduced by that fixture.
Its stub SDK is explicitly transport-only, not proof of upstream conformance.

GAP-005/GAP-006 next-slice approval packet:

- Candidates: baseline font-size (17 shared ordinals), built-in Global spacing
  (10), and built-in Global size (15). Counts are candidate overlap, not matches.
- Evidence/limits: see the non-color review matrix, including legacy indexed font
  properties, literal px strings, distinct density/text-scaling axes, and scoped
  component/anatomy records. No shift-by-value or fuzzy-name mapping is proposed.
- Files likely affected: `projection.ts` for typed source/family evidence,
  `mappings.ts` for reviewed eligibility/context policy, the reference adapter and
  comparison boundary for supported literal-dimension provenance/normalization,
  plus comparison/CLI/Analysis fixtures and the durable review/checkpoints.
- Dependency order: approve baseline context and unit policies; establish typed
  source evidence; implement one reviewed family at a time; verify both eligible
  and excluded cases; then refresh reports. No new editors or default adoption.
- Alternatives: keep explicit ID pairs unassessable across unknown context, or
  defer until density/platform contracts are defined. Do not build those epics here.
- Risks: accidentally treating text scaling as density; losing mode-specific
  overrides; remapping renamed/custom scales by label; comparing unitless line
  height to px; collapsing duplicates or extra contexts into false coverage.
- Acceptance: identities/Save/Cancel/overrides/default isolation remain intact;
  declared context/unit provenance is visible; ambiguities/unresolved/unsupported
  values stay unassessable; denominators are independent; fixtures and browser
  downloads agree; lint/build pass; shipped/reference hashes remain stable.
- Persistence: no format/version change or reset is proposed. Product defaults,
  componentSize relocation, rules, platforms, and taxonomy decisions remain open.

This checkpoint is not approval of a density crosswalk, arbitrary context dropping,
new non-color mappings, composite normalization, or a substitute resolver. The 12
SDK validation errors and unsupported product-context fixture remain open.

### Joint-contract supplement and revised approval boundary: 2026-10-05

The previous next-slice ordinal mapping packet is deferred. The current proposal
separates current-state audit, joint target-contract assessment, and generated-output
comparison. Values/names can differ intentionally; match/equality counts cannot
determine schema or architectural fit. Refer to JTC-001 through JTC-011 for evidence,
priority/confidence, consequences, ownership, and discriminating checks.

| Existing gap | Revised disposition |
| --- | --- |
| GAP-001/002/003 | Preserve current app-owned authoring boundaries but propose portable formula/rule/interpolation/binding/recipe schemas as the intended destination, not permanent app-local status. Programs and outputs remain separate. |
| GAP-004 | Keep ephemeral editing, saved/working baselines, previews, and UI configuration app-local; do not confuse these with portable derivation intent or redefine Save/Cancel. |
| GAP-005 | Prioritize semantic/classification meaning and profile-specific representability. Current field spelling/units and matching rows are evidence, not the target. PR #1454's decomposition and ownership split inform the proposal. |
| GAP-006 | Distinguish explicit assignments/materialized records from Cartesian evaluation samples before changing projections, export, or denominators. Existing generator parity fixes remain valuable and retained. |
| GAP-007 | Audit platform mode opt-in, local catalogs, overrides/extensions, restrictions, and lineage against separate spec/SDK facts. Mode-aware token records and simple value overrides are not interchangeable. |
| GAP-008 | Treat components/relationships as taxonomy consumers and owner-scoped vocabulary authorities, not missing records to populate. The draft PR's 92 legacy CTR state arrays demonstrate a migration/validation issue independent of token values. |
| GAP-009 | Keep product defaults, structure mapping, themes, identity migrations, and mode materialization open. Retiring desktop/mobile duplication does not authorize selecting/averaging a canonical value or moving componentSize. |

R1 approval packet is in the target proposal: bounded assessment/report logic and
source provenance, no editor/evaluator/platform-engine implementation, no persistence
change/reset, no data adoption or report-v1 replacement without version/compatibility
design. Curated facts must have profile hashes and staleness; proposals must not
appear as executed/current conformance. R2 presents the planes after model approval;
R3 addresses reporting materialization policy; R4 develops portable-definition and
taxonomy contract proposals. Each requires specific scoped approval.

PR #1454 is pinned at `fa714564eaa33bc37f905fad64162d60d6a48087`, independently of
the unchanged checkout `838a6835`. Include its universal/owner-scoped vocabulary,
element/attribute/affordance/visibility split, and two ordered interaction fields as
future design inputs. Do not fork the component states catalog or treat semantic
interaction-context as an adaptive mode. Carry PR1454-001 through PR1454-005 as open
relationship migration, trigger placement, transitional prose, capability, and
profile/consumer issues; GitHub CI results do not erase those separately scoped facts.

This is a documentation deliverable, not approval of R1 or a new upstream schema.
No runtime code, data, generated reports, reference repository, or roadmap was
changed by this pivot. Previous test results remain their recorded run boundaries.

### R1 assessment/evidence contract completion: 2026-10-05

The approved additive CLI slice now carries JTC/PR findings, confirmed-direction
versus proposed-model requirements, pinned profile/evidence identity and hashes,
review-not-rerun methods, independent freshness, and separate existing SDK execution
provenance. Outer output report fields/schema v1 are preserved. Unavailable optional
snapshots and required output-input errors do not erase independent reviewed facts;
source changes/advanced refs are stale, not silently current. Equal values never
close a target decision. The 92-state-array result remains a recorded scope-fragment
check, not a current SDK validation claim.

All 23 non-SDK checks, lint/typechecks, build, and nine existing Analysis/color/real
temporary-checkout refresh browser tests pass; their pageerror lists are empty.
Source pins are curated metadata, not new authoring defaults. SDK errors and disabled
resolved comparisons remain unchanged. The browser is still output-only; R2 needs
specific approval. R3 counts/materialization and R4 portable-authoring proposals are
not implemented or authorized by this completion. See the plan for full run limits.
