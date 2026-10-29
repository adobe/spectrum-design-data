# Portable authoring and taxonomy contract proposal

## Status, scope, and authority

Proposal **PC-0.1**, prepared on 2026-10-06 under the specifically approved R4
architecture slice. This is a reviewable contract proposal with isolated executable
examples, **not an adopted schema, production format, importer, evaluator, migration,
or upstream submission**. Suggested field names below are illustrative.

Follow-on review: the user approved D-01/D-02/D-06's local architectural direction,
not their final format/encoding, and clarified that the actual application must persist
both authored foundation data for future commits and generated design-data token
output. Working tokens must update while editing. See the
[authoring/storage decision packet](../design-data-authoring-storage-contract.md) for
those confirmed requirements and remaining production approval boundaries.

Read the [joint target contract](../design-data-target-contract.md),
[PR #1454 review](../design-data-pr-1454-review.md), and
[approval/checkpoint plan](architecture-alignment-plan.md) alongside this proposal.
Their current-state, target-contract, and generated-output planes remain independent.
PC-0.1 does not close JTC findings merely because native examples reproduce outputs.

Alignment: EPIC-7.1, EPIC-5.5, EPIC-9.1/9.2, and INIT-3; current EPIC-1.9,
EPIC-2.3 and EPIC-5.1 artifacts supply examples. These are not authorizations to
implement those roadmap initiatives. The roadmap's 1:1 wording and long-horizon
portability status still need separately approved clarification. No roadmap edit.

First proposal boundary: dimension formulas, interpolations, ordered rounding
rules, consuming spacing/size recipes and explicit mode-parameter bindings.
Typography is a consumer characterization, not a claim that all its special
generation behavior has been reduced to the generic dimension recipe. Color
algorithms, semantic/state/t-shirt rules, platform resolvers, arbitrary dependency
graphs and independent-language runtimes are outside this first family.
`componentSize` stays in typography pending EPIC-2.5; no density/text-zoom equivalence.

## Source evidence and reproducible examples

| Authority | Evidence | Limit |
| --- | --- | --- |
| Formula intent | `src/features/scales/scaleType.ts` | Native programs/flags/IDs, not versioned portable programs |
| Expression grammar | `src/features/scales/expression.ts` | Restricted native parser/evaluator; no independent implementation tested |
| Binding and interpolation | `src/features/scales/interpolation.ts`, `interpolationDefinition.ts` | Existing interpolation methods, points, parameters and source |
| Recipe generation | `src/features/scales/generate.ts`, `foundation.ts`, spacing/size generators | Existing calls and consumer rules, not a target materialization policy |
| Ordered rounding | `src/features/logic/model.ts`, `evaluate.ts`, `src/features/foundations/rounding.ts` | Current comparisons, first-match order and floating-point rounding |
| Native validation | `src/features/design-data/validation.ts` | Shape/reference checks plus selected semantics; incomplete portable validation |
| Typography | `src/features/typography/typographyGeneration.ts` | Specialized base shift, bounds, percentages, fallback and rounding order |
| Reporting boundary | `src/features/design-data/materialization.ts` | R3 declared evidence and output inventories, not authoring schemas |
| Pinned taxonomy specimen | `tests/fixtures/design-data/pr1454-migration-example.json` | Recorded immutable draft change, not merged specification or target validity |

Run `pnpm test:design-data-portable-contract`. The test-only envelope uses
`proposalVersion: "0.1-review-only"`, `status: "proposal-not-adopted"`, a
native-characterization profile, and current native dataset payloads. The profile
label is **not an accepted evaluator version**. It installs no target schema.

The envelope deliberately retains current payloads rather than pretending a new
unimplemented adapter has been proven lossless. It verifies geometric, linear and
custom arithmetic programs; method/expression interpolations; rounding conditions;
bound spacing; size and typography consumers; native validation; projected output;
opaque review annotations; recorded taxonomy/reference preservation. Unrelated
native color data is retained for complete-dataset validation, not a new portable
color algorithm proposal.

Tests perform no filesystem write, storage operation, Git operation, network call,
SDK execution, or upstream modification. The recorded specimen was independently
checked against cached immutable Git objects during this slice; offline tests verify
its recorded facts, not remote PR status or the present checkout's conformance.
The native browser-edit sidecar also retains an exact-mode value/name edit and its
authored baseline; effective projection reproduces the one applicable override.

## Proposed artifact boundaries

Portable definitions accompany generated design data; they are not generated token
values and do not belong inside unsupported current token/manifest fields.

| Proposed responsibility | Minimum retained intent | Explicit exclusion |
| --- | --- | --- |
| Formula definition | Existing identity, kind, exact expression text where applicable, named parameters/defaults/bounds/steps, base defaults, override/adaptive policy | Range/step selection and arbitrary executable code |
| Interpolation definition | Identity, method/range/endpoints or expression/parameters; input/output quantity contracts | Implied new token concepts or a second expression language |
| Rounding definition | Identity, depth, ordered condition identities/comparators/thresholds/outcomes, default outcome | Unimplemented semantic or t-shirt rule types |
| Foundation recipe | Existing consuming identity, definition references, range, allowed overrides, binding references/curves, output family and quantity contract | Forced mode Cartesian emission, renamed IDs or imported defaults |
| Binding assignment | Consuming part, explicit mode-parameter reference, method and ordered points; owner/scope evidence | Automatic assignment because a mode exists or values differ |
| Classification assignment | Typed category/term reference and explicit owner scope where needed | Meaning inferred from display names, RGB samples or string splitting |
| Generation provenance | Recipe/definition revisions, evaluator profile, selected input scenario, output references and applicability/emission decision | Canonical coverage inferred from R3 evaluation samples |
| Migration ledger | Source/target profiles, before/after identities and intent, approved operation, affected references and reversible source evidence | Global renames or guessed reconstruction from flattened output |

Library definitions stay shared: a recipe references a definition, not a copied
program for every emitted token. Ranges belong to consuming foundations. Bindings
may remain inline native source initially; extracting them into individually
identified artifacts requires a separately reviewed adapter/identity policy.

## Version, identity, and reference proposal

**Recommended, not adopted:** separate five kinds of version evidence:

1. Transport/schema version describes representation and validation rules.
2. Artifact revision identifies an immutable definition/recipe snapshot.
3. Evaluator/language profile describes numeric and execution semantics.
4. Target-taxonomy profile identifies catalog ownership/meaning/serialization.
5. Adapter/source revision and content hashes identify implementation evidence.

Do not use an app document schema integer, `1.0.0-draft`, SDK binary version,
content hash or matching generated values as a substitute for all five.
Draft profiles sharing a schema URI remain distinct by revision/content provenance.

Illustrative typed reference: `{kind, owner, id, revision}`. Preserve current
definition/scale/token IDs as `id`; do not mandate cross-repository UUID equality.
`revision` should identify the intended snapshot, not silently follow a mutable
latest label. The namespace, revision encoding, schema URI authority and native
adapter remain decisions D-01/D-02 below; no production ID scheme is introduced.

For phase-one transfer, required references must resolve uniquely in the declared
family and owner/profile before generation. Same spelling in two components is not
identity equality. Display-label edits retain identity; semantic split/merge or
reclassification needs an explicit migration. Unknown optional annotations should
round-trip in a dedicated envelope namespace; unknown required semantics must
produce unsupported/unassessable diagnostics, not be ignored during generation.

## Units, permissions, and evaluation contract

### Quantity boundaries

**Proposed:** declare input/output quantities and units at definition/consumer
boundaries. Spacing examples use base/output/offset in px and ratio/index as
dimensionless; linear size step is a dimension. Interpolation contracts state
whether input is px and output is a percentage, ratio or dimension. Rounding factor
and threshold share the rounded quantity's unit; depth is a numeric precision scale.
Do not infer units from labels or impose px on every future consumer.

Current arithmetic programs are unit-agnostic; these annotations are not an
implemented dimensional type checker. Conversion such as px to rem requires a
declared root-size context and exporter contract. No new conversion or JS runtime
is added to web output; existing pure-CSS export remains authoritative.

### Native behavior that a proposed profile must characterize

- Geometric: `(base - offset) * ratio^i + offset`; linear: `base + i * step`.
- Expressions support numeric literals, named variables, parentheses, unary
  `+`/`-`, `+ - * / ^`, and whitelisted functions. Power is right-associative;
  unary minus binds less tightly: `-2^2 = -4`, `2^3^2 = 512`.
- Whitelist: `pow`, `min`, `max`, `abs`, `round`, `floor`, `ceil`, `clamp`,
  `sqrt`, natural `log`, `exp`; current arities and name restrictions apply.
  No property access, dynamic calls, imports, `eval`, IO or arbitrary JavaScript.
- Native expression length limit is 500 characters; parser recursion guard is 200,
  not a promise that 200 nested parentheses succeed. A portable profile needs
  agreed, independently testable resource limits.
- Native values use JS Number arithmetic. `round(-1.5) = -1`; adopting a different
  ties rule changes results. Transcendental/power and operation-order equivalence
  across languages has not been established. Specify exact versus tolerance-based
  vectors before claiming another evaluator conforms.
- Native dimension ranges are rounded/clamped to below 0–9 and above 0–40;
  base index is 0. Below-step labels and numeric range are consumer semantics,
  not fields inherent to reusable formula definitions. Typography has other caps.
- Literal overrides are gated by `overridable`; parameter overrides are clamped to
  declared bounds. Parameter bindings use `adaptable`, and apply after literal
  parameter resolution. Binding result clamping is not implicitly guaranteed.
- Binding points are ordered by strictly increasing `at`; out-of-range inputs
  hold endpoints. Exponential interpolation uses its defined positive-endpoint
  behavior and native linear fallback when endpoints are not both positive.
- Rounding checks conditions against raw values in authored order, first match
  wins. Factor 0 leaves the value unrounded. For depth 1, native arithmetic is
  `Math.round(raw / factor) * factor`; for other depths it is
  `Math.round(raw * depth / factor) * factor / depth`. Preserve this order.

These are **characterization facts**, not silent adoption of every native fallback.
Recommended target transfer validates definitions/references/permissions before
evaluation and reports invalid programs/results rather than filling with unrelated
fallback definitions. Live authoring recovery can remain a separate operation.

### Permission and validation disagreements to resolve

| Check | Current observed behavior | Proposed target requirement / open disposition |
| --- | --- | --- |
| `R4-GAP-001` base binding permission | `resolveScaleInputs` applies a base binding even with `base.adaptable: false`; isolated fixture yields 16 from a locked 8 base | Decide an explicit base-permission rule; recommend reject unauthorized transfer bindings, not silently adopt the bypass or alter current production behavior |
| `R4-GAP-002` interpolation semantics | Native dataset shape/reference validation accepts an expression referencing an unknown variable; `interpolationIssues` reports it separately | Require semantic expression validation before portable generation; retain native behavior as implementation evidence, not full target validity |
| `R4-GAP-003` invalid numeric output | Parsing `1 / 0` succeeds; evaluation is non-finite; JSON would serialize Infinity as null | Reject non-finite results before transport/materialization; retain the original program and structured diagnostic |
| Native unresolved references | Low-level generation may use hidden formula/rule/interpolation fallbacks; native dataset validation rejects missing required formula references | Distinguish editing recovery from strict transfer/generation; never conceal missing required artifacts behind successful output |
| Locked adaptive neutral points | Native authoring normalization aligns existing neutral points for non-overridable parts; a standalone generator is not that authoring normalization pass | Declare normalization stage and neutral-value policy explicitly; preserve/review nonconforming curves rather than silently rewriting transfer input |

These limitations do not authorize fixes under R4. No new runtime validation,
permission interpretation or invalid-output behavior was implemented.

### Typography consumer boundary

Native typography synthesizes a base binding using `componentSize` and text zoom,
with ratio 1.125 per shift, then applies min/max text limits, line-height percentages,
special percentage rounding, line-height rules, paragraph/heading spacing, icon bounds
and fallback interpolations. Carry the typography consumer algorithm/provenance as
an explicit supported profile or report the unsupported portion; do not claim a
plain geometric formula alone reconstructs it. Product-default ownership remains
EPIC-2.5. PC-0.1 checks native reproduction, not an approved portable typography recipe.

## Validation, dependencies, and cycle policy proposal

Recommended validation stages, each with separate evidence/status:

1. **Shape/version:** recognized artifact family and compatible transport/profile;
   JSON-representable finite source values; parameter types and required metadata.
2. **Identity/reference:** nonempty unique scoped identities; typed required references
   resolve in the declared revision; labels never supply missing references.
3. **Semantics:** parse allowed grammar; check reserved/duplicate names, bounds,
   quantities, curve order, permissions, rounding conditions and owner cardinality.
4. **Dependency:** distinguish declared references, declared bindings, effective
   generation dependencies and observed numeric sensitivity. R3 supplies only
   bounded declared evidence, not all four.
5. **Execution:** run the supported existing generator under an explicit selected
   scenario; reject non-finite results and enforce profile/domain-specific validity.
6. **Emission/export:** require an explicit applicability/materialization policy and
   supported downstream profile; keep evaluation samples distinct from assignments.
7. **Round-trip/consumer:** retain authored intent and prove same-profile reproduction;
   separate catalog, serialization, query, authoring and independent runtime coverage.

Existing formula expressions reference only allowed scalar variables, not arbitrary
other definition IDs. First-family references are recipe→definition/rule/parameter;
do not invent a general executable graph. If derived-recipe references are later
supported, propose a typed directed graph and reject cycles before generation.
Alias/resolution graphs are a separate supported upstream operation, not handled by
a new PC-0.1 resolver. No general cycle validator or cross-recipe runtime was built.

Duplicate generated numbers may be domain warnings (`scaleIssues`); identical
explicit mode assignments still retain identity and intent. A duplicate-value
warning is not permission to deduplicate assignments or mode catalogs.

## Losslessness, lifecycle, and export boundaries

Round-trip scope is JSON-representable authored intent: IDs/references, exact
expression text, flags, ordered conditions/points/state arrays, defaults/overrides,
source contexts, lifecycle and opaque optional annotations. JSON object member order
is not semantic; projected record inventories are compared by existing record ID.
Generated-value equality is an additional check, not a substitute for intent retention.

Native JSON does not preserve NaN/Infinity, undefined, functions or signed-zero bits.
They cannot be covered by a blanket bit-lossless claim. Decide signed-zero and numeric
representation policy for an adopted evaluator; source/output invalidity must not
turn into null-valued valid tokens. Unknown required semantics remain unsupported.

**Recommended lifecycle:** keep old definition/recipe snapshots reachable; preserve
current IDs and advance explicit revisions only after review. Separate label edits,
program/permission changes, binding changes, taxonomy rename/reclassification, split,
merge and materialized-value changes. Do not silently recalculate saved overrides
when a referenced definition revision changes. Retain original authored edit baseline
and newly generated baseline separately (R3); baseline hashes are provenance, not
proof an override is semantically safe to rebase.

Suggested migration acceptance is prepare→inventory references→validate new profile→
compare intent/output→record reviewed disposition→apply with explicit approval.
Keep original snapshots and an inverse ledger for any non-bijective transform;
do not claim reversibility by recombining decomposed display strings. Transactions,
storage, rollback UI, ID formats and migration execution are not implemented here.

| Boundary | PC-0.1 position |
| --- | --- |
| Current app authoring payload | Native JSON fixture round-trip/reproduction verified; not a deployed portable contract |
| Current upstream token output | Emit only supported token/name/value or alias shapes under the selected profile; current adapters remain unchanged |
| Proposed authoring artifacts | Separate future sidecar/package family; placement/schema registration/version policy require review |
| Current manifest overrides/extensions | Existing supported categories are not permission to insert formula programs or arbitrary renamed token contexts |
| Pure-CSS web output | Existing exported behavior; no new runtime JS dependency |
| Other languages/platforms | Requirements and vectors proposed; no evaluator conformance or new platform support established |
| PR #1454 consumer compatibility | Structured naming, published serialization, queries, relationship validation and ownership remain distinct checks |

## Taxonomy and identity-preserving migration examples

### Recorded draft decomposition, not target validity

Fixture path: `tests/fixtures/design-data/pr1454-migration-example.json`.
Source path: `packages/design-data/tokens/semantic-color-palette.tokens.json/59`.

- Merge base: `282fc49fb452534367f58632eca6f5e75c234f9c`; file SHA-256
  `8b518fa4a6ea7a8a874ecd49ba87bb721aaddb306a52473165f40a89d0114d71`.
- Draft head: `fa714564eaa33bc37f905fad64162d60d6a48087`; file SHA-256
  `4a49bddf3acdb51f5df4230bc22cc0ef1dc0d53e117da8390af98886d070b6b3`.
- Token UUID: `a553db3e-a051-4023-87eb-da6545b983b2`; concept ID:
  `2ca34d44-1fb9-48d7-9333-2c79e0dc7ab8`.
- Alias target remains `30fa3891-135b-405a-bf0f-3cc17f711079`.

The reviewed transformation decomposes `property: background-color` into
`property: color` plus `attribute: background`, moves `variant: subdued` to
`visibility: subdued`, and changes `state: [default]` to `interaction: [default]`.
UUID, concept ID, alias target, schema declaration, lifecycle and `legacyKey`
remain unchanged. It is not a global field/string substitution.

The specimen is **unanchored**: it has no component. It therefore preserves the
PR's unresolved global/component ownership question rather than proving the target
permits that use. Alias token output has no literal value; preserving `$ref` is not
alias resolution. The fixture checks recorded structured facts and synthetic
unchanged-UUID consumer links, not SDK serialization or full relationship validity.

Proposed ledger retains source/target profiles, the original record, reviewed
result and operation classification. Original-record retention permits exact inverse
recovery; reconstructing the original taxonomy from output alone does not.
`legacyKey` preservation is evidence of unchanged legacy intent, not a rerun of the
PR author's published byte-compatibility claim.

### Proposed shared owner-scoped state catalog

A synthetic `fixture-checkbox` declares `selected` with prop trigger and `hover`
with interaction trigger in **one** ordered `states` catalog. A token references
`selected` in `interaction-context` and `hover` in `interaction`. Arrays remain
ordered; references are scoped by component, not two forked state identities.

This is a target example, not a copied real PR record or a new accepted SPEC rule.
Trigger-placement validation is a proposed check; inspected draft membership checks
do not establish it. Interaction buckets are classification/behavior vocabulary,
not adaptive mode axes or an R3 evaluation scenario's `context` object.

Universal category membership, component-local anatomy/options/states, platform
terminology and display serialization remain distinct. Do not infer a universal
term from matching labels, create two global state catalogs, or mechanically migrate
the 92 legacy relationship scope arrays. PR1454-001 through PR1454-005 remain open:
scope migration, trigger placement, transitional prose/ownership, query capabilities
and profile-specific compatibility need independent review/validation.

## Acceptance evidence and open decisions

| Check | Verified bounded evidence | Not established |
| --- | --- | --- |
| R4-RT-001/002/003 | Native JSON retains intent and reproduces dimension, typography, interpolation and projected-record content | Target schema/adapter and independent-language conformance |
| R4-EDIT-001 | Native exact-mode edit scope and original edit baseline survive alongside generator output | Approved override rebase/lifecycle migration policy |
| R4-ORDER-001 | Ordered rounding changes outcome; order survives transfer | General rule-engine implementation |
| R4-LANG-001 | Native precedence/ties and restricted parser vectors | Adopted language version or complete cross-platform math vectors |
| R4-REF-001 | Existing native validator rejects missing formula refs/duplicate identities | Complete target reference/cycle validator |
| R4-GAP-001/002/003 | Base permission bypass, interpolation validation gap and non-finite transport hazard are characterized | Approved fixes or adoption of these behaviors |
| R4-MIG-001/002 | Recorded draft identity/reference/lifecycle/legacy-intent preservation; original-record ledger recovery | Published serialization, full dataset/schema validity or live PR status |
| R4-SCOPE-001 | Synthetic shared owner-scoped catalog round-trip | Accepted trigger-placement rule or component editor |

Decisions required before production implementation:

| ID | Decision | Recommendation for review |
| --- | --- | --- |
| D-01 | Sidecar/package layout and schema URI/version authority | Separate authoring artifacts from current supported token/manifest payloads |
| D-02 | Typed identity, owner and immutable revision reference encoding | Preserve current IDs; require explicit reviewed revisions; no cross-repository UUID equality mandate |
| D-03 | Evaluator/grammar/numeric/resource contract | Start with bounded native characterization, then approve independently testable semantics/vectors |
| D-04 | Unit and permission validation, base adaptation and locked neutral points | Explicit quantities and fail-closed transfer checks; do not silently adopt current bypasses |
| D-05 | Invalid/unsupported/fallback and unknown-field policy | Preserve intent with diagnostics; distinguish editing recovery from portable generation |
| D-06 | Definition revisions and saved override rebase/migration | Explicit reviewed adoption and retained baselines; no automatic rewriting |
| D-07 | Universal/owner-scoped category cardinality and state placement | Use PR distinctions as hypotheses; resolve global anchoring, relationship migration and query limits |
| D-08 | Applicability/emission/omission and layer query semantics | Carry forward R3 reporting policy only; canonical policies and SDK/spec disagreement remain separate |

R4 delivery did not itself adopt D-01–D-08. The subsequent local directional approvals
and storage requirement are recorded in the linked decision packet; concrete profile,
schema and runtime policies remain pending. No findings or requirements
are marked closed, evidence pins auto-updated, default records imported, or production
schema changed. Final target-contract acceptance requires reviewed dispositions and
separately approved implementation scopes; value/name equality cannot supply them.
