# Architecture audit and design-data alignment plan

## Purpose and execution status

### Human-readable comparison direction approved

The user rejected the report-first Analysis experience as unclear and prescriptive.
They explicitly requested category/token-type/all-token coverage percentages and
comparisons that explain differences without dictating solutions, then selected an
architecture slice for a coverage-first redesign. This is EPIC-7.1/7.3 presentation
and metric work; Home metrics, generators and persisted authoring behavior stay intact.

Add independently versioned shared coverage summaries with explicit app/reference
inventories, units and denominators. Distinguish confirmed counterparts, genuinely
absent app data categories, and unmapped/unknown data; do not call every unpaired record
missing or divide app/reference raw totals into a claimed overlap percentage. Provide
token-concept and mode/output-row views without inflating concepts with Cartesian
samples. Value differences are separate from data presence. Show every discovered data
category and reviewed token-family grouping, including unclassified records, with
human-readable side-by-side drill-downs. No heterogeneous combined health score.

Make coverage the initial Analysis view and move the technical audit, hashes, schema
errors and provenance into supporting detailed views. Explain schema/model gaps and
choices separately; schema counts are not themselves compatibility percentages.
Reuse existing S2 controls/table/progress bars and the same CLI/page model; no new
unique reusable UI component or Storybook story is planned. Verify denominators,
deduplication, partial/unavailable/unknown states, fixtures, downloads, source isolation
and desktop/mobile browser interactions with empty pageerror assertions. Existing
standard-width token/Change log overlap remains outside this redesign's approval.

Implemented the shared optional report-v1 `coverage` section and the coverage-first
Analysis view. See [metric definitions and limits](../design-data-coverage-metrics.md).
Overview shows all-token, all-color and component comparisons up front, every discovered
data category and reviewed token family, count/percentage bars, missing versus unmapped
states, and side-by-side examples. Interpretation/metric caveats are progressively
disclosed; technical audit/provenance and schema/model observations are supporting views.
Schema compatibility is not assigned an invented percentage. No matching coverage is
called a health score, schema conformance, or required synchronization with current values.

Native/report records, IDs, existing mappings, source-record hashes and old findings/
counts remain unchanged. App/reference inventory completeness is now recorded separately
from SDK validity. Token identities use explicit concept IDs with disclosed UUID/record
fallbacks; row counts and value agreement are separate. Missing-data statements concern
the exported projection, not every authoring capability; unclassified or unmapped data
does not become missing by assumption. No new ordinal/semantic mappings were added.

Checks: 27 non-SDK unit commands, lint/typechecks/build, two new normal-viewport overview
and stale/partial browser workflows, and 22 wide-desktop focused regressions pass, with
mobile overflow checks and empty pageerror assertions. Technical tests explicitly select
Detailed comparison because coverage is now the product default. Shared CLI/page coverage
and Markdown parity pass through real disposable-checkout refresh. The existing narrow
token/Change log overlap remains outside this slice; no full app/Storybook or SDK pass.

Reference connection repair: the ordinary 5173 dev server was using the nonexistent
default sibling checkout while the isolated 5587 verification server had a shell
override. Persisted the actual checkout in ignored `.env.local`, added `.env.example`,
and made ordinary dev/CLI loading honor server-only env files (shell overrides win).
No machine-specific path was added to tracked application code. Missing reference
inventory now produces an explicit connection/configuration state without coverage
charts. Verified the real 5173 response: 9,688 records, 2,533 tokens and 97 components;
live browser coverage restores 12.9% all-token and 25% color confirmed overlap with
empty pageerrors. Four coverage/reference-refresh tests, comparison fixtures, lint and
build pass. Existing SDK diagnostics remain separate from the restored data inventory.

Establish Spectrum studio as the mechanism for auditing, evaluating, and redefining a
joint future design-data authoring/interoperability contract. Audit current data,
schemas, SDK behavior, and app architecture closely without treating today's
names, values, taxonomies, or density rows as the destination. Preserve portable
derivation intent and distinguish semantic/schema gaps, missing records,
implementation disagreements, and intentional differences. Dataset adoption is
conditional future work, not the primary acceptance criterion or an import task.

This document is instructions for an implementing AI agent. Read it at the start
of each session. Do not rely on chat history for scope or approval.

- Agreed approach: architecture slice, not immediate synchronization.
- Current stage: Phases 1-3 complete; approved Phase 4 slices A-C implemented
  and verified on 2026-10-05. Phase 5 comparison infrastructure and Phase 6 live
  page implemented and checked; first reviewed color mappings and structural
  fixtures added. The completion batch for projection parity, mapping-input
  validation, and Markdown provenance is verified. Foundation mode/platform
  diagnostics and real-checkout refresh parity are verified; non-color mapping
  candidates are reviewed but not implemented. The user then approved a
  documentation pivot to a joint target contract plus architectural conflict
  matrix, including PR #1454 as draft future evidence. That proposal is documented;
  the user subsequently approved proceeding with the revised plan. R1's additive
  assessment/evidence contract and CLI integration are implemented and verified;
  R2 presentation is implemented and verified as an approved architecture slice.
  R3's reporting-only provenance slice is also implemented and verified. Canonical
  emission/resolution policy remains open. R4's approved portable-contract proposal
  and isolated fixture slice are delivered and verified; production adoption and
  final target-contract acceptance retain separate gates. The separately approved
  spacing/size artifact slice is now implemented; standard-width layout acceptance
  remains obstructed, while its wide-desktop functional checks pass.
- Approval gate: maintain the completed audits, review the target-contract
  supplement and draft PR evidence, then obtain approval of specific scoped
  recommendations before further application/schema/persistence changes.
- Final deliverables: approved code changes, documented gaps and extension
  proposals, a package-level comparison command, JSON and Markdown reports, and
  a live Analysis page with a separate authoring-state comparison. Revised
  acceptance also requires distinct current-state, target-contract, and output
  assessment with evidenced architectural conflict dispositions. R1-R2 now present
  those planes and R3 reporting provenance; R4 now supplies a bounded portable-contract
  proposal with verified examples. Canonical policies, production adoption and final
  acceptance remain open.

## Current authority and revised next boundary

The user clarified and approved the direction on 2026-10-05:

- The destination is a **joint future contract**, not Spectrum studio becoming 1:1 with
  the current checkout or a draft branch's records. Different values/names can be
  valid; matching counts do not decide architecture.
- Foundation desktop/mobile duplication will be retired. Foundations define modes
  that may be unused by tokens; platforms can choose to use foundation modes or
  define their own for token overrides/extensions. Do not infer required mode rows
  from a declaration or confuse component interactions with adaptive modes.
- Formulas, rules, bindings, and recipes are intended to be portable authoring
  definitions, not permanently app-only or flattened into generated values.
- The next deliverable is an architectural conflict audit plus target proposal,
  not more ordinal mappings. PR #1454's future taxonomy changes are included as a
  separate pinned draft profile, not merged specification or copied app defaults.

