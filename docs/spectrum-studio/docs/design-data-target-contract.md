# Joint design-data target contract and architectural conflict matrix

## Status and authority

Documentation proposal recorded on 2026-10-05. This supplements, rather than
replaces, the [internal audit](architecture-alignment-audit.md),
[current upstream review](design-data-alignment-review.md), and
[gap register](design-data-alignment-gaps.md). It changes the direction of the
[execution plan](architecture-alignment-plan.md), not application behavior.
The requested [PR #1454 review](design-data-pr-1454-review.md) supplies a pinned
future taxonomy profile in addition to the current checkout evidence.

The user confirmed these **directional requirements**:

1. The destination is a joint future contract for Spectrum studio and design-data.
   Today's dataset, draft specification, SDK, and application are separate inputs
   to the audit; none is automatically the complete target architecture.
2. Spectrum studio is a mechanism for auditing, evaluating, and redefining taxonomy,
   classification, and derivation systems, not just editing a flat value list.
3. Foundation desktop/mobile dataset duplication is to be retired. Foundations
   define modes; a declared mode may have no token assignments. Platforms can
   choose to use foundation modes or their own modes for overrides/custom tokens.
4. Formulas, rules, bindings, and recipes are intended to become portable
   authoring definitions carried alongside generated design data.
5. Different names and values can be valid. Alignment means representability,
   explicit semantics, reliable references, lossless authoring, and reproducible
   generation, not equal values or matching display strings.

The user approved preparing this proposal and revising the execution plan, then
approved proceeding with R1 as a bounded architecture slice and selected additive
report compatibility. R2 presentation and R3 reporting provenance were subsequently
approved and verified within their specifically recorded scopes. See the execution
plan's approval/checkpoint records. **No target authoring model, upstream schema or
migration is approved by this document.** Entity boundaries, canonical identity and
emission policies remain proposals requiring specific approval before building.
R4's separately approved proposal/fixture slice is now delivered; completed reporting
and proposal slices do not approve authoring entities or unresolved policies.

Primary alignment: EPIC-7.1 and EPIC-7.3. INIT-3, EPIC-1.9, INIT-2,
EPIC-5.5, INIT-8, and INIT-9 supply requirements, not authorization to implement
their editors or engines. `componentSize` stays in typography pending EPIC-2.5;
spacing/size follow text zoom only through explicit bindings. Pure-CSS web output
and the single existing generation path remain constraints.

## Structure variant extension

The Structures enhancement uses native property definitions and sparse option
differences, separate from Component API properties. Non-boolean definitions
reference explicit Registry terms. Boolean preview switches, layer ordering, and
visibility do not generate tokens; changed token-backed bindings emit only their
variant semantics. Default semantic rows retain their existing identities.

`leonardo-structure-variants-v3` is a local output profile. Its compatibility
envelope 3 preserves Registry classifications, generated root aliases, and literal
leaf values, including unitless line heights. It does not represent upstream
anatomy or establish an accepted variant-property schema. Authoring snapshots
retain the non-token definitions; token-only exports do not round-trip them.
LTAX-017 records these boundaries with alignment not assessed and RFC needed.

## Bounded component authoring profile

The separately approved shared color-output slice uses Color schema 5 and
authoring envelope 13. It separates sRGB/P3/Rec 2020 authoring from CSS notation
and optional sRGB output mapping. This introduces no platform manifests,
per-platform configuration, token concepts, or mode-value axes. **LTAX-015**
tracks this local capability independently of upstream representation acceptance.
Valid modern CSS is not conformance with the pinned standalone color schema.
Existing Component bindings can retain a valid source whose constrained color
output is unavailable; new assignments and exports still require an actual
ready value accepted by the pinned property schema. Failed colors have diagnostic
metadata, not an emitted success-shaped value.

The separately approved Components MVP (EPIC-6.2 and EPIC-7.1/7.3) uses the
offline `spectrum-design-data-components-ctr-v1` profile at
`838a6835b746f9d77b2697374408901f334d854e`. Its bundle retains exact declarations,
nine Draft 2020-12 schemas, original-file hashes and the Apache-2.0 license.
Package versions 3.2.5/4.3.0 are distinct from document version `1.0.0-draft`.
Native UUID metadata is outside the closed canonical objects; Property and part
references project through their native identities. Part and state order is
authored data, not invented cascade precedence.

The Components redesign keeps option display order in native UUID metadata
(`optionOrder`, Components schema 2 / authoring envelope 14), outside the closed
declaration and CTR objects. Explicit definition Apply derives the machine name
from Display name without changing component or relationship identities. Neither
ordering nor the new presentation claims a different upstream profile, additional
token coverage, shared option groups or effective appearance resolution.

Action Button and Menu keep their complete declarations but have representative
app-authored property rows targeting this app's outputs. They do not reproduce the
171/252 upstream relationship arrays: those arrays contain schema-invalid fields,
and Menu also has an undeclared part. Repeated scopes remain separate rows.
Boolean API descriptors are not converted to text conditions. Action Button has
only its three declared interaction states; Menu retains its five source states.

The original hex-color type pattern has slash delimiters and rejects ordinary
hex defaults. The profile exposes that failure instead of changing the source
schema. Its color value schema does not accept arbitrary hex or wide-gamut values;
typed literals and resolved reference values must actually conform. Unsupported
type schemas and unpublished/context-incompatible targets are explicit errors.
Only actual emitted dimension/color/shadow/Structure targets are selectable;
Typography emission mapping and compatibility alias selection remain outside this
bounded MVP. No resolver, renderer or general effective-appearance engine is
claimed. LTAX-014 tracks local implementation separately from alignment and RFC
acceptance. The native Structure-to-upstream-anatomy decision remains open.

## Evidence and review limits

- App HEAD: `294ec3ad44d52fe0514f699fc4d1fcba0c029c1d`, with existing uncommitted
  implementation and user work. App evidence refers to the inspected working
  files, not an assertion that HEAD contains every change.
- Reference HEAD: `838a6835b746f9d77b2697374408901f334d854e`, inspected read-only.
  Relevant package versions: design-data `3.2.5`, spec package `4.3.0`;
  normative document version `1.0.0-draft`.
- SDK source inspection is evidence about that source revision. The previously
  observed binary is `design-data 0.12.1`; correspondence between source and
  installed binary is not established. No upstream build or mutation was run.
- Requested future profile: open draft PR #1454, branch
  `feat/token-taxonomy-vocabulary-split`, head
  `fa714564eaa33bc37f905fad64162d60d6a48087`. Its merge-base delta is distinct from
  the local checkout and live PR base. See the separate review for GitHub status,
  CI evidence, data inspection, and targeted validation results. No branch switch
  or reference checkout mutation was performed.
- Scout tools were not exposed by the earlier discovery attempt. Direct source
  and schema inspection was used; no Scout investigation results are claimed.
- This is a targeted architectural follow-up, not a second exhaustive audit of
  every package or proof of all current SDK behavior.
- Existing run results remain in the execution plan. This documentation-only
  revision does not claim fresh app, browser, or SDK conformance results. The PR
  review separately records a read-only JSON-schema scope-fragment check; it is
  not a full upstream validation/test run.

Reference paths below are relative to the spectrum-design-data checkout; app
paths are relative to this repository. Paths identify evidence, not hardcoded
runtime dependencies. Dataset/spec/SDK versions must be recorded separately.
For compact evidence citations, `spec/` is under `packages/design-data-spec/`,
and unprefixed schema filenames are under its `schemas/` directory;
`fields/`, `tokens/`, `registry/`, and `mode-sets/`
refer to `packages/design-data/`; SDK `graph.rs`, `cascade.rs`, and `manifest.rs`
refer to `sdk/core/src/`. The immutable PR head supplies a separate namespace for
its citations; current-checkout shorthand never implies the draft version.

## Pinned draft shadow profile

The separately approved Elevation slice projects the existing generator's
ordered layer lists into the draft's native shadow array. This is not a new
compound-shadow schema, authoring-model migration or complete export pipeline.
`spectrum-design-data-shadow-draft-v1` pins the four exact schemas, source paths,
Apache-2.0 license and hashes in `src/data/design-data-shadow-profile/` at
`838a6835b746f9d77b2697374408901f334d854e`. Design-data package 3.2.5 and spec
package 4.3.0 describe format `1.0.0-draft`, not format 4.3.

Each literal token has a UUID, structured name with property `shadow` and string
`scaleIndex`, `$valueType: "value-types/drop-shadow.schema.json"`, and nonempty
ordered `value` array. A one-layer shadow is also an array. Each layer contains
exact generated px strings for `x`, `y`, `blur`, `spread` and the unchanged
alpha-bearing `color` literal. Relevant named modes qualify the outer name;
source labels, concept and layer IDs, numeric opacity and profile information
remain separate app-owned metadata. See the
[storage contract](design-data-authoring-storage-contract.md#draft-shadow-token-adapter)
for API and source boundaries.

Local validation checks the closed token envelope and separately checks the
declared shadow value schema, plus literal dimensions and color parsing.
`x-valueType` is an upstream annotation, not a resolver. No scalar references,
whole-token aliases, per-layer references, stack splicing, inset or explicit
empty-stack semantics are provided. The existing zero-layer/no-token behavior
is preserved. Empty/inset enhancement proposals remain outside this slice.

The following interoperability limits remain explicit:

- LTAX-003: the draft name accepts string `scaleIndex`; its catalog describes
  numeric/integer values and SDK slug reconstruction may omit the string.
- Shipped shadow composites use the legacy `$schema` bridge, including metadata
  rejected by the closed draft root. Current structural validation and DTCG
  dispatch can skip `$valueType`-only records. Do not mix formats to hide this.
- Shadow `color` strings are not governed by the narrower standalone rgba color
  regex. Preserve modern/wide-gamut literals rather than silently convert them.
  Existing DTCG hex conversion can quantize alpha: 0.125 becomes 32/255.
- Property resolution returns a token, not a recursively materialized stack.
  Inline reference behavior differs by loader and target form; some documented
  reference/type checks are incomplete. This literal-only adapter does not
  establish those behaviors.

The research reference checkout matched the pin without uncommitted schema
changes. The spec is itself a draft. Resolver findings are source-derived:
the generated WASM Node entry was unavailable and no upstream SDK execution
was performed. Local schema checks are not SDK, registry, full-dataset,
manual alignment or RFC acceptance. LTAX-007 retains those separate gates;
the canonical gap register remains the only closure-status owner.

## Pinned T-shirt generation subset

Reusable composition under LTAX-013 is an app-owned extension to the subset,
not adoption of an upstream anatomy model. Source definitions may explicitly
name their outputs with the existing Element or Structure category. Element
naming declares `leonardo-structure-naming-v2`, its local field and embedded
vocabulary; its compatibility wrapper is version 2. Structure-only output keeps
the original profile and version-one wrapper. Both remain explicitly
non-conforming and unadopted upstream.

Reference occurrences and Direction are authoring-only. Each definition emits
its own semantic rows once; module occurrences do not duplicate tokens, aliases
or mode values. Local labels are independent of Registry naming references.
Fresh defaults preserve Base's 15 rows and add Text's five gap rows, using the
existing Text Element term rather than a duplicate Structure term. Old saved
systems are not merged with these defaults. Manual architecture acceptance,
alignment evidence and RFC state remain separate canonical-register gates.

The separately approved two-part feature uses
`spectrum-design-data-tshirt-subset-v1` at current-main review pin
`eba428d462bfb5a3288835cb6cf0dcb1c4dc93af`. Design-data package 3.4.0 and spec
package 4.5.0 describe format `1.0.0-draft`. Provenance, exact field/schema/
vocabulary bytes and hashes live in `src/data/design-data-tshirt-profile/`.
Schemas that are byte-identical to the older shadow profile are reused without
changing that profile's pin or evidence.

Native rules and Structure applications remain app-owned authoring definitions,
not additions to closed upstream token objects. Semantic rows contain `uuid`,
structured `name`, exactly one of `value`/`$ref` and the applicable existing
shadow `$valueType`. Concept IDs, grouped binding membership, rule/source
references, requested/actual mappings and diagnostics remain separate lineage.

Published variants reference actual emitted primitive row UUIDs, with required
targets in the bundle. Hidden sources inline exact finite nonnegative px strings
or complete ordered outset shadow arrays. No invented dimension `$valueType`,
display rounding, alpha quantization, inset/empty-stack convention or hidden
primitive publication is added. Alias checks cover UUID existence, type/family,
declared context and cycles, not merely envelope validity.

Names use governed Structure and Property plus canonical `xs/s/m/l/xl` Size
terms, optional orientation or physical position, and only required source
contexts. Minimum/maximum bindings map to `min-width`, `min-height`,
`max-width`, `max-height`, not a new `constraint` field. Existing Axis terms
adapt to `orientation`. The profile formatter is separate from existing native
primitive inclusion/order preferences and maps size IDs to their full words.

The existing Registry `foundationScale` field is a declared semantic string
extension. Physical left/right/corners are declared vocabulary extensions,
not automatic logical start/end conversion. Additional string fields permitted
by the envelope do not constitute upstream catalog acceptance.

Continuing limits:

- The closed token schema rejects root `conceptId`, contrary to token-format
  prose. Row aliases with separate concept lineage do not resolve that conflict
  or prove SDK concept/cascade behavior.
- The catalog declares integer `scaleIndex`, while additional token-name fields
  accept strings and upstream legacy formatting excludes it. Traversal stays
  numeric; this subset explicitly serializes decimal strings and includes them
  in its formatter. LTAX-003 is not closed.
- The pin has no dedicated dimension value schema. Exact local px checks and
  applicable shadow checks do not prove a full upstream value contract.
- Only required binding/explicit-assignment contexts emit. Equal explicit
  assignments remain distinct; Cartesian evaluation samples, temporary
  adaptive controls and measurements are not canonical rows.
- Local schema/graph tests are not full SDK, dataset, continuous adaptive
  runtime, manual architecture or RFC acceptance.

LTAX-009 records this app-to-reference implementation independently of
LTAX-002/003/005/007/008 and JTC-007. Saved semantic concepts and required
context rows are counted by existing impact/materialization owners; working
additions are separately disclosed and missing/stale reference evidence remains
unassessable. Native taxonomy export and the generated pinned bundle remain
separate download contracts. See the
[storage contract](design-data-authoring-storage-contract.md#t-shirt-generation-and-structure-variants)
and [confirmed feature plan](tshirt-size-generation-plan.md).

## Three independent assessment planes

### Native Structures boundary

The separately approved Design-page architecture slice implements classified
layout bindings as app-native authoring definitions (`system.structures`).
Structure concepts have immutable UUIDs, and governed slot bindings preserve
`value` XOR `$ref`. Token references use an app-owned mathematical-index
namespace across Size, Spacing, Radius and complete Elevation output; they
resolve live through existing generation and mode owners, including hidden
sources. Neither those reference UUIDs nor the display name claim upstream
token/name identity.

These records appear as `authoring/structures`, not semantic token rows.
They add no primitive/semantic concepts or mode-value denominator entries.
Panel presentation, sample children and measured preview geometry are not
portable data. Save/Cancel and source-removal guards follow the coherent native
graph; see the [storage contract](design-data-authoring-storage-contract.md#design-structures).

LTAX-008 records local editor/model evidence separately from upstream acceptance
and links the unresolved ownership/reference work represented by LTAX-002 and
JTC-009. The roadmap's broader app Structure versus upstream
`structure`/`substructure`/`anatomy` mapping remains undecided. This slice does
not themselves provide an upstream serializer, semantic publishing, an option-group/rule
engine or a general reference resolver. The separately approved T-shirt subset
above adds only its bounded generation/publishing path. Pinned source evidence is not a fresh
SDK execution, manual alignment review or accepted RFC.

### Assessment scope

Application realization clarified after R4: authoring state/localStorage must produce
foundation-schema data for eventual design-data commits **and** persist generated
design-data tokens from that source. The user chose working-token updates while
editing, with Save/Cancel baselines and temporary-preview exclusion. These are product
requirements, not functions implemented by the assessment planes. See the
[authoring/storage packet](design-data-authoring-storage-contract.md) for current gaps,
approved local directions and the proposed next implementation scope.

That first spacing/size scope was subsequently approved and implemented with real
local-proposal schema validation, structured dimension tokens including UUIDs, and
working localStorage synchronization. Default-width layout acceptance is still obstructed;
wide-desktop functional checks pass. See the storage packet/checkpoint for limits.
Current/draft upstream schema conformance and other foundation conversions are not implied.

| Plane | Question | Evidence and limits |
| --- | --- | --- |
| Current-state audit | What do the current data, schemas, normative documents, SDK source/binary, and Spectrum studio actually represent? | Record each authority separately. A dataset's legacy spelling is not a requirement to adopt it; SDK/spec disagreements are findings, not silently resolved precedents. |
| Joint target-contract assessment | Can either project represent the desired taxonomy, portable derivations, optional mode usage, and layered overrides? | Evaluate explicitly versioned target requirements. Separate confirmed user direction from unapproved schema/model proposals. Missing current records do not prove missing schema support. |
| Generated-output comparison | Given established semantics and a declared context, how do outputs differ? | Reuse existing generators and reviewed mappings. Names/values may differ intentionally. Unknown identities, units, roles, or resolution remain unassessable. Equal values are not proof of architectural compatibility. |

At the original proposal checkpoint the CLI/page primarily implemented the third
plane and source inventory. Approved R1-R2 now expose the first two as structured
curated assessments with source-hash freshness, not live automated conformance.
R3 adds provenance for evaluation scenarios and explicit source assignments without
choosing canonical emission or resolver policy.

An assessment needs a stable requirement/finding ID, plane, observed/proposed
status, classification, affected authority and scope, evidence locations and
versions, confidence, consequence, ownership recommendation, discriminating
check, and decision status. These are report needs, not final field names.

Recommended classifications distinguish semantic disagreement, representational
difference, schema expressiveness gap, dataset-content difference, application
capability gap, SDK/spec disagreement, intentional policy, and unknown/unassessable
evidence. Operational input failures remain errors with partial diagnostics.
Do not relabel the current `extension` findings as accepted portable schemas.

## Proposed contract boundaries

These are responsibilities, not a proposed JSON layout or parallel generation
engine. Reuse current domain contracts where they can carry the responsibility.

| Responsibility | Proposed contents | Boundary to preserve |
| --- | --- | --- |
| Taxonomy and classification | Universal categories, scope, cardinality, term membership, semantic relationships, and classification assignments | Category meaning is distinct from vocabulary, display labels, and serialized token names. PR #1454's element/attribute/affordance/visibility distinctions inform the proposal; hierarchy/relation/cardinality choices require review. |
| Owner-scoped vocabulary and references | Component anatomy/options/states and platform-local terminology, with explicit owner and cross-reference semantics | A field can reference a component catalog without turning all component terms into universal taxonomy. Both interaction buckets can share one component states catalog; they are not adaptive mode axes. |
| Vocabulary and identities | Terms, definitions, aliases, lifecycle, scoped identities, explicit replacement/migration links | A rename must not silently remint a concept or redirect references. Shared words are not proof of shared meaning. Do not impose cross-repository UUID equality. |
| Portable authoring definitions | Formula/interpolation/rule programs, parameter contracts, expression language/version, units, control/override policy, and typed references | Generated numbers cannot reconstruct their recipes. Platform portability must not imply arbitrary executable JavaScript or a new evaluator. |
| Foundation recipes | Definition references, ranges/steps, permitted parameter overrides, explicit bindings, output families/classification, and algorithm provenance | Steps belong to the consuming foundation. Bindings and mode declarations do not automatically require all combinations to be emitted. |
| Token concepts and assignments | Stable semantic concepts; literal/alias/generated origins; explicit mode/layer applicability and dependencies | Distinguish concept identity from a particular row, evaluation sample, or consumer-effective value. Preserve `value` XOR `$ref` at supported token boundaries. |
| Mode catalog and platform use | Foundation declarations/defaults, explicit use/restrictions, platform-local declarations/edits, and token/recipe assignments | Declaration, platform support, generation dependency, assignment, and runtime selection are separate facts. An unused declaration is not missing-token coverage. |
| Layered authored records | Foundation baseline, platform/product overrides/extensions, references, rationale, source/layer identity, and lifecycle | Preserve authoring lineage separately from any flattened effective resolver view. Do not silently copy current SDK graph replacement into the authoring store. |
| Evaluation and materialization | Explicit scenario catalog, generator/definition versions, sampled results, emission policy, and dependency evidence | A Cartesian evaluation matrix is not automatically a canonical dataset. Identical values do not justify erasing intentional context assignments. |
| Application-only state | Working/saved snapshots, selection, temporary previews, editing baselines, and visualization metadata | Keep Save/Cancel/revert and storage behavior separate from portable artifacts. A draft or preview is not a saved dataset change. |

Recommended dependency direction:

```text
Taxonomy/classification + portable definitions + foundation recipes
                         + mode declarations/explicit assignments
                                      |
                         Existing authoritative generators
                                      |
              Token concepts / explicitly materialized foundation records
                                      |
             Platform selections, overrides, extensions, and local modes
                                      |
              Evaluation/resolved views and platform-specific serialization
```

Classification and derivation definitions must also be auditable without
evaluating every token. Their portability schemas require upstream review; do not
place unsupported objects inside today's token/manifest payloads merely because
they are useful or a loader tolerates unknown fields.

### Identity, lifecycle, and losslessness

- Prefer explicit stable identity for new authoring entities; retain current
  identities and use adapters for current name-keyed upstream catalogs. The exact
  ID format and category/term migration schema remain decisions, not mandates.
- Distinguish a term rename, category rename, reclassification, concept split,
  merged concept, and generated-value change. Only an approved semantic migration
  may change reference meaning; a label/formatting change must not do so implicitly.
- Preserve source recipes, bindings, raw names/values, overrides, evidence, and
  lifecycle information at lossless authoring boundaries. An adapter can emit a
  supported subset while reporting what cannot round-trip.
- Portable derivations need versioned evaluation semantics, parameter/variable
  scope, units, rounding/order, finite-output validation, cycle/reference checks,
  override permissions, and behavior when a program changes. Which entity carries
  each field and how non-web evaluators conform remain open.
- A field/term present in the future contract is not automatically permitted in
  the current upstream schema. Report separate current and proposed validity.

### Mode semantics requiring explicit agreement

Confirmed: foundation-defined modes may be unused by tokens; platforms can choose
to use them or define their own. Retiring desktop/mobile duplication does not
authorize substituting app textScaling for upstream density.

Working interpretation: a singular foundation does not ban every explicitly
mode-qualified foundation token. It bans mandatory dataset duplication by density
and automatic materialization merely because an axis exists. Whether particular
foundation families should emit mode-qualified records remains a policy decision.

Specify separately:

1. What mode/catalog declarations mean independently of token coverage.
2. Which recipes or authored assignments actually depend on an axis.
3. Whether an omitted field means baseline/default for representation, wildcard
   fallback for resolution, or something else in a particular operation.
4. How a platform opts out: no assignments, allowed-value restriction, local
   removal/replacement, or token filtering. These mechanisms are not synonyms.
5. Which contexts are evaluation scenarios versus explicitly materialized records.

Until agreed, preserve current generation and edit behavior. Do not deduplicate
stored values, change canonical mode keys, or reinterpret current saved/impact
denominators as a side effect of this proposal.

## Current platform mechanisms and an important disagreement

`packages/design-data-spec/spec/manifest.md` supports token selection queries,
type-preserving value/re-alias overrides, and directory-based extensions for tokens,
components, fields, mode sets, relationships, guidelines, and terminology annotations.
Mode edits include add/replace, `addMode`, `removeMode`, `setDefault`, and `remove`.
Restrictions only narrow allowed values; they do not assign modes to tokens.

`sdk/core/src/manifest.rs:90-152` validates the configured manifest, loads category
fragments, and applies it to the graph. `sdk/core/src/graph.rs:825-876` copies the
target's name object for a simple override. The manifest schema's override entries
allow a target plus a value or `$ref`, not a new name/context object. A mode-specific
platform value can therefore require an explicit platform token in
`extensions/tokens/`, not simply a value override plus a new mode field.

**Observed source/spec disagreement:** `spec/manifest.md:68-76` says an override adds
a platform-layer record while retaining the foundation record for queries.
`sdk/core/src/graph.rs:855-876` reuses the shadowed key and replaces the lower-layer
record in its in-memory token map. Neither operation writes the foundation file.
The installed binary has not been verified against this source for this behavior.
The target must explicitly distinguish authored lineage, query inventory, and
effective resolution before choosing either representation. See JTC-005.

## Architectural conflict matrix

Classification and severity indicate consequence for this project, not an assertion
that every upstream difference is a defect. Each row separates normative/data facts,
SDK evidence, app evidence, and desired direction. Cross-references to GAP/AUD IDs
preserve the original registers rather than replacing their historical findings.
Current-checkout facts below are not silently replaced by PR #1454's draft.
The draft's prospective changes and remaining gaps are addressed by JTC-011 and
PR1454-001 through PR1454-005 in its separate review.

### JTC-001: current compatibility versus the destination

- **Class / priority / confidence:** governance and target-scope conflict; high;
  confirmed direction, proposed implementation.
- **Spec/data:** current `fields/`, `registry/`, and token rows coexist with legacy
  spellings and desktop/mobile density records; see the current upstream review.
- **SDK:** package/source/binary provenance is separate; current validators cannot
  validate a future authoring schema that has not been accepted.
- **App:** `src/features/design-data/comparison.ts` primarily matches normalized records and compares values;
  the CLI/page share this engine. That is useful output infrastructure, not a
  complete architectural assessment.
- **Target / consequence:** retain current compatibility as evidence while assessing
  a joint future contract. A match count or equal value must not decide architecture.
- **Ownership / check:** both projects; R1 should produce a schema-capability finding
  even when no token rows can be paired. Proposals must never appear as current
  spec-conformant features. Related: EPIC-7.1/7.3/7.4.

### JTC-002: color name, source identity, and color family

- **Class / priority / confidence:** semantic ambiguity; high; confirmed distinct
  descriptions, mapping between all concepts unresolved.
- **Spec/data:** `spec/taxonomy.md:87-104` separates colorFamily/scaleIndex from
  formatting. `fields/colorFamily.json:4-12` describes hue family, with examples
  including `accent`; that breadth deserves semantic review, not blind renaming.
- **SDK:** serializers/validators consume the field/registry catalogs; source
  behavior does not decide whether an authored scale label is a hue category.
- **App:** `src/features/color-system/model.ts:48-58` has independently identified palette colors
  and named scales; generated colorName and editable token names are additional
  representations. The current color mapping intentionally covers only narrow
  family/ordinal cases.
- **Target / consequence:** distinguish source/scale identity, label, hue family,
  semantic role, classification, and serialization as needed. Do not convert every
  custom scale name into a colorFamily term or infer a category from sampled RGB.
- **Ownership / check:** joint taxonomy review plus app adapters; a scale named
  Ocean can retain identity and an explicitly authored classification through a
  label rename without changing an alias target. Category names/hierarchy remain
  unapproved. Related: GAP-005, EPIC-3.2/3.3.

### JTC-003: declared modes versus materialized coverage

- **Class / priority / confidence:** modeling/measurement mismatch; high; confirmed
  projection behavior, target emission policy unresolved.
- **Spec/data:** `spec/mode-sets.md:44-68` allows custom declarations and cautions
  against inferred Cartesian combinations. Catalog declarations are separate files.
- **SDK:** `cascade.rs:80-118` evaluates declared-default specificity separately
  from wildcard context matching when a token omits a field.
- **App:** `src/features/modes/model.ts:41-60` combines declaration, platform IDs, and foundation
  overrides; `src/features/design-data/projection.ts:41-69` evaluates non-color output across every app axis.
- **Target / consequence:** unused declarations remain valid capabilities. Evaluation
  samples must not automatically inflate materialized dataset coverage. Defaults,
  omission, applicability, and explicit assignment need operation-specific semantics.
- **Ownership / check:** joint mode contract and app reporting; adding a declared but
  unused mode leaves canonical token identities/materialized counts unchanged,
  while an explicitly requested evaluation can add separately labeled samples.
  Equal values alone do not permit merging assigned contexts. Related: GAP-002/006.

### JTC-004: retiring foundation density duplication

- **Class / priority / confidence:** intentional future data transition; high;
  confirmed user direction, migration policy unresolved.
- **Spec/data:** `mode-sets/scale.json`, `fields/scale.json`, and
  `tokens/typography.tokens.json:385-410` presently represent desktop/mobile density.
- **SDK:** current resolution accepts scale context; this is present compatibility,
  not a requirement to keep the axis in the future foundation.
- **App:** textScaling/text zoom and temporary typography componentSize have
  different authoring semantics; the app has no declared density axis.
- **Target / consequence:** a singular foundational dataset with explicit platform
  participation must not acquire density fields just to match historical rows.
- **Ownership / check:** joint data/migration proposal; retain both historical rows
  as evidence until their replacement policy is approved. No implicit averaging,
  choosing desktop as canonical, or relabeling text scaling. Related: GAP-009,
  EPIC-2.5; no relocation of componentSize is approved.

### JTC-005: override lineage versus the effective graph

- **Class / priority / confidence:** SDK/spec disagreement and provenance risk;
  high; confirmed in inspected documents/source, binary behavior unverified.
- **Spec/data:** `spec/manifest.md:68-76` requires foundation plus platform override
  records to remain available to query; `manifest.schema.json` allows target/value
  or target/$ref entries.
- **SDK:** `graph.rs:855-876` replaces the shadowed in-memory graph entry using the
  same key/UUID. Foundation files remain untouched; source layer history in that
  map is different from the documented query model.
- **App:** browser overrides preserve generated baselines; the reference report
  loader currently inventories foundation sources, not a platform lineage graph.
- **Target / consequence:** preserve authored lower-layer records and overlay intent
  separately from a possibly flattened effective view. A resolver result must not
  be the only evidence of what was authored or overridden.
- **Ownership / check:** upstream contract/SDK decision and future app adapter;
  inspect query counts, lineage, UUID/concept references, and resolved winners for
  the same fixture. Establish binary provenance before claiming conformance.
  Related: GAP-007, AUD-006.

### JTC-006: platform opt-in and mode-aware values

- **Class / priority / confidence:** app capability gap and adapter boundary;
  medium; mechanisms confirmed in spec/source, app behavior not implemented.
- **Spec/data:** `spec/manifest.md:150-187` distinguishes local mode edits from
  restrictions. `spec/mode-sets.md:70-78` requires the default in restrictions.
- **SDK:** `graph.rs:1047-1277` edits mode catalogs and rejects removal of referenced
  modes/sets. Simple overrides copy existing names; new context-qualified records
  use token extensions. These are not an arbitrary schema override mechanism.
- **App:** platform ID/name records and Mode.platformIds are not a manifest or a
  complete platform-local mode/token layer.
- **Target / consequence:** expose platform use, opt-out, local declarations, and
  assignments as distinct capabilities. Do not label an unused mode as missing data.
- **Ownership / check:** joint contract followed by a separately approved app slice;
  the same foundation must serve one platform with no mode assignments and another
  with an explicit mode-specific extension, without mutating the foundation.
  Related: GAP-007; does not authorize full INIT-8.

### JTC-007: portable derivation intent

- **Class / priority / confidence:** authoring-schema expressiveness gap; high;
  confirmed at the reviewed inventory depth, proposed upstream additions.
- **Spec/data:** the 20-schema inventory contains token outputs/value types, not a
  dedicated reusable formula/rule/recipe program family matching current app intent.
- **SDK:** validation/resolution of generated tokens is not proof of an authoring
  program language, evaluator version, or round-trip capability.
- **App:** `src/features/scales/scaleType.ts:6-44`, `src/features/logic/model.ts:17-48`, interpolations, bindings,
  and foundation recipes retain programs, policies, and consumer references.
- **Target / consequence:** these definitions should ultimately travel with design
  data under reviewed schemas. Their current app-owned boundary is transitional,
  not evidence they should permanently remain proprietary or become token values.
- **Ownership / check:** joint schema proposal and existing app generators; round-trip
  an existing spacing recipe with formula, rounding rule, and binding references,
  then regenerate the same output under a declared evaluator version. No new
  expression engine/non-web runtime is included. Related: GAP-001/002/003.

### JTC-008: taxonomy editing and identity-preserving migration

- **Class / priority / confidence:** app capability gap plus target-model decision;
  high; catalog support confirmed, identity/migration proposal unresolved.
- **Spec/data:** `field.schema.json` describes field keys, kind, vocabulary, scope,
  validation, and serialization. `spec/taxonomy.md:11-41` separates category meaning,
  vocabulary, and formatting. Platform terminology annotations cannot add new IDs
  (`spec/manifest.md:189-195`).
- **SDK:** catalog merge operations commonly use names as keys; they do not alone
  establish a rename/reclassification migration preserving all consumers.
- **App:** token display-name editing is temporary, not taxonomy authoring; see
  `docs/tokens-browser-plan.md:14-17` and `src/features/tokens/browserModel.ts:33-38`.
- **Target / consequence:** version category/term changes, assign classification
  explicitly, and preserve references/lifecycle across renames. Do not derive a
  semantic migration from a string replacement or serialization order change.
- **Ownership / check:** joint taxonomy model and future INIT-3 slice; rename a
  category/term, preserve concept and relationship targets, and regenerate names
  with an explicit migration report. Stable-ID format and hierarchy remain open.
  Related: GAP-005/008, EPIC-3.1/3.3.

### JTC-009: components and relationships as taxonomy consumers

- **Class / priority / confidence:** app capability and future-consumer gap;
  medium; current schema support confirmed, target relationship model unresolved.
- **Spec/data:** component/relationship/anatomy/state schemas already exist;
  `spec/manifest.md:130-140` requires UUIDs for relationship override/removal.
- **SDK:** category merge/targeting behavior is distinct from token serialization
  and cannot be assessed just by matching primitive token values.
- **App:** components/structures/semantic relationships are planned, not a fully
  authored dataset. Raw upstream relationship counts are not product requirements.
- **Target / consequence:** classification changes must account for component and
  relationship consumers. Preserve supported upstream contracts before proposing
  new categories; do not invent authored components to improve inventory coverage.
- **Ownership / check:** joint schema review; classify the impact of a renamed term
  on an existing upstream relationship example without creating an app editor.
  Related: GAP-008/009; structure mapping remains undecided.

### JTC-010: current validity versus future validity

- **Class / priority / confidence:** assessment/reporting limitation; high;
  confirmed report behavior, target-profile implementation proposed.
- **Spec/data:** current draft and future authoring proposals are different contracts;
  legacy token schemas coexist with current name-object declarations.
- **SDK:** the existing binary reports 12 errors/1,380 warnings and an unsupported
  product-context resolution fixture. Those results do not prove all current draft
  requirements or future schemas were assessed correctly.
- **App:** report v1 has input validity and informational findings; authoring
  definitions receive extension findings. It has no independent target-requirement
  plane or distinction between curated source findings and executed checks.
- **Target / consequence:** show contract-specific validity, implementation limits,
  and proposal status separately. An invalid token file limits its comparison but
  should not erase independently evidenced architectural facts from other sources.
- **Ownership / check:** R1/R2 reporting; one report must show a current input error,
  a source/spec disagreement, and an unapproved portable-schema proposal without
  treating them as the same failure or accepted feature. Related: GAP-001/005/007.

### JTC-011: universal taxonomy versus owner-scoped vocabulary in PR #1454

- **Class / priority / confidence:** future taxonomy/migration profile and consumer
  capability gaps; high; branch source/data and targeted scope validation confirmed,
  adoption and full upstream conformance unresolved.
- **Draft spec/data:** head `fa714564` removes generic role/substructure, divides
  object meanings into element/attribute/affordance, separates visibility from
  variant, and splits state into two ordered semantic fields. The eight-file token
  corpus preserves all UUIDs, values, and alias targets while 551 structured rows
  change. Relationship schemas/rules change but 92 CTR scopes retain legacy state
  arrays; the exact scope-fragment check detects the new shape mismatch.
- **SDK/CI:** array handling in naming/SPEC-009 becomes catalog-driven; SPEC-022/054
  check both buckets against one component states list, but not trigger placement.
  Queryable fields remain a smaller fixed subset than the declared catalog. GitHub
  checks pass for their reported scope; no matching local binary or full local test
  run is established. See the PR review for transitional prose/data discrepancies.
- **App:** no universal taxonomy editor or component-state authoring contract exists
  yet. Current output matching does not determine category ownership or classify
  a semantic field migration versus changed values. `AnalysisRecord.context` is a
  mode context, not the new interaction-context field or a CTR's descriptive label.
- **Target / consequence:** incorporate universal-versus-owner-scoped meaning,
  property decomposition, prominence, and shared component-state references as
  proposal inputs. Do not fork states into two identity catalogs, treat interactions
  as adaptive axes, or perform global string renames. Current/draft contracts and
  declared/validated/serialized/queryable capabilities need separate reporting.
- **Ownership / check:** joint taxonomy/schema migration plus future app assessment;
  a selected+hover example preserves one component catalog and ordered bucket
  assignments, retains token/relationship identity, and distinguishes draft
  scope-validity from published serialization compatibility. New rules, state
  editors, branch adoption, or upstream fixes still require approval.

## Worked scenarios for target review

These are conceptual examples and future acceptance checks, **not** JSON conforming
to a new schema, imported defaults, or records to generate in the current app.

| Scenario | Authored facts | Expected assessment and behavior |
| --- | --- | --- |
| Unused foundation mode | Foundation declares colorScheme light/dark; a spacing concept has an unqualified baseline and no color binding | Declaration is valid capability, not two required spacing records. Requested light/dark evaluations may sample the baseline without turning those samples into authored assignments. |
| Platform activates a foundation mode | Platform A uses that baseline; platform B assigns a dark-specific spacing value through a platform token record | Report explicit platform usage and lineage. Foundation remains unchanged. Inherited baseline remains available; the qualified higher-layer record can win in its applicable context. Validate the actual record shape/selection with a supported adapter. |
| Platform-local mode | Foundation has no interfaceLevel axis; a platform declares base/elevated and assigns its custom surface tokens | Local scope and references are explicit. Other platforms and foundation outputs do not gain the axis or its Cartesian product automatically. |
| Portable generated scale | A spacing recipe references a geometric formula, an ordered rounding rule, a range, and an optional explicit binding | Preserve programs and references, emit selected outputs through the same generator, distinguish manual overrides, and reproduce results after serialization. A flat list of equal numbers is insufficient proof. |
| Taxonomy change | An identified color source is labeled Ocean and has an explicitly authored family/role classification; its label or a category's key changes | Preserve source/concept identities and alias/relationship references; report semantic migration separately from label/formatting changes. Never guess family from Ocean's name or one RGB sample. |
| Layered override | A platform overrides a foundation concept from 8px to 10px | Retain authored baseline plus overlay intent/provenance in the audit model; show the effective 10px separately. Value inequality is expected, not failed architecture alignment. Resolve JTC-005 before equating SDK query inventory to authored lineage. |
| PR #1454 category decomposition | A background-color record becomes property color plus attribute background, retaining its UUID and value | Assess semantic decomposition, ownership, references, and serialized compatibility independently. Do not report a removed compound registry term as a missing Spectrum studio feature or blindly rename every old object value to element. |
| Shared component states, split token fields | A component declares selected with prop trigger and hover with interaction trigger; a token or CTR uses selected in interaction-context and hover in interaction | Both buckets reference the same component states catalog. Preserve array order and scoped identity; report missing trigger-placement validation as a proposal gap, not an implemented SPEC rule. Adaptive modes and this component interaction context remain distinct. |

## Recommended implementation sequence and approval packet

### R1: architectural assessment contract and evidence registry

**Approved first bounded code slice; implemented and verified.** The assessment
model, curated registry, read-only evidence/profile adapter, and additive CLI report
integration now exist. Detailed run results are in the execution plan. The following
scope/acceptance packet remains the record of what was authorized; it does not
authorize R2-R4 or turn open target decisions into implemented semantics.

Define a bounded assessment
model alongside the current output report, with the three planes and typed evidence
for specification, dataset, SDK source/binary, app model/behavior, and target proposal.
Use this matrix's IDs and cite actual locations/versions. Curated observations must
be labeled as such; no fabricated automatic conformance pass/fail.

Include separate pinned profiles for the unchanged checkout and PR #1454 head;
same draft version strings/schema IDs must not merge their evidence. First expose
JTC-011/PR findings as reviewed facts with explicit validation scope, not an automatic
branch-wide conformance claim. Profile loading from Git objects/snapshots and any
new CLI option need a scoped design before implementation; no source branch switch.

- Likely owners: `src/features/design-data/` report/model logic and `scripts/`
  source provenance adapters; shared report tests. No domain editors or new engines.
- Retain existing output comparisons, CLI exit policy, defaults/authoring separation,
  raw diagnostics, and deterministic ordering. Propose a versioned report change
  and compatibility policy before replacing report v1 fields.
- Acceptance: architectural findings survive zero output matches; equal values do
  not close semantic conflicts; source/spec disagreement stays visible; proposals
  cannot be labeled accepted schemas; operational failures retain partial reports;
  curated evidence cannot be represented as an executed SDK test.
- Risk: a static evidence list appearing live/current. Record reviewed source hashes
  and stale/unverified status; dynamic discovery remains separate from reviewed facts.
- Persistence/UI: no authored-state storage change, reset, Home metric wiring, or
  initial visual redesign. No synthetic taxonomy data added to shipped defaults.

Runtime compatibility: outer output report stays schema version 1; optional
`architecture` has independent schema version 1. It carries 16 reviewed findings,
eight open requirements, 33 source pins, and separate method/freshness/profile
metadata. Existing SDK execution provenance is distinguished from reviews that are
not rerun. No combined health score or output-driven closure is implemented.
Missing/changed evidence remains visible; matching bytes do not prove conformance.
At the R1 checkpoint the browser page remained output-only; approved R2 is now
implemented and verified below. The registry's bounded
observations are not an exhaustive automatic audit or adopted authoring schema.

### R2: expose assessment planes in the existing Analysis page

After R1 acceptance and specific approval, expose current-state and target-contract
findings separately from output differences. Reuse existing filters/evidence/download
patterns and client-only boundaries. If a genuinely new reusable component is needed,
obtain Storybook approval before creating it.

- Acceptance: clear observed/proposed/executed/unverified labels; independent
  requirement and output denominators; source freshness and limitations; CLI/page
  model parity; saved/working/default isolation; keyboard, desktop/mobile, download,
  refresh/error/stale checks with empty pageerror lists; lint/build pass.
- Do not create a combined architectural health score or reinterpret Home fixtures.

Approved and verified on 2026-10-05 as an architecture slice. The existing Analysis
page now exposes all three planes, architectural filters and evidence, independent
registry inventories, and full shared JSON/Markdown downloads. The allowlisted
development response transports the same versioned assessment used by the CLI;
runtime metadata validation, partial/stale/unavailable behavior, read-only evidence
and loose/packed Git-ref refresh, source isolation, keyboard/mobile controls, and
hosted unavailability are covered. Twelve focused browser tests assert empty
pageerror lists; 23 non-SDK unit commands, lint/typechecks and build pass. See the
[execution checkpoint](architecture-alignment-plan.md#r2-verified-implementation-checkpoint-2026-10-05)
for scope and verification limits. Review pins remain deliberate; changed evidence
is stale rather than auto-rebaselined. This does not approve R3/R4 policy or models.

### R3: dependency and materialization policy for reporting

After agreement on omission/applicability and counts, propose explicit scenario,
assignment, and materialized-output metadata. First label the current Cartesian
rows as evaluation context output where appropriate; do not immediately remove
them or change production token generation/export.

- Acceptance: unused-mode scenario; explicit bound recipe; intentional identical
  assigned values; extra platform axis; no preview counted as saved; lineage and
  scenario provenance; comparison/generator parity and directly affected UI smoke.
- Any change to canonical IDs, saved impact/changelog denominators, export shape,
  migration, or persistence requires an expanded approval packet first.

Approved and verified on 2026-10-06 as a reporting-only architecture slice. The user
explicitly approved: declarations imply no assignments; equal values never merge
explicit assignments; omitted context remains recorded as omitted, not inferred as
wildcard/default; authored lineage stays separate from effective output; canonical
materialized counts remain unavailable without explicit evidence.

Versioned input/report metadata now links observed rows to evaluation or serialized
context, declared recipe references/bindings, explicit source assignments, and known
baseline/edit provenance. Non-color Cartesian rows are samples; color cascade rows
are existing generated output, with exporter lineage gaps retained. Source record
inventory is not canonical coverage or proof of manual/generated origin. Analysis
filters/summarizes row provenance and downloads the same metadata as the CLI. All
existing findings, comparison counts, token records/IDs and hashes remain unchanged.
Twenty-four non-SDK unit commands and fourteen focused browser tests pass; lint/build
pass. See the [R3 checkpoint](architecture-alignment-plan.md#r3-verified-reporting-checkpoint-2026-10-06)
for verification and capability limits. This does not settle canonical policies or
authorize R4 schemas, a platform graph, a new evaluator, or upstream adoption.

### R4: portable derivation and taxonomy contract proposals

Use existing formula/rule/interpolation/recipe examples to propose versioned
upstream authoring artifacts and classification references. Specify validation,
scope, identity, lifecycle, dependency/cycle behavior, generation semantics,
round-trip expectations, compatibility, and supported export boundaries.
Use PR #1454's universal/owner-scoped vocabulary distinctions as prospective
classification requirements, while retaining its unresolved migration/validation
questions. They do not supply the still-missing portable formula/recipe schemas or
decide how density is retired.

- Acceptance: lossless round-trip examples using existing generators, a migration
  example preserving references, and clear current-schema exclusions. No upstream
  submission or new app schema/editor without approval.
- Research can inform R1-R3 before implementation; a full portable evaluator,
  taxonomy editor, semantic-rule engine, or component authoring UI remains a
  separately scoped roadmap feature.

Approved and verified on 2026-10-06 as a proposal/isolated-fixture architecture slice.
See [PC-0.1](design-data-portable-contract-proposal.md) for versioned artifact boundaries,
native evaluation facts, quantity/permission and reference/lifecycle proposals,
supported current-schema exclusions, a pinned identity-preserving taxonomy specimen,
and D-01 through D-08 open decisions. `pnpm test:design-data-portable-contract` proves
bounded native JSON intent retention and same-generator reproduction, not an adopted
schema, new adapter, independent-language conformance or complete draft validation.
It also characterizes base-adaptation, interpolation-validation and non-finite-output
boundaries without changing their runtime behavior. Twenty-five non-SDK checks and
fourteen focused browser regressions pass; lint/typechecks/build pass. See the
[R4 checkpoint](architecture-alignment-plan.md#r4-verified-proposal-checkpoint-2026-10-06).

Proposal delivery does not adopt the entity layout, close JTC/PR findings, settle
canonical mode/layer/identity policy, or authorize production schemas, serializers,
evaluator changes, migrations, editors, upstream submissions or roadmap changes.

### Retained, deferred, and alternative work

- **Retain:** validation improvements, pure shared methods, authoritative generators,
  override/edit-session fixes, deterministic CLI/reporting, live refresh, and the
  existing narrowly reviewed color diagnostic mapping.
- **Defer:** new ordinal mappings, desktop/mobile adaptation, context dropping,
  broad composite/unit coercion, data adoption, and resolver expansion solely to
  increase compared-row counts. Revisit only when needed for a target requirement.
- **Retain as gates:** supported resolver/validator conformance for claims that
  actually use those operations. The unsupported product-context gate remains
  visible, but does not block writing or displaying a source-evidenced proposal.
- **Alternative:** leave runtime reports unchanged while reviewing this contract
  further. This is safer than a generic schema/model rewrite if R1 scope is not yet
  agreed. Neither choice discards prior verified work or changes the default dataset.

## Open decisions and approval questions

1. Is the working interpretation of a singular foundation correct: mode-qualified
   foundation records remain possible when explicitly authored/required, while
   declaration alone never forces their creation?
2. What are the distinct color source/family/role/category concepts and their
   cardinality/relations? Do not finalize these from today's field names.
3. What identity and migration contract should bridge app IDs with name-keyed
   field/mode/registry catalogs? Preserve present identifiers until approved.
4. Which omission, fallback, layer provenance, and query-inventory semantics should
   the joint target adopt, and how is the SDK/spec disagreement resolved?
5. Which portable artifacts and versioned evaluation language/algorithm contracts
   are proposed first, and how do they evolve without invalidating saved overrides?
6. Approve R1 specifically, revise it, or remain in documentation review. Directional
   agreement on a joint contract is not approval to implement every target entity.
   R1's bounded assessment/report scope is now approved; its implementation does not
    decide the authoring entities. R2/R3 reporting and R4 proposal/fixtures were
    separately approved and verified; canonical target policy and production adoption
    retain specific approval gates.
7. Which PR #1454 ownership/cardinality/decomposition choices are adopted into the
   joint target, and which remain hypotheses? Resolve its relationship migration,
   trigger placement, global/component anchoring, and profile/version boundaries
   before using that draft as a canonical authoring schema.

Suggested roadmap wording, **not applied**: clarify guiding principle 5 and EPIC-7.4
as convergence on the jointly evolved authoring/interoperability contract, not
replication of current names/values/density rows. Clarify mode declaration versus
usage and the priority of portable-definition proposals without silently marking
INIT-3/8/9 complete or changing their implementation order/status. Editing
`docs/ROADMAP.md` still requires explicit approval.