Read [the joint target contract](../design-data-target-contract.md) and
[PR #1454 review](../design-data-pr-1454-review.md) alongside the original audit,
review, and gap register before continuing. They document approved direction,
proposed boundaries, JTC-001 through JTC-011, PR1454-001 through PR1454-005,
worked scenarios, open decisions, and scoped R1-R4 approval packets.

**Immediate boundary:** review the spacing/size implementation checkpoint and resolve
the standard-width Change log/token overlap with the user before claiming full browser
acceptance. Further domains and upstream schema adoption require bounded approval. R1
should preserve existing comparison infrastructure and model current-checkout,
draft-profile, SDK/app behavior, and target-proposal evidence separately. It is
not authorization for a new taxonomy editor, platform engine, evaluator, or schema
migration. New runtime report/profile behavior and any report-version change need
their own scoped design and acceptance checks before implementation.

### R1 implementation approval and compatibility design: 2026-10-05

The user approved proceeding with the revised plan, confirmed an architecture
slice for R1 first, and selected additive report compatibility. Preserve top-level
report `schemaVersion: 1` and all existing output fields; add an optional
`architecture` section with an independent schema version. Do not replace the
envelope, duplicate token rows, or add separate output artifacts.

R1 scope: pure assessment/evidence model and reviewed registry; read-only Node
provenance/freshness adapter; shared JSON/Markdown contract and CLI integration;
focused unit/fixture/CLI and existing browser regression checks; durable checkpoint.
No new UI is planned in R1. R2 presents the planes only after R1 acceptance and
specific approval; R3 materialization and R4 portable-schema changes remain separate.

Profiles remain distinct: app working-tree evidence, the configured current
reference checkout, the already-reviewed immutable PR #1454 commit, and target
direction/proposal documents. Use static allowlisted evidence locations, expected
review hashes, and cached Git objects. No fetching, checkout, branch mutation,
new browser-selected path, draft SDK execution, or new CLI profile flag is included.
Missing optional draft objects/evidence are unavailable, not fabricated/current.
Operational required-input failures retain the existing nonzero/partial-report policy.

Curated source facts, recorded review-time checks, reported CI, confirmed direction,
and unapproved proposals have explicit method/decision labels. A matching hash
only establishes reviewed-snapshot freshness, not semantic correctness, current CI,
binary/source correspondence, or a newly executed conformance test. Changed sources
and advanced tracked draft refs retain findings as stale; unavailable evidence must
not erase independently evidenced findings. No equality/match count closes a target
requirement or creates a combined health score. Approval does not resolve the open
taxonomy, density, omission, identity, product-default, or layer-lineage policies.

### R1 verified implementation checkpoint: 2026-10-05

Implemented pure assessment types/builder, a bounded registry carrying all 11 JTC
and five PR findings, eight target requirements (four confirmed directions/four
proposed models), and 33 deliberately reviewed SHA-256 evidence pins. Five profiles
remain distinct: app code, configured checkout, immutable PR head, historical merge
base, and direction/proposal records. Optional `architecture.schemaVersion: 1`
is added by the CLI while outer report v1 fields and the output engine stay intact.
No token rows are duplicated or output counts reinterpreted.

The Node adapter hashes allowlisted regular files/JSON trees and cached Git objects;
it does not fetch, switch branches, mutate sources, execute a draft SDK, or accept
browser-selected paths. Matching hashes mean reviewed-snapshot matching only.
Changed sources and advanced tracked refs retain stale findings/requirements;
missing optional evidence remains unverified/unavailable. Review-time schema checks,
reported CI, confirmed direction, and proposals stay explicitly not rerun. Existing
executed SDK adapter identity/fixture statuses are carried separately, with source/
binary correspondence unestablished and no assessment execution for pinned profiles.
An SDK/spec disagreement or target gap remains open even with zero matches or equal
outputs. Operational required-input/reporting errors retain nonzero partial reports.

Verification: all 23 non-SDK standalone commands pass, including the new assessment
check. Fixtures cover malformed registry identity/reference/method/closure, missing
input/profiles/Git objects, changed files/new tree entries, symlink/traversal refusal,
tracked-ref staleness, detached metadata, determinism, retained independent findings,
and open requirements despite equal output. Nine Analysis/temporary-checkout refresh/
minimum-color browser tests pass with empty pageerror assertions. Lint/typechecks and
build pass; the large-chunk warning remains. No full app/Storybook rerun is claimed.

R1 is a CLI/report-model slice, not R2 UI completion. The page still generates output
comparison reports without the architectural section; its existing output fields,
filters, downloads, saved/working/default isolation, and current generator behavior
are preserved. CLI JSON/Markdown now carry the additive section. Current report
input failures remain the 12 SDK diagnostics; resolved comparisons stay disabled.
The app projection and reference dataset hashes remain unchanged.

Review pins are explicit metadata, updated deliberately after source/document review
and never regenerated from live input by the command. They are not shipped token
defaults or an accepted upstream schema. User work, including the intervening user
commit and CSS edits, is preserved. No app defaults, persistence formats, generators,
upstream files, roadmap, dependencies, new UI components, commits, or pushes were
changed/introduced by R1. R3 materialization/identity/counts and R4 portable schemas
remain unapproved; R1 does not decide those policies or close Phase 5/6 acceptance.

### R2 presentation approval and bounded design: 2026-10-05

After the R1 handoff, the user asked for a concise progress update and continued
implementation, then confirmed an architecture slice for R2. Reuse the existing
Analysis page, S2 pickers/table, evidence, and download patterns. Add assessment
plane selection, explicit review/proposal/SDK provenance and freshness, relevant
filters, independent counts, and CLI/page assessment parity. Keep output comparison
as the initial selection to preserve existing navigation/test workflows; the two
architectural planes are available explicitly, without claiming a new health score.

Carry the optional versioned assessment through the allowlisted development
reference response and pure shared report model. Architectural facts remain
available when required reference records fail but the assessment payload is valid;
malformed assessment responses are errors, not fabricated current evidence. Preserve
last-good stale downloads after transport failure. Extend allowlisted watchers only
for reviewed document and Git-ref freshness inputs; exclude generated reports.
Hosted builds remain honestly unavailable and never ship filesystem/Git loaders.

No new reusable component is planned: extend the existing view and a presentation
row adapter, so no new Storybook story is invented. No editor redesign, source-data
adoption, generator/state/count policy, persistence change, resolver, or new CLI flag
is included. R3 materialization and R4 portable models still require decisions and
specific approval. Verify runtime payload validation, partial/stale/unavailable states,
filters/evidence/downloads, keyboard and desktop/mobile layouts, actual refresh and
saved/working/default isolation with empty pageerror lists, then checkpoint R2.

### R2 verified implementation checkpoint: 2026-10-05

The existing Analysis view now presents current-state audit, joint target contract,
and generated output through a plane picker; generated output remains the initial
selection. Existing output categories/severities are unchanged. Architectural rows
have independent owner, priority, method, evidence-profile, and freshness filters;
target requirements distinguish confirmed direction from proposed models. Counts
are bounded registry inventories, not capability coverage or a combined score.
Missing metadata is unavailable rather than zero conformance. Evidence retains
source/profile/hash/capability details and open decisions; adapter execution is
separate from curated reviews, recorded checks, reported CI, and proposals.

The shared comparison engine carries optional assessment metadata into browser and
CLI reports and retains required-input failures without erasing reviewed facts.
Browser payload validation rejects malformed metadata, fabricated execution, closure,
unresolved references, and inconsistent freshness. Both downloads include all three
planes regardless of the active filter. Transport failure keeps last-good stale
reports. Empty invalid reference records can still expose a valid architectural
assessment. Hosted builds remain unavailable, with no local endpoint requests.

The development endpoint checks assessment hashes/refs on every request independently
of cached dataset records. Allowlisted evidence documents/files and local Git metadata
trigger refresh; generated reports are excluded. Loose/packed draft refs are watched
read-only, with manual refresh as fallback where filesystem watching is unavailable.
No fetch, draft SDK execution, upstream source/ref change, persistence or generator
change, new reusable component, dependency, commit, or push was performed.

Verification: all 23 non-SDK standalone commands pass; lint/typechecks and build pass
(existing large-chunk warning remains). Twelve focused browser tests pass with empty
pageerror assertions: three new assessment/hosted tests, the expanded disposable
checkout refresh/CLI-parity test, seven existing Analysis regressions, and the minimum
color smoke path. Checks include keyboard filters/evidence, mobile overflow, downloads,
partial/malformed/stale responses, source isolation and Save/Cancel, changed spec files,
loose/packed Git-ref updates, and JSON/Markdown CLI/page assessment parity. Production
IMS is isolated with a synthetic browser session and intercepted identity responses;
no authentication/security conformance is claimed. No full app/Storybook rerun.

Reviewed evidence pins were not silently advanced to hide implementation/document
changes; stale findings remain visible until a deliberate source review updates pins.
CLI reports still retain 12 configured-checkout SDK diagnostics and disabled resolved
comparisons. The SDK product-context conformance limitation remains unresolved.
Repeated JSON/Markdown generation is byte-identical: 12,691 output findings and
352 assessable color pairs (10 equal, 342 different), with unchanged app-projection
and reference-data hashes. Production bundle/source-map inspection excludes the
Node loader, curated registry/pins, child-process imports, and SDK validation command.
The user's intervening commit `8385c90` is preserved; no assistant commit was made.

Next: resolve R3's omission/applicability, scenario/assignment distinction, lineage,
identity and reporting-count policy, then approve a bounded slice. Do not change
production token emission, saved-impact denominators, persistence, or authoring schemas
from this checkpoint. R4 portable derivation/taxonomy proposals and final revised
acceptance also remain open. Suggested roadmap clarification remains unapplied.

The previous baseline-spacing/non-color mapping recommendation and completion
sequence below are historical and **superseded as the immediate priority**.
Retain their evidence and verified code; do not delete or revert existing work.
The narrow color mapping remains an output diagnostic, not the canonical future
taxonomy. Resolver conformance remains required for resolved-output claims, but
its unsupported product-context case does not block source-evidenced proposals.

### R3 reporting approval and bounded design: 2026-10-06

The user asked to proceed, then explicitly selected an architecture slice and
approved the bounded reporting policy: declarations imply no assignments; equal
values never merge explicit assignments; omitted context is reported as omitted,
not interpreted as wildcard/default; authored lineage is distinct from effective
output. Canonical materialized counts require explicit evidence and are otherwise
unavailable. This is EPIC-7.1/7.3 reporting work, not a canonical-emission decision.

Add independently versioned optional input/report metadata for scenarios, recipes,
declared bindings/references, source assignments, and row provenance. Keep all
existing token records, IDs, comparison mappings, metrics, and record-content hashes
unchanged. Non-color Cartesian projection rows are evaluation samples; color cascade
rows are existing generated output, with serialized context omissions retained.
Reference token rows are inventoried authored source records, not proof of manual
origin, resolved winners, or canonical coverage. Browser value edits remain explicit
assignments even where values happen to coincide; an unassociated source edit must
not be invented as an effective override. Record known baseline/edit lineage without
claiming a platform/product graph or inventing missing exporter provenance.

Declared bindings/definition references are source evidence, not a sensitivity test
or proof every evaluated axis affects a value. Definition/evaluator version limits
remain explicit. Reuse the same generator calls; no new evaluator or resolver.
Existing reviewed mapping-specific default normalization remains an output diagnostic;
new reporting metadata must not convert those omissions into authored assignments.

Extend the existing Analysis view/evidence/download patterns, not a new reusable
component or Storybook story. Preserve saved/working/default isolation, previews,
Save/Cancel/revert, publication flags, changes/impact denominators, and storage. Keep
`componentSize` in typography pending EPIC-2.5. No platform editor, upstream changes,
new profile/CLI flags, density adaptation, portable authoring schema, roadmap edit,
or R4 implementation is authorized. Verify unused declaration versus samples,
explicit binding, equal assignments, platform-local context, lineage, malformed and
partial metadata, CLI/page parity, source isolation, directly affected UI/browser
paths with empty pageerror assertions, lint/build and deterministic reports.

### R3 verified reporting checkpoint: 2026-10-06

Implemented additive `outputMetadata.schemaVersion: 1` on adapter inputs and
`materialization.schemaVersion: 1` on report v1. `materialization.ts` owns report-only
scenario, recipe, assignment, observation, validation, inventory and Markdown logic;
`projectionMetadata.ts` records existing authored recipe references/bindings and value
edit evidence. The pure canonical JSON helper is extracted with the existing
`comparison.ts` export retained. All current token records and generation calls remain
unchanged; no persisted identity, authoring schema or production export is altered.

Non-color Cartesian projection rows are evaluation samples, not inferred assignments.
Color cascade rows are existing generated output with only their serialized context
recorded; omitted axes are retained without wildcard/default interpretation. Known
browser edits retain assigned values and the authored edit baseline independently of
the regenerated baseline, linked to exact-mode non-color observations. Name-only edits
are not value assignments. Unassociated color/legacy edit evidence is inventoried but
not falsely attached to effective rows: the existing color exporter lacks per-row
baseline/edit provenance. Reference records retain source locations and recognized raw
qualifiers, not inferred manual origin, recipe lineage, platform winners or coverage.
The SDK/spec lineage disagreement stays open; no substitute resolver is introduced.

Recipe references/bindings are explicitly declared-only evidence, with evaluator version
unestablished. They are not a complete dependency graph or numerical sensitivity test.
Reporting-only recipe/scenario/assignment IDs do not remint persisted token/concept IDs.
Mode declarations never create assignments; equal values do not collapse explicit
assignments. Canonical materialized counts are unavailable, not zero or the existing
Cartesian row count. Existing comparison-specific reviewed default normalization remains
a bounded diagnostic, not new assignment semantics.

Analysis now labels and filters row provenance, summarizes independent observed
inventories, and shows scenario/recipe/assignment lineage with existing evidence controls.
JSON and Markdown downloads contain the same full metadata regardless of active filter.
Malformed metadata is rejected; last-good stale downloads survive transport/metadata
failure; partial source inventories retain provenance. Legacy responses lacking the
adapter expose unclassified rows and unavailable provenance rather than invented facts.
Saved/working/default isolation, Save/Cancel/revert and temporary-preview exclusion remain
intact. No saved-impact/changelog denominator, Home score, storage, component-size
ownership, foundation mode key, density mapping, upstream file/ref, roadmap status,
dependency, commit or push was changed by this slice.

Verification: all 24 non-SDK standalone commands pass, including the new materialization
check. Fourteen focused browser tests pass with empty pageerror assertions, including two
new provenance tests, expanded non-color edit lineage/Save/Cancel regressions, shared
JSON/Markdown CLI/page metadata parity through real disposable-checkout refresh,
architectural-plane regressions, keyboard/mobile interactions, malformed/partial/legacy
recovery, hosted unavailability, and the minimum color smoke path. Lint/typechecks and
build pass; the pre-existing large-chunk warning remains. No full app/Storybook rerun or
fresh full-SDK conformance pass is claimed.

Real report output preserves the previous findings, metrics, concepts, mapping version,
comparison policy and record hashes exactly: 12,691 output findings and 352 assessable
color pairs (10 equal, 342 different). App inventory is 3,318 observed token rows: 2,028
evaluation samples and 1,290 generated output rows, with zero shipped value-edit
assignments. Reference inventory remains partial: 2,533 observed authored source records
and source assignments, not validated canonical coverage. Both canonical materialized
counts are unavailable. The command continues to exit nonzero for the same 12 upstream
SDK diagnostics; unsupported product-context resolution and binary/source correspondence
remain limitations. Review pins are not auto-rebaselined to hide changes.
Repeated final JSON/Markdown generation is byte-identical. Changed-document local links
and whitespace checks pass; production bundle/source-map inspection excludes the Node
assessment loader, curated registry/pins, child-process imports and SDK command.

Next gate: approve R4's versioned portable derivation/taxonomy proposal scope and choose
the first artifacts/evaluation contracts to propose. R3 reporting acceptance does not
settle canonical omission/fallback, applicability, emission, lifecycle/migration, layer
query semantics, density retirement, or saved-impact denominator policy. Broader runtime
changes still need expanded approval; final target-contract acceptance remains open.

`docs/ROADMAP.md` is unchanged. Its 1:1 wording and long-horizon portability status
need separately approved clarification; do not silently change epic statuses,
implementation order, or open product/structure/platform decisions from this plan.
Historical checkpoints below retain their original run results and exclusions.

### R4 proposal and fixture approval: 2026-10-06

After the R3 handoff, the user asked to proceed and explicitly selected an architecture
slice for a detailed versioned portable-contract proposal with isolated executable
round-trip/reference-preservation examples. Start with existing dimension formulas,
interpolations, ordered rounding rules, bindings, and spacing/size recipes, including
typography as a consumer/provenance boundary. Include PR #1454 taxonomy migration
evidence, distinguishing recorded draft transformations from proposed target rules.

Scope: a proposal document and test-only fixtures/checks using current generators,
parser, source validators and immutable already-cached PR objects. No production
schema, serializer/importer, evaluator, editor, dependency, storage migration, upstream
submission/fix, profile selection, or app/CLI/UI behavior change is authorized. No
fetch/checkout/SDK execution against draft data. A passing native JSON round-trip is
bounded evidence, not proof of target-schema or independent-language conformance.

Propose version/scope/typed-reference, unit/evaluation, validation, dependency/cycle,
lifecycle/migration and supported-export boundaries with open decisions clearly marked.
Preserve present IDs, ordered state/condition/binding arrays, literal/alias intent,
edit baselines and unknown proposal annotations. Keep app defaults and generation
unchanged; `componentSize` remains in typography pending EPIC-2.5. Surface native
fallback/permission/validation limitations instead of silently treating them as the
target. Review the proposal and test evidence before choosing any production contract.

### R4 verified proposal checkpoint: 2026-10-06

Delivered [PC-0.1 portable authoring/taxonomy proposal](design-data-portable-contract-proposal.md)
and `pnpm test:design-data-portable-contract`. The first family covers current dimension
formulas, method/expression interpolations, ordered rounding rules, bindings and
spacing/size consumers, with typography's specialized consumer behavior retained as a
separate characterization. The document proposes transport/artifact/evaluator/taxonomy
version boundaries, scoped typed references, quantities, permissions, validation stages,
dependency/cycle constraints, lifecycle/rebase and export/migration boundaries. All are
proposals; no target schema, importer, evaluator, graph, editor or migration was built.

Test-only native envelopes preserve exact JSON-representable programs, flags, references,
ordered conditions/curves, opaque review annotations, and native browser edit baselines.
Current generators reproduce dimension, typography, interpolation and projected-record
content after round-trip; one exact-mode edit remains one applicable effective override.
Object-member enumeration is not treated as semantic record order. Passing native
serialization/reproduction is not proof of a new adapter, target validity, bit-lossless
numbers, independently implemented language, or cross-platform evaluator conformance.

A recorded PR #1454 alias-token specimen is preserved under `tests/fixtures/design-data/`.
Both file SHA-256 hashes and before/after records were checked read-only against the
already-cached immutable merge-base/head blobs. The draft decomposition preserves UUID,
concept ID, alias target, schema declaration, lifecycle and legacyKey. It remains
unanchored: global/component ownership is an open PR question, not target conformance.
An original-record ledger and synthetic consumer references demonstrate preservation
without implementing migration or claiming actual relationship-schema validation.
A separate synthetic selected/hover example retains one owner-scoped states catalog
and ordered bucket references; no accepted trigger-placement SPEC rule is invented.

Source characterization also records three important boundaries, not approved fixes:
dimension base bindings bypass `base.adaptable`; native dataset validation does not
fully check interpolation expressions; non-finite arithmetic must not be interpreted
as valid null-valued JSON output. Native fallback, locked neutral-point normalization,
numeric/ties/resource semantics and typography specialization are explicit review
inputs rather than silently adopted portable behavior. PC-0.1 D-01 through D-08 retain
schema placement/version authority, identity/revisions, evaluation, units/permissions,
invalid/unknown semantics, lifecycle/rebase, taxonomy ownership and canonical emission/
layer behavior as decisions before production implementation. No JTC/PR finding is closed.

Verification: 25 non-SDK standalone commands pass, including the new fixture check;
lint/typechecks/build pass (existing large-chunk warning remains). Fourteen focused
Analysis/reference-refresh/hosted/color browser regressions pass with empty pageerror
assertions. No production application module was changed by R4; only proposal/approval
documentation, a test-only recorded fixture/test and package test registration were
added. No dependency, defaults, storage, generator, UI, upstream source/ref, schema,
roadmap status, commit or push change was made. No full app/Storybook or fresh SDK
conformance run is claimed. Reviewed pins remain unchanged rather than auto-rebaselined.
Final report regeneration is byte-identical across repeated runs and preserves prior
output fields, R3 inventories and record hashes; the same 12 SDK diagnostics retain
nonzero exit status. Local documentation links/whitespace pass and production bundle
inspection excludes the R4 fixtures and all Node assessment/SDK machinery.

Next: review PC-0.1 and disposition D-01 through D-08. A proposed contract is not an
adopted target: do not mark final convergence complete, create schema/editor/migration
work, or broaden mappings merely because these examples pass. Obtain a specifically
bounded approval for any chosen follow-on runtime implementation. Suggested roadmap
clarification remains unapplied until the user separately approves it.

### Contract review and authoring-storage clarification: 2026-10-06

The user requested the next steps in this plan, chose an architecture-slice review of
D-01 through D-08, and approved the local D-01/D-02/D-06 direction: separate authoring
artifacts from token outputs, preserve existing IDs with scoped/revision references,
retain edit baselines and require reviewed upgrades without automatic override rebasing.
Exact schema URIs/reference encoding remain provisional; no production format adopted.

The user did not accept the abstract D-03–D-05 transfer-contract question, instead
clarifying the product purpose: foundation authoring state/localStorage must produce
new foundation data under proposed foundational schemas for eventual design-data
commits, and must generate and store spec-conforming token data in localStorage.
They then explicitly chose **update while editing**: working source and generated
tokens stay synchronized, Save establishes the baseline, Cancel restores both, and
temporary previews do not persist generated tokens. Do not reinterpret this as
approval of a new evaluator, strict-transfer policy, draft schema profile or runtime
permission fix. D-07/D-08's unresolved upstream ownership/canonical policies remain open.

Prepared [the concrete authoring/storage contract and next build packet](../design-data-authoring-storage-contract.md).
It traces current native persistence/derived-token/Save/Cancel behavior and documents
the missing durable artifact pair. It proposes one captured source feeding commit-ready
foundation artifacts and design-data token output, with native source ownership,
schema/profile checks, revision pairing, coalescing/stale-job suppression, reload and
invalid/quota handling. Tokens are derived artifacts, not a second editable source.
R3 Analysis samples must not silently become the canonical persisted token collection.

Recommended next production slice, **not yet approved**: spacing/size foundation
artifacts plus token materialization and local persistence, using existing generators.
First settle the proposed artifact shape/references, explicit token schema/catalog
profile and naming/value adapter, emission/identity policy, and storage/failure lifecycle.
Keep color/typography support as separately verified follow-ons, existing saved-impact/
changelog baselines unchanged, and `componentSize` in typography pending EPIC-2.5.
No application/schema/storage behavior, source defaults, upstream source/ref, roadmap,
commit or push change is made by this review; no new runtime verification is claimed.
Documentation links and whitespace checks pass. Refreshed JSON/Markdown reports are
byte-identical on repeated generation; existing output fields, R3 inventories and
source record hashes are unchanged. The same 12 SDK diagnostics retain exit 1.

### Spacing/size artifact implementation approval: 2026-10-06

The user approved building the architecture slice: real proposed foundation artifacts,
generated tokens and synchronized localStorage persistence with Save/Cancel/reload and
failure coverage. They selected proposed structured names containing `property`, stable
`foundationScale` and numeric `scaleIndex`, px values, and explicitly requested UUIDs.
This is a labeled local joint-target profile, not claimed current normative-schema
conformance. Current numeric-field/schema disagreement remains visible; no upstream
schema/file is patched or draft SDK executed.

Approved emission: one unqualified baseline per primitive; additional mode-qualified
rows only for explicit recipe bindings or exact-mode value overrides. Declaring unused
modes does not duplicate output; equal explicit assignments stay distinct. Preserve
source scale IDs, deterministic token UUIDs through ordinary renames, native generators,
manual-edit baselines and publication flags. Foundation artifacts retain definitions,
recipes, mode declarations and source-input provenance rather than only output values.

Use a single additive versioned artifact entry with separate foundation and token
payloads and a source fingerprint. Existing native persisted atoms remain authoritative;
no hydration from generated tokens or destructive migration/reset. Coalesce edits,
suppress discarded jobs, regenerate after Cancel/reload, exclude previews, keep last-good
artifacts stale on failure, and expose generation/storage failures without changing Save
semantics or impact/changelog denominators. The first profile validates only spacing/size;
color/typography, final upstream adoption, canonical platform/layer policy and Git commits
are excluded. Extend existing status presentation, not a new unique component/story.

### Spacing/size artifact implementation checkpoint: 2026-10-06

The approved first real authoring-output persistence slice is implemented. See the
[schema/storage contract](../design-data-authoring-storage-contract.md#approved-spacingsize-implementation-and-verification)
for schema identifiers, field ownership, emission, failure and compatibility details.
Actual JSON Schema objects validate the proposed foundation source and structured
dimension tokens with UUIDs; the profile is explicitly local/proposed, not mislabeled
as accepted upstream normative or SDK conformance. Source definitions, typed scoped
snapshot references, declarations, native overrides/baselines and captured generation
inputs remain separate from token objects and lineage.

The additive key `leonardo:v1:artifacts/dimensions` (bundle v1) stores the paired artifacts
from existing authoritative authoring state. An always-mounted hook updates working
output independently of Analysis, coalesces changes, uses synchronous source/status
subscriptions and suppresses late discarded work. Save/Cancel/reload preserve native
baselines and regenerate matching output; previews do not persist tokens. Corrupt caches
are reproduced/validated before use and rebuilt from native source, never used to hydrate
foundation programs. Invalid generation or IO failure exposes stale/non-durable status
and preserves source/unrelated storage. No destructive migration/reset or shared persist
helper change was made; existing native writes and the artifact bundle are not a global
transaction. Fresh app state can seed generated artifacts without importing upstream data.

One unqualified baseline is emitted per published primitive. Mode records arise from
explicit bindings or exact-mode value overrides, not unused axes or the Analysis matrix.
Equal explicit assignments remain distinct; unsupported/orphan assignments cannot silently
produce a complete artifact. Stable scale IDs and step/context seeds produce token/concept
UUIDs independent of display labels; existing native/report IDs are unchanged. Current
generators and signed finite values are preserved; no alias/layer evaluator is invented.
New artifact status is added below the existing Analysis content to preserve filter layout.

Verification: 26 non-SDK standalone checks and final lint/typechecks/build pass. Twenty
focused browser tests pass at 2200×1000, including explicit mobile Analysis checks and
empty pageerror assertions. New tests cover persistence before opening Analysis, both
dimension token-edit lifecycles, Save/Cancel/reload, recipe edits/renames/UUID stability,
quota failure and corrupted-cache recovery. Unit checks also cover publication, unused
modes, bound recipes, equal assignments, unsupported bindings, stale/noncanonical edits,
fingerprints, schema/alias/profile negatives, invalid source, discarded-job suppression,
preview exclusion and cache reproduction. Existing Analysis/CLI-refresh/spacing/color/
hosted workflows pass in this wide-desktop run. Full app/Storybook/SDK conformance was
not rerun; the existing build-chunk warning and 12 SDK diagnostics remain limitations.

Standard-width runs are not passing: Change log panel pointer interception obstructed
token editor clicks, first in three existing regressions and later in new artifact tests.
The functional paths pass at the wider viewport. User changes removing a wrapper in
`src/pages/BrowsingContext.tsx` and editing Home were preserved, not reverted. Causation
was not proven by undoing that work; no responsive layout repair is authorized or claimed.
Obtain user direction for that separate layout scope and finish default-width acceptance
before calling the overall browser gate complete. Earlier interrupted runs are not passes.

Native source, existing generator math, shipped data, current impact/changelog counts,
upstream files/refs, dependencies and roadmap remain unchanged by this slice. No new
reusable component/story, commit or push was introduced. Color/typography artifact
conversion and final joint-schema/catalog/platform/layer/Git behavior remain separate gates.

### Session handoff: 2026-10-05

Read these durable outputs before continuing:

- [Internal audit](architecture-alignment-audit.md): eight findings, maintained
  area coverage, storage/default matrix, architectural decisions, and baselines.
- [Design-data review](design-data-alignment-review.md): all 20 current schemas,
  23 spec documents, 59 catalogued rules, reference-data inventory, and mappings.
- [Gap register and approval packet](design-data-alignment-gaps.md): nine gap
  entries and proposed slices A-E, with scope and acceptance checks.
- [Joint target contract](../design-data-target-contract.md): current governing
  direction, architectural conflict matrix, and R1-R4 proposal/approval boundary.
- [Draft PR #1454 review](../design-data-pr-1454-review.md): pinned future taxonomy
  evidence, independently inspected migration facts, scoped checks, and open gaps.

Baseline: 15 package-listed unit checks and three additional standalone checks
pass; 25 representative browser tests and production build pass. Lint has seven
errors/one warning; direct app typecheck has 49 diagnostics; the standalone
changelog assertion fails at 304 versus 310. Existing upstream SDK validation
reports 12 errors and 1,380 warnings, with binary-freshness caveats.

At the audit checkpoint, no app/source/default changes, upstream modifications,
storage resets, dependency installs, or commits had been made. Subsequent approved
implementation is recorded below. Preserve user ChangelogPanel edits.

Approval update: the user approved A-C after receiving the packet. Implement
verification, validated defaults composition, and scoped shared-method cleanup.
The comparison command and Analysis page are follow-on work, not this batch.

### Implementation handoff: 2026-10-05

Phases 1 and 2 produced the audit and upstream review linked above. Phase 3
produced the gap register and approval for A-C. The approved Phase 4 work is now
implemented:

- A: explicit app/tooling typechecks, scoped API/type/lint repairs, exposed
  standalone checks, and a changelog assertion that preserves fixed palette
  concepts in the denominator without counting them as changed.
- B: a pure authoring dataset contract, generated checked-in JSON Schema,
  schema-drift command, and runtime shape/identity/reference validation. The
  loader composes and freezes existing JSON plus existing code-defined formulas.
- C: shared default-mode, binding-record, and reference-writing helpers; a
  state-free color resolver with a compatibility export. Existing generators
  remain authoritative; Jotai orchestration was not redesigned.

Verification: all 20 package-listed standalone checks, `pnpm lint`, and
`pnpm build` pass. The full application browser run passed 72 of 73 tests and
identified mobile search collapsing to zero width. After the scoped TopBar
repair, all four TopBar tests and lint pass. All 25 Storybook tests pass; a
logged dialog-animation assertion was then repaired and its focused test passes.
These are recorded run results, not a claim that the full suites were rerun
after the final focused repairs. Build retains its large-chunk warning.

The raw shipped JSON remains unchanged. No upstream records were imported, no
storage reset or persistence-format change was made, and reference repositories
were not modified. No commits, pushes, or roadmap edits were made. New dependencies
support app-owned validation/schema generation, not upstream data adoption.

Next implementation boundary: D (Phase 5) builds the comparison engine, local-checkout
command, and JSON/Markdown reports; E (Phase 6) adds the separate live Analysis
page and saved/working authoring comparisons. The user explicitly approved both
on 2026-10-05 after the A-C completion handoff. Neither existed at approval;
completion of A-C is not completion of the entire plan. Report and Analysis
verification remain required gates. Other exclusions still apply.

### D/E pause checkpoint: 2026-10-05

Implemented:

- Pure report model, deterministic comparison engine, and all-foundation app
  projection through existing generators, separate from authored definitions.
- `pnpm analyze:design-data`, configurable checkout/SDK/mapping/output paths,
  protected output destinations, and JSON/Markdown artifacts under
  `reports/design-data/`. Valid differences exit successfully; invalid required
  inputs exit nonzero while retaining a partial report.
- Dynamic reference category/schema/mode discovery, row/file/concept metrics,
  evidence locations, source hashes/revisions, and SDK binary provenance.
- Separate S2 Analysis navigation with shipped-default, saved, and working
  comparisons; search/filter/evidence/download controls; explicit unavailable,
  partial, and stale states. Home metrics remain unchanged.
- Allowlisted development-only reference endpoint and debounced watcher refresh.
  Hosted builds show an unavailable state; no filesystem loader ships in the
  browser. Analysis does not reserve the editor changelog column.

Verification at this checkpoint: all 21 standalone checks, lint, and build pass.
The three fixture-backed Analysis workflows pass, covering defaults isolation,
Save/Cancel, actual filesystem-triggered refresh, stale downloads, missing input,
and desktop/mobile overflow with pageerror assertions. The real-checkout Analysis
download test passes. Thirty additional color/evaluation/palette/mode/changelog
browser checks and the three minimum color/Home checks pass on the warmed isolated
server. Desktop/mobile screenshots were collected. A broader concurrent browser
run failed during development startup; it is not recorded as passing. Cold macro
CSS/dependency-scan failures remain an observed development-tooling limitation.

Real reports contain 13,043 findings across 15 categories and 12 upstream SDK
validation errors. The reference content hash is unchanged across runs, and the
raw shipped app JSON is unchanged. No data import, storage reset, reference edits,
commits, pushes, or roadmap changes were performed by this implementation.

Remaining acceptance work at this checkpoint (updated by the next checkpoint):

- Populate and review semantic mappings. The engine accepts reviewed ID pairs,
  but the default library is empty and the real report has zero confirmed matches.
  Inventory-only findings are not proof of missing product features or value
  equivalence. Add dedicated field/type/mode/platform/extension diagnostics where
  reviewed mappings permit them; generic inventory findings are not substitutes.
- Establish the SDK/schema provenance needed for resolved aliases and broader
  cascade/layer conformance. Current comparisons explicitly leave unresolved
  aliases and unequal units unassessable; they do not implement a substitute
  resolver or prove cross-unit equivalence.
- Close remaining mapped composite/structure and resolution fixtures before
  calling Phase 5 comprehensive. Phase 6 can display those richer reports through
  its existing shared model; mapping refresh parity will need corresponding tests.

Resume from those boundaries, not the original audit. The usable local preview
at this checkpoint is `https://localhost:5267/`, started with `DESIGN_DATA_PATH`
set to the local checkout. This URL is session-specific, not an app dependency.

### Startup and mapping checkpoint: 2026-10-05

The interrupted startup repair is verified. A local pnpm patch for
`unplugin-parcel-macros@0.1.1` retains generated CSS that other transformed modules
still import. Its regression test covers shared CSS surviving a retransform.
Vite scans the lazy Analysis entry up front and excludes the build-time macro
import from dependency scanning. Installation used the local store with zero
downloads. Cold-server Analysis workflows and the minimum color smoke pass;
the startup failure is not a dependency on future alignment work.

The first default reviewed mapping, `foundation-color-ramp-v1`, now pairs
generated app color-ramp ordinals with foundational upstream palette ordinals.
It retains independent UUIDs and requires exact hue family, ordinal, and declared
color/contrast context. It does not infer equal contrast, RGB, custom names,
component semantics, extra mode axes, or multimode equivalence. Duplicate targets
remain ambiguous. The CLI and page use the same mapping version; explicit CLI
mapping inputs can replace the built-in library.

Current real reports have 12,691 findings and 352 assessable mapped rows: 10 equal
and 342 value differences under the declared tolerances. The command still exits
nonzero for 12 upstream SDK validation errors. It does not rewrite either input.
The earlier zero-match count is historical, not the current implementation.

Mapped representation-shape differences now have their own finding class and are
excluded from the assessable-value denominator. Composite fixtures distinguish
shape incompatibility, reordered object fields, and changed values. Unassessable
findings include explicit unresolved-reference, unit-context, or missing-value
reasons. Declared-default, context-isolation, and ambiguity fixtures pass.

Checks: macro regression, comparison/CLI/authoring fixtures, lint, build, all three
Analysis browser workflows, cold-server color smoke, and real-reference Analysis
download pass. Browser checks assert empty pageerror lists. The large build-chunk
warning remains. User Home edits are not changed by this work.

Next: reviewed mappings beyond foundational color ramps; dedicated field/type/
mode/platform/extension diagnostics; broader resolved-alias and cascade/layer
conformance with established SDK/schema provenance; contextual composite/unit
equivalence. These acceptance items remain open. The current preview is
`https://localhost:5317/`; older checkpoint ports may no longer be running.

### Resolution adapter recovery checkpoint: 2026-10-05

The interrupted SDK conformance adapter is recovered and its targeted checks
rerun. The installed read-only SDK passes alias-after-cascade, base fallback,
and specificity fixtures. The product-layer fixture requires a separate
`product-context.json` input that this adapter's SDK `resolve` command cannot
accept. Its result is **unsupported**, not a proven resolver precedence failure.

The reference source records individual statuses and fixture content SHA-256;
the report and Analysis expose that provenance. Resolved-value comparison remains
disabled. `test:design-data-sdk` is a full-conformance gate and currently exits
nonzero for the unsupported case; this is not a passing check or an app defect.
Comparison/CLI fixtures and effective app/tooling typecheck pass after recovery.

Fixture SHA-256 at this checkpoint:
`c6b06ac9c195c4cf793a1832fecdb57fbd8a53919c207004fe10f75c28e8dfd2`.
No upstream files or shipped defaults were changed. User Home edits are preserved.

Next small chunk: dedicated field/type/mode/platform/extension diagnostics on
existing normalized inputs, with fixture coverage and a saved checkpoint before
further mappings. Broader layer conformance requires a supported product-context
adapter; do not flatten layers into token arrays or enable alias comparison merely
because the three narrower fixtures passed.

### Extension and mapped-name diagnostics checkpoint: 2026-10-05

Reviewed rule, formula, interpolation, and adaptive-claim authoring definitions
now have informational `extension` findings instead of being labeled missing app
support. Their original values and evidence are retained. Invalid app input is
not reclassified as an extension; invalid reference input does not change known
app ownership into a coverage claim.

Confirmed token pairs can also emit supplementary `field-gap` and `type-gap`
findings for structured names. Reviewed field renames and integer normalization
are honored; mode-context fields are not compared as ordinary name fields.
Matched-pair counts are deduplicated so a value result plus name diagnostics still
counts as one match. Unmatched inventories do not gain speculative field gaps.

Verification: comparison/CLI/authoring fixtures, app/tooling typecheck, lint, and
production build pass. A focused Analysis browser fixture exercises extension,
field-gap, and type-gap filters, evidence, and JSON downloads; it verifies a
single matched pair and an empty pageerror list. The large-chunk warning remains.
Shipped defaults, upstream sources, and user Home edits were not changed.

Next small chunk: informational mode/platform vocabulary and context diagnostics,
with evidence, independent denominators, and invalid-input suppression. Broader
resolution remains disabled; the unsupported product-context SDK gate and further
semantic mappings remain open. Do not mark all Phase 5 acceptance complete.

### Completion approval and projection-parity checkpoint: 2026-10-05

Following the project evaluation, the user approved beginning the recommended
completion order and reaffirmed the architecture-slice approach. The first batch
repairs projection parity, mapping-input validation/partial reports, and Markdown
provenance. No new editors, UI redesign, data adoption, storage reset, upstream
changes, roadmap edits, commits, or pushes are included. Broader mappings and SDK
resolution require their own evidence and remain later boundaries.

Projection parity is implemented. Reporting now uses the existing token source
adapter and edit resolver for typography, spacing, and size; effective names are
shared across modes and values apply only to the exact stable mode-ID combination.
Existing report row/concept IDs are retained during token overrides. The existing
bindable-parameter and typography mode resolvers have pure owners with compatibility
exports; reporting excludes previews and honors unowned base bindings, non-default
mode ownership, publishing flags, and pending dimension rounding rules.

Checks: comparison/CLI/authoring fixtures, defaults/schema drift, the ten affected
token/mode/foundation/changelog/impact checks, lint, and build pass. Twenty-six
focused browser tests pass, including three new effective-token Save/Cancel/defaults
isolation workflows, all prior Analysis workflows, token editing/publishing,
changelog reverts, spacing/text zoom, and minimum color smoke. Their pageerror
assertions pass. This is not a full-suite rerun. The known Home copy assertion and
unsupported product-context SDK gate remain outside this repair.

The default projection SHA-256 remains
`0c0afbeeac38db65d3b950714592d72aaa461f35a2d6fd6c356654cd1ae10835`.
Shipped JSON and upstream sources are unchanged. Existing `src/index.css` and
`src/views/home/Home.css` edits are preserved. The large build-chunk warning remains.

Mapping-input validation is also implemented: all required IDs/rationale and
optional field maps, integer normalization, and mode-default lists are validated
before comparison. Invalid explicit mappings do not fall back to the built-in
library. Eleven malformed-mapping CLI fixtures verify exit 1, retained JSON and
Markdown diagnostics, and unchanged reference input; a valid optional-field fixture
still exits 0. Comparison fixtures, lint, and build pass after this repair.

### First completion batch verified: 2026-10-05

The first three evaluation recommendations are implemented and verified. Markdown
now includes report/mapping versions, source roots/kinds, dataset/spec versions,
revisions, content hashes, dirty-source status, validator identity, generation
context, tolerance/alias policy, schema inventory, separate category/file/concept
metrics, input failures, conformance limits, match confidence, and both evidence
locations. The browser download is checked against the same shared formatter.
Effective non-color override rows retain their generated-name/value baselines in
evidence; authored edit definitions remain separate from generated output records.

Verification: all 22 non-SDK standalone checks pass. The final 26-test application
subset passes; after adding explicit override evidence, comparison fixtures and all
seven Analysis workflows were rerun and pass. All 25 Storybook browser tests pass.
Final lint/typechecks, build, and diff whitespace checks pass. Every selected
browser smoke path retains and passes its empty-pageerror assertion. No complete
application-suite rerun is claimed; the known Home copy assertion remains unrelated.

A concurrent user navigation edit introduced unused Brush/ChartTrend imports in
`NavSidebar.tsx`. The user explicitly approved removing only those two imports;
their ChartPie icon and commented Design navigation item remain intact. After that
cleanup, lint/typechecks/build and the eight-test Analysis/minimum-color subset
were rerun and pass with empty pageerror assertions. No navigation redesign was
implemented by this batch.

The checked-in JSON/Markdown reports are refreshed. Repeated generation produces
byte-identical artifacts with stable input hashes: 12,691 findings, 16 app-owned
extension findings, and 352 assessable color pairs (10 equal, 342 different).
Exit 1 still reflects 12 upstream SDK validation errors, not value differences.
Resolution provenance still reports three passed fixtures and one unsupported
product-context fixture; resolved-value comparison is disabled. Neither SDK
freshness nor comprehensive cascade/layer equivalence has been established.

Next boundary: finish informational mode/platform diagnostic browser coverage and
review further semantic mappings. Broader resolution requires a supported
product-context adapter; contextual unit/composite equivalence remains open.
Do not mark Phase 5 or Phase 6 acceptance complete from this checkpoint. No shipped
JSON, persistence format, reference data, roadmap, or user CSS changes were made by
this batch. No dependencies, new UI components, commits, or pushes were introduced.

### Mode/platform diagnostics and mapping-review checkpoint: 2026-10-05

The user approved proceeding with the recommended next batch and reaffirmed an
architecture slice: finish foundation mode/platform diagnostics and CLI/page
verification, then review non-color mapping candidates before implementation.

Confirmed row identities now retain their pairing when contexts differ and emit
informational mode/platform diagnostics plus an unassessable value result, rather
than becoming unrelated inventory rows. Explicit mappings cannot equate two
omitted modes without the required declared defaults. Matched mode declarations
can separately report vocabulary and declared-default differences. Context fields
used by reviewed default mappings are excluded from ordinary name-field gaps.
Required app/reference/mapping input failures suppress speculative coverage gaps.
Supplementary diagnostics do not inflate matched-pair or assessable-value counts.

The reference adapter retains each registry's declared type as vocabulary evidence;
platform vocabulary is discovered by `type: platform`, not guessed from filenames,
labels, or ID equality. App platform declarations and reference platform terms keep
their independent category denominators and remain unmapped unless reviewed.
No manifest, product layer, restriction engine, platform alias, or mode crosswalk
was implemented.

Verification: all 22 non-SDK standalone checks, lint/typechecks, build, and the
nine-test Analysis/minimum-color subset pass. A new integration test launches an
isolated Vite server against a temporary checkout with an explicitly labeled stub
SDK. It verifies filters/evidence, JSON/Markdown downloads, CLI/page findings and
metric parity, actual watched declaration reload, invalid JSON suppression/partial
reports, and recovery. The test also adds a palette row to that temporary checkout
and verifies the existing reviewed color mapping is recomputed on live refresh,
with CLI/page parity and no report-output watch loop. Its extended focused rerun
passes and its pageerror list is empty. The stub is transport evidence,
not upstream validation or resolver conformance. Real upstream files are never
modified by the test. This is not a complete app/Storybook-suite rerun.

Non-color candidates are recorded in the design-data review and GAP-005/GAP-006
follow-up: 17 font-size, 10 spacing, and 15 size shared ordinals in specifically
selected baseline inventories. These are candidate counts, not confirmed matches.
Legacy property spelling, literal px representation, app-only axes, upstream density,
line-height roles, and source-family/scale identity still require reviewed policies.
No non-color mapping was added. The built-in version remains
`foundation-color-ramp-v1`, with 352 assessable real pairs and the same 12 SDK errors.

Scout discovery exposed no Scout tools; direct read-only source/schema inspection
was used. Defaults, generators, persistence, UI design, reference repositories, and
roadmap remain unchanged by this batch. Existing user/worktree changes are retained.
The large build-chunk warning remains. Resolved comparisons remain disabled.

Next: approve a narrowly scoped baseline-context and literal-px normalization policy
for the first non-color mapping slice, with typed source evidence and negative
fixtures. Do not treat app text scaling as upstream density or lift the unsupported
product-context conformance gate. Phases 5 and 6 remain acceptance-incomplete.

### Joint-contract and PR review documentation checkpoint: 2026-10-05

The user approved the documentation pivot and requested review of PR #1454 via
`feat/token-taxonomy-vocabulary-split`. The target proposal and architectural
conflict matrix are now documented; no new code slice or upstream schema is
approved by the documentation request. R1 is recommended next, pending specific
approval. R2-R4 and any canonical materialization/identity/storage change remain
separate gates.

PR #1454 is an open draft at `fa714564eaa33bc37f905fad64162d60d6a48087`, with
GitHub-reported merge conflicts. Its universal-versus-owner-scoped vocabulary,
element/attribute/affordance/visibility decomposition, and ordered interaction
bucket distinctions inform the proposal. They do not retire density or provide
portable derivation schemas. GitHub checks/author test claims are distinguished
from local inspection and the installed binary's provenance.

Read-only Git-object inspection confirms 551 structured token-row changes with
no UUID/value/alias-target changes relative to its merge base. A targeted check of
the branch's relationship `$defs.scope` fragment identifies 92 new legacy-state
array type errors: 173 total invalid scopes versus 81 pre-existing at merge base.
This is not a complete relationship/schema/SDK validation run; no branch was
checked out, rebuilt, or modified. Other PR findings include trigger-placement
validation, transitional prose/ownership, query capability, and profile/consumer
compatibility limits. See the review for evidence and discriminating checks.

Only documentation is changed in this checkpoint. Application behavior, defaults,
generators, persistence, reports, reference checkout, and roadmap are not changed
by this revision. Existing user and implementation work is preserved. No fresh
application-suite pass is claimed; prior verification results remain historical.

## Repository scope

The implementation repository is `spectrum-studio`. In the current workspace
its root is `/Users/nbaldwin/Documents/Protopack/spectrum-studio`.

"Design-data" means the `spectrum-design-data` repository, currently at
`/Users/nbaldwin/Git/spectrum-design-data`. Reference roots are configurable;
these machine-specific paths must not become hardcoded application dependencies.

Inspect these upstream sources read-only:

- `packages/design-data`: datasets, fields, modes, registries, components,
  relationships, guidelines, tokens, and supported loading interfaces.
- `packages/design-system-registry`: compatibility behavior and historical
  vocabulary. Its package description currently identifies it as deprecated;
  verify the authoritative successor and avoid counting the same records twice.
- `packages/component-schemas`: component API schemas. The originally requested
  `packages/design-data/component-schemas` directory does not currently exist.
- `packages/design-data-spec`: all schemas, normative documents, rules, schema
  references, examples, and conformance fixtures.

Inspect the `react-spectrum` and `leonardo` repositories only when tracing a
relevant dependency or existing method. Do not modify any reference repository.

## Approved choices and constraints

1. Audit all maintained application source, defaults, tests, styles,
   authentication/services, documentation, tooling, and configuration. Account
   for generated artifacts and dependencies without treating them as authored
   code to refactor.
2. Finish the internal audit before the comprehensive upstream review. Initial
   roadmap and instruction reading is required and is not the upstream audit.
3. Keep both reviews evidence-based. Record file/symbol references, severity,
   consequences, confidence, recommendations, and a discriminating check.
4. Do not import, copy, populate, or automatically replace app defaults with
   design-data. Do not regenerate upstream data or run mutating upstream tasks.
5. Keep unsupported authoring data in explicit app-owned models. Propose future
   spec enhancements; never label a proposal as an accepted spec feature.
6. Compare coverage, structures, and values. Differences are informational, not
   automatically defects or CI failures. Input/reporting failures are errors.
   Assess architectural requirements separately from output rows; an unused mode
   is not missing data, a proposal is not an accepted schema, and an SDK/spec
   disagreement must not be silently resolved in favor of either implementation.
7. Compare against the local checkout with a path override. Emit JSON and
   Markdown with input provenance and reproducible ordering.
8. Add a separate Analysis page; do not replace Home's existing insights.
   Keep shipped-default and authoring-state comparisons separate.
9. Include focused Storybook states and interactions for new reusable components.
   This approval does not require inventing reusable components unnecessarily.
10. Existing localStorage may be reset if necessary. Document the affected keys
    and format versions; do not clear unrelated storage or reset on Analysis load.
11. Preserve product behavior, identities during ordinary editing, Save/Cancel,
    overrides, baselines, and revert semantics. Do not implement unrelated epics.
12. Preserve user work and unrelated worktree changes. Do not commit, push,
    create branches, edit the roadmap, or change reference repositories without
    explicit authorization.
13. Keep current checkout, live upstream base, draft PR head, normative document,
    schema, SDK source/binary, app behavior, and target requirements as distinct
    authorities with pinned provenance. Do not merge snapshots or adopt draft
    field spellings merely because they serialize to unchanged legacy names.

## Roadmap and project rules

Read `AGENTS.md`, applicable local rules, `docs/ROADMAP.md`, and the existing
changelog, tokens-browser, and contrast-polarity plans before relevant work.

Primary alignment: EPIC-7.1 mappable models and EPIC-7.3 spec validation.
Supporting dependencies include EPIC-1.9 shared formulas, INIT-2 adaptive
systems, INIT-3 vocabulary, EPIC-5.5 rule proposals, INIT-8 platforms, and
INIT-11 insights. This is not authorization to implement those initiatives.

Preserve the roadmap principles: consistent terminology; formula/rule-driven
values with visible and revertible overrides; one generator for preview, tokens,
and exports; dogfooding; mappable models; pure-CSS web output.

Do not silently resolve open decisions about structures, taxonomy categories,
platforms, themes, non-web output, or product defaults. In particular,
`componentSize` remains in typography until EPIC-2.5 defines its destination.
Spacing and size stay independent of text zoom unless explicitly bound.

Follow S2-only UI, sentence case, Vite, current service/authentication rules,
and responsibility-based directories. The app remains client-only. A proposed
development-only Vite integration is not a production backend and must not ship
filesystem access in the browser bundle.

## Phase 1: internal audit

### Inventory and baseline

Inventory every tracked maintained area. Record exclusions and review coverage.
Separate intentional placeholders from unused or stale implementations. Trace
dynamic imports, stories, tests, assets, configuration, and generated outputs
before recommending deletion. Never infer dead code from text searches alone.

Record the initial worktree and run applicable baseline checks. Distinguish
pre-existing failures from findings introduced by this work. Do not fix unrelated
failures while establishing the baseline.

### Architecture and methods

Trace ownership and dependency direction across pages, views, panels, components,
features, contexts, state, data, generators, and export paths. Identify documented
decisions, inferred conventions, unresolved decisions, and accidental exceptions.

Inventory formulas, interpolation definitions, rounding, units, contrast/color
math, scale generation, token generation, formatting, validation, and selectors.
Compare input/output semantics and edge cases before consolidating apparently
similar methods. Identify consumers that should reuse an existing method.

### Models, defaults, and persistence

For every domain, record its default source, types, runtime validator, state
owner, persisted key/version, hydration, generator, editor, output, and tests.
Inspect both shipped JSON and the transformations applied by its loader.

Check required/optional data, reference integrity, identities, unit semantics,
duplicated state, partial validators, lossy conversion, inconsistent defaults,
storage errors, persistence envelopes, version upgrades, and reset behavior.
Distinguish authoring definitions from generated records and UI-only state.

For every editable domain, assess saved-change baselines, change-log sources,
token impact counts, system-wide token-concept and mode-value denominators,
generated/manual classification, overrides, Save/Cancel/revert, and browser
coverage. Never count untracked domains or draft previews as saved changes.

### Output and exit criterion

Write `docs/archive/architecture-alignment-audit.md` with coverage, architecture decisions,
method reuse opportunities, domain/storage matrix, findings, baseline results,
and remaining uncertainties. Phase 1 is complete only when every maintained
area has an explicit disposition. Do not start restructuring.

## Phase 2: design-data review

Revisit roadmap integration plans using the completed internal audit. Follow
upstream discovery and tooling rules, including Scout when available. If a tool
is unavailable, disclose the limitation rather than claiming its results.

Enumerate every current schema, value type, rule, normative document, and
referenced schema. Include tokens, datasets, manifests, cascade files, modes,
fields, registry values, components, anatomy parts, state declarations,
relationships, accessibility, guidelines, document blocks, product contexts,
platform extensions, and all value types. Discover additions dynamically; this
list must not become a closed subset. Separate binding requirements, proposals,
legacy formats, compatibility shims, and implementation limitations.

Trace data authorities and supported APIs across all reference packages. Review
UUID and concept identity, structured names, `value` XOR `$ref`, aliases,
mode defaults and multimode records, units/composites, lifecycle, restrictions,
platform/product layers, overrides, and cascade tie-breaking against current
sources and fixtures. Preserve source order where resolution depends on it.

Write `docs/archive/design-data-alignment-review.md` with a complete spec inventory and
bidirectional mapping matrix. Classify app domains as directly representable,
transformable, partially representable, unsupported, intentionally app-only,
or unresolved. Distinguish missing data from missing app functionality and
missing specification support. Reference exact evidence and versions.

## Phase 3: approval and extension design

### Joint target-contract supplement (current gate)

Use `docs/design-data-target-contract.md` and the PR review to evaluate the desired
architecture against current and proposed upstream contracts. Preserve the original
gap IDs and A-E approval records. Before new code, approve one of R1-R4 specifically
with affected files, alternatives, identity/persistence risks, and discriminating
checks. Directional approval of portable definitions or taxonomy refinement is not
authorization to implement those entire roadmap features.

Write `docs/archive/design-data-alignment-gaps.md`. For each gap include stable finding
ID, use case, app/upstream evidence, mapping limits, examples, identity and
reference rules, mode/cascade behavior, validation, lifecycle, round-trip
expectations, compatibility, export policy, and proposed ownership.

Prepare an approval packet with prioritized changes, affected files, dependency
order, alternatives, behavior risks, persistence/reset effects, tests, and
unresolved roadmap questions. Propose an explicit split between authoring
definitions, generated interoperable records, UI metadata, and extensions.

STOP here and obtain approval for specific implementation slices. "Start
implementation" authorizes the agreed audit/review sequence, not bypassing this
gate. Record the resulting approval and exclusions in this document.

## Phase 4: approved architecture changes

Implement only approved slices. Reuse established utilities and directory
ownership; avoid generic abstractions without a demonstrated need. Update all
consumers of changed contracts. Strengthen runtime validation instead of treating
TypeScript casts or a `$schema` string as proof of conformity.

Use existing generators for preview, tokens, exports, and reporting. Keep
authoring data lossless at its boundary. If a reset is necessary, version and
document it explicitly; preserve ordinary edit-session behavior. Maintain the
audit, mapping, and gap documents as code changes land.

After the first edit in each slice, run the cheapest discriminating check before
expanding scope. Do not silently convert a narrowly scoped repair into a rewrite.

## Phase 5: comparison engine and command

### Revised assessment requirement

Retain the implemented pure engine, CLI, source discovery, and deterministic output
comparison. Extend only approved slices to distinguish three assessment planes:

1. **Current-state audit:** data/schema/spec/SDK/app facts and their disagreements.
2. **Joint target-contract assessment:** approved requirements versus present
   capabilities, with proposed schemas/model decisions clearly labeled.
3. **Generated-output comparison:** reviewed semantic/identity pairs in established
   contexts; values and serialized names may differ legitimately.

Architectural findings must not require a token match, and equal values must not
close a semantic/schema conflict. Record capability levels separately: declared,
shape-valid, reference/vocabulary-validated, generated, serialized, queryable,
authorable, and round-trippable. Curated source observations must not appear as
executed or live conformance checks; attach reviewed profile hashes and staleness.
Preserve useful independently evidenced facts when another input facet fails,
while keeping the operational exit policy and partial-report diagnostics honest.

Keep authored definitions, explicit assignments/materialized records, evaluation
samples, and resolved views separate. Do not replace current counts or collapse
Cartesian rows until R3's policy and cross-domain effects are explicitly approved.
No architecture-wide match percentage or health score is approved. Expanding
ordinal/value normalization is deferred unless an approved target requirement
needs it. Existing aliases/unit/cascade limits remain visible.

The browser-independent engine under `src/features/`, Node entry point, and
`pnpm analyze:design-data` already exist. Preserve their approved boundaries and
`tsx` toolchain. A path override selects the local upstream checkout; a future
profile/branch adapter needs a separately approved read-only design rather than
switching or mutating that checkout.

Read shipped app data through the authoritative defaults contract and use the
same generators as the UI. Load upstream sources read-only using supported
interfaces. Never substitute localStorage or current edits for shipped defaults.
Compare authored definitions and generated output as separate record classes.

Match stable identities when present; otherwise use reviewed semantic mappings
with provenance. Do not invent cross-repository UUID equality, silently merge
duplicates, or infer equivalent names without evidence. Report ambiguity,
collisions, dangling references, unassessable values, and unsupported types.

Report upstream-only and app-only records, field/type/mode/platform gaps,
validation failures, structural incompatibilities, extensions, and intentional
value differences separately. Define unit/color normalization, tolerances,
contexts, authored versus resolved values, and coverage denominators explicitly.
Use upstream validators/resolvers or verified conformance fixtures rather than
an untested substitute cascade implementation.

Emit machine-readable JSON and readable Markdown. Include report schema version,
dataset/spec versions, revisions or content hashes, dirty-source status,
mapping version, scope, exclusions, input failures, and comparison confidence.
Keep canonical output deterministic; isolate timestamps from reproducible data.
Schema and category discovery must expose newly added types rather than skip them.

Exit successfully for valid comparisons containing differences. Exit nonzero
for unreadable or invalid required inputs and broken reporting, retaining useful
diagnostics. Do not add a mismatch-failing baseline policy without approval.

## Phase 6: live Analysis page

### Revised assessment presentation requirement

Reuse the existing separate Analysis page. After R1 and specific R2 approval,
distinguish current-state findings, target-contract requirements/proposals, and
output differences without replacing Home insights or redesigning authoring UI.
Show authority/profile, reviewed versus executed evidence, freshness, decision
status, ownership, and limitations. Preserve shipped/saved/working separation
within relevant planes; do not present curated proposals as live authoring data.
The current runtime page does not yet satisfy this supplemental requirement.

Maintain the separate page using existing navigation conventions. Put page composition
in `src/pages/`, report content in `src/views/`, and models/comparison logic in
`src/features/`. Leave Home's sample-based metrics unchanged.

Reuse the command's report model and engine. Provide summaries, searchable
findings, category/severity filters, evidence, explicit limitations, and downloads.
Include loading, error, empty, partial, stale, and mismatch states. Use existing
S2 patterns and approved focused stories for genuinely new reusable components.

Separate shipped-default comparison from authoring-state comparison. Within
authoring, identify saved versus working data, unsaved status, generation context,
and comparison provenance. Use existing selectors, not unrelated raw storage
interpretation. Editing must never alter the defaults report.

For development live refresh, design a Vite-only integration that watches
allowlisted dataset, schema, mapping, and generator dependencies, debounces
regeneration, and notifies the page. Configure the upstream root on the server;
do not accept arbitrary filesystem paths through browser requests. Do not watch
report outputs and create regeneration loops. Label stale reports after failure.

Keep filesystem loaders out of browser bundles. Prefer browser-side comparison
of authoring snapshots against normalized reference data without writing edits
to upstream. Define hosted-build behavior explicitly: a versioned snapshot or
honest unavailable state, never fabricated live results. No production service.

## Verification and completion

Use existing focused scripts: `test:logic`, `test:logic-formulas`, `test:scales`,
`test:scale-library`, `test:tokens`, `test:modes`, `test:mode-integrity`,
`test:spacing`, `test:size`, and affected color/typography checks as applicable.
Finish approved code slices with `pnpm lint` and `pnpm build`.

Test report fixtures for both comparison directions, deliberate differences,
ambiguous matching, aliases, modes, cascade order, units, input failures,
extensions, reproducibility, and discovery of new categories. Verify both source
datasets remain unchanged.

Use Playwright for Analysis navigation, filters, downloads, defaults/edit
isolation, Save/Cancel/revert, source refresh, missing checkout, stale results,
and desktop/mobile layouts. Every smoke path must collect `pageerror` events
and assert that none occurred.

For shared color math, state, formatters, or utility imports, run directly
affected unit checks and a browser interaction test for every consuming surface.
Minimum color smoke: Foundations, Colors subpanel, Scale Editor, Evaluation,
and changed comparison/output controls. Compilation alone is not sufficient.

Completion requires approved code changes; durable audit, review, and gap
documents; package command; JSON/Markdown reports; separate live Analysis and
authoring comparison; and evidence that no default dataset was populated or
overwritten. Report unverified requirements and remaining proposals honestly.
Under the revised direction, completion also requires the target supplement and
architectural conflicts to have explicit dispositions, an approved report contract
for all three planes, and verified distinction between assignments/materialized
records and evaluation samples where claimed. Portable-schema and migration
proposals may remain unaccepted upstream, but that boundary must be reported rather
than labeled complete interoperability. Compatibility with today's output alone
is not completion of the joint-contract objective.
Suggest roadmap updates without editing `docs/ROADMAP.md` without approval.

## Initial implementation anchors

- `src/data/design-system.defaults.json` and `src/data/defaults.ts`: shipped
  dataset and app-owned `DesignSystemDataset` contract.
- `src/state/persist.ts`: persisted envelopes and storage behavior.
- `src/features/`: domain models, state, shared math, generation, and defaults.
- `src/features/changelog/`, `impact/`, `edit-session/`, and `insights/`:
  cross-domain contracts and current insights boundaries.
- `src/pages/BrowsingContext.tsx`: page composition and navigation integration.
- `vite.config.ts`, `package.json`, `playwright.config.ts`, and
  `tests/e2e/home.spec.ts`: development and verification conventions.

These are starting points, not an exhaustive audit inventory. Verify current
paths and contracts before editing; both repositories may evolve.
