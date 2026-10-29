# Shared classification standard and migration

> **Audience:** a proposal intended for the design-data repository. Not yet submitted upstream. Tracked as LTAX-011 in the gap register.

**Status: implemented proposal, not upstream adoption or manual architecture
acceptance.** This is the bounded classification architecture slice for
EPIC-3.1, EPIC-3.2, EPIC-3.3 and EPIC-7.1/7.3/7.4. The canonical alignment owner
is **LTAX-011** in `src/data/design-data-gaps.json`. Test results, classification
dispositions, alignment and RFC acceptance are separate facts.

## One registry, three responsibilities

Spectrum design data is the intended final owner of the shared contract.
Spectrum studio consumes this local executable proposal; it must not become a second
final vocabulary.

| Responsibility | Meaning | Boundary |
| --- | --- | --- |
| Shared semantic registry | Defined Properties, Attributes, abstract Elements and reviewed facets | A word has one normalized semantic owner |
| Catalogs and references | One component catalog and explicitly referenced authored sources | An entity label does not imply role, hue, state or target |
| Record-specific use | Token classifications, owned parts, options, relationships and representations | Uses reference a shared meaning rather than copy its definition |

`src/data/classification-standard.json` and its closed JSON Schema define the
proposal. Stable concept identities, category questions, value types,
applicability, definitions, examples, counterexamples and neighboring
distinctions are executable data rather than an informal list of strings.
Normalize whole values with trim and lowercase only. Do not split compounds,
remove punctuation, stem words or infer meaning from generated names.

One assigned term per category remains mandatory. Typed Scale index coordinates
can be finite numbers; Number values are positive safe integers. The native
category-domain and numeric-sharing owners are reused. The exception allows
numeric reuse only across those two categories with separate category-owned
UUIDs, never numeric strings or competing textual definitions.

## Accepted semantic directions

| Source or concept | Proposed meaning | Migration boundary |
| --- | --- | --- |
| Object | Element | Review each value; do not mechanically move Background or Border |
| Old Object Content | Text Element | Content-area and Content-color require actual target evidence |
| Text and Visual | Abstract Elements | Body, Heading, Detail and Code are Components, not Text subtypes |
| Workflow-icon and UI-icon | Each defined once under Element | Retain compounds; owned component parts reference them |
| Bar | Divider, progress bar or slider track target | Not a slider handle |
| Control | Entire interactive element, including switch, checkbox, radio or slider handle | Not a nesting role or an assumed composite component |
| Fill | Color of the real target and aspect | No text-only quantity or second Color owner |
| Background and Border | Attributes | Color and Opacity remain Properties |
| Font-size | Property Size with Element Text | Explicit nominal font-size metric and units, not measured glyph Width or Height |
| Visibility | Prominence | Visual emphasis, not shown or hidden behavior |
| Accent, Emphasized and Selected | Role, Prominence and Interactive context respectively | Conditional relationships do not make them synonyms |
| Edge, generic Item and Substructure | Retired classifications | Padding needs actual inset and axis/side evidence; unknown parts require investigation |

The proposal contains one grouped component catalog with typographic and
interactive examples. Slider's Bar and Control references describe distinct
targets; they are not an automatic anatomy migration. No new component editor,
general interaction engine, product-default fields or component-size relocation
is introduced.

Foundation-contributed Color name, Surface name and Foundation scale remain
explicitly **provisional source references** under EPIC-3.2. Their placement and
name collisions are open decisions. A source named `error` does not establish
Negative; Photoshop Blue does not establish a hue-family classification. Other
unreviewed facets and terms are marked non-standard rather than assumed correct.

## Definition and occurrence gates

The native binding profile is `leonardo-flat-taxonomy-v1`. It uses existing
category/term identities and explicit source classifications, not name parsing.
To conform to the proposal, a category must bind its shared question, type,
single-term cardinality and name; textual terms must bind the shared definition
under the correct owner. A matching word or an arbitrary description is not
evidence of meaning. These checks establish conformance to a **proposed local
contract**, not acceptance by Spectrum or a manual review criterion.

Assess every category, term, stored assignment and declared use. Issues propagate
from a definition to each dependent assignment. Imported arrays retain every
member and its order and receive non-standard markers. Unknown source
applicability, missing projections, inconsistent projection fields and
unreviewed nominal measurements cannot pass. The nominal font-size generator
declares read-only measurement metadata on its existing metric group. Registry's
authored metric, generated sources and Tokens consume that same declaration;
they do not infer quantities by splitting names or change numerical values.

Every retained compatibility alias is assessed separately in each emitted mode
context and inherits its target's definition and measurement warnings. Its old
name also remains non-standard until an explicit representation binding is
reviewed, even if its target conforms. A direct alias must have exactly one
emitted target in its context; choosing the first ambiguous match is forbidden.

Every issue states a reason, required fix, joint responsibility and LTAX-011.
Source and contract SHA-256 fingerprints identify the exact reviewed revisions.
Revalidating a packet recomputes flags and outputs from preserved source records;
changed hashes, omitted flags, changed values and unresolved references fail.

## Editing and export policy

### Designer-facing review language

Tokens and Registry label flagged data **Classification review needed**, rather
than implying that every warning is a broken color or a designer mistake.
Open a flagged token to see **Why this needs review**, with separate reasons and
next steps. For shared category and term definitions, use **Registry > Taxonomy**;
**Migration review** lists the affected records. **Export taxonomy compatibility
packet** preserves the original data and the detailed machine-readable review.

Default data can be flagged because the current check requires category and
term descriptions to match the local proposal exactly. A shared definition
warning repeats on tokens that use it; it is not a separate color-value error
on each token. Source-name warnings also remain while the proposal has not
finalized authored source references. They cannot be cleared merely by changing
a color name, color value or token description.

This presentation-only change belongs to **LTAX-011**. It does not change the
classification profile, machine-readable reasons, flags, export gates, saved
baselines, token-concept or mode-value counts, or the gap's alignment/RFC status.
It does not establish conformance to the published Spectrum design-data spec.

| Path | Behavior |
| --- | --- |
| Registry editing and Save | Structurally valid non-standard native records stay editable and saveable, with clear warnings |
| Standard-compliant taxonomy | Reject the entire declared scope if any instance needs a fix; never omit records to fabricate success |
| Taxonomy compatibility | Preserve all supplied categories, terms, classifications, canonical output rows, values, units, mode contexts and direct aliases, plus per-instance fix flags |
| Generated compatibility bundle | Preserve the original pinned T-shirt bundle intact inside a labeled envelope, with native classification review and explicit flags for retained draft representations |

The version-one review packet has profile
`spectrum-classification-review-v1`, with target
`spectrum-classification-v1-proposed`. Both standard and compatibility packets
state `upstreamAdopted: false`. Compatibility always states
`standardConforming: false`, even when a subset happens to conform. It is not a
reimport format for the old bare taxonomy packet.

The packet source is the working native taxonomy and all published,
owner-scoped canonical rows across declared modes. Original records are retained
under `source.taxonomy`, `source.records` and `source.aliases`. Category,
definition and stored-assignment pointers are relative to `source.taxonomy`;
`/usages/...` pointers are relative to `source`. IDs and pointers identify
occurrences; these are not canonical concept or mode-value denominators.

The original `buildTaxonomyExport` and `buildCanonicalTaxonomyExport` retain
their explicitly local legacy profile for existing programmatic consumers.
User-facing taxonomy downloads use the reviewed envelope. The canonical-row
generator's default remains strict for Save and reference validation; only an
explicit preservation export opts into retaining projection diagnostics. Unsafe
identities, malformed types, invalid values or unresolved alias targets are not
silently accepted.

The generated envelope validates its pinned profile, existing token graph and
field declarations, vocabulary shapes, mode identities and default references,
then checks complete semantic-source equality, fingerprints and every draft
occurrence. This is not a complete upstream bundle/import schema, SDK
conformance check or a re-execution of every rule and derivation.

## Saved data and accounting

The native taxonomy remains schema version one with its strict known-field
guards. No status fields are injected into terms or description strings. The
review is a separately versioned derived layer; edits use the existing
description/question fields only when an author explicitly changes them.

Save, Cancel, reload, revert and Reset all preserve their existing source and
saved-baseline behavior. Review status is recomputed from that source and the
current contract, so a reverted definition cannot retain a stale passing flag.
The proposed Prominence label is displayed explicitly while the saved Visibility
label and immutable field key are preserved until an explicit rename.

No source values, native identities, alias ownership, generator, mode ownership
or saved denominators are changed. Review annotations and draft observations are
not new token concepts, mode values, manual overrides or saved edits. Existing
comparison, coverage, impact and canonical gap owners remain authoritative.

## Required upstream investigations

| Issue | Preserved evidence | Required decision |
| --- | --- | --- |
| CLASS-TABLE-ITEM-001 | Main Table anatomy Item and Row containment | Cell versus row-content wrapper, exact padding target and every dependent use |
| CLASS-SEGMENTED-CONTROL-ITEM-001 | Main Item Height relationship, UUID and alias | Actual part and measurement; no assumed Segment or Control |
| CLASS-INTERACTION-FOCUS-HOVER-001 | Both proposal `["focus", "hover"]` arrays, UUIDs, concept IDs and aliases | Either state versus simultaneous conditions, supported behavior and Focus ownership |

The frozen main revision is
`eba428d462bfb5a3288835cb6cf0dcb1c4dc93af`. The separate proposal revision is
`fa714564eaa33bc37f905fad64162d60d6a48087` from
[adobe/spectrum-design-data#1454](https://github.com/adobe/spectrum-design-data/pull/1454).
Do not merge those profiles or treat the proposal as shipped.

The exhaustive upstream occurrence proof is a separate non-mutating migration
artifact. Every declared registry, field, token, inline value, component,
anatomy, relationship and compatibility occurrence must be mapped with evidence,
explicitly non-standard needing a fix, or explicitly outside its declared scope.
Equal values, lifecycle and deprecated aliases are not semantic mapping evidence.
Publication must carry frozen hashes, original records, pointers and limitations,
not only a list of proposed renames.

## Executed frozen migration proof

The separate Spectrum reference proof reconciles all twelve primary inventory
families and independently verifies every original JSON value, record, type and
array order. Both complete profiles preserve original source bytes and direct
references. They have zero coverage blockers; this is not zero semantic issues.

| Evidence | Frozen main | Separate proposal |
| --- | ---: | ---: |
| Exact assessed occurrences | 129,666 | 129,272 |
| Distinct primary record locations | 19,291 | 19,131 |
| Token records, including inline records | 4,211 | 4,206 |
| Relationship records | 6,415 | 6,415 |
| Non-standard occurrences blocking full-scope export | 79,011 | 78,880 |
| Orphan field occurrences retained with fix flags | 0 | 185 |

Occurrence totals include containers, individual array members, compatibility
representations and dependent uses. They are not distinct faulty concepts,
canonical token denominators or existing Spectrum SPEC-033 violations.
Structurally verified derived Save retains all warnings, standard export rejects
each complete profile, and compatibility output preserves each entire frozen
profile. The three deferred investigations remain explicitly non-standard.

The proof's exact shared-proposal input SHA-256 is
`33b339b7261f94a08ebe23c73986e39c2c6c34815c42c91e6c086ad8d74fe68a`;
its proposal-schema input SHA-256 is
`47799b9482e8ba35c0806cbb473f545c77b6f66b8e9108354485b10c9bac43fc`.
These are hashes of input file bytes, distinct from the native review packet's
canonical-JSON fingerprints. The parent decision register and review contract
also match the proof's recorded input hashes.

The Spectrum session's persistent `classification-audit/` artifact bundle
contains `reference-proof/README.md`, runnable TypeScript, its closed artifact
schema, `upstream-migration-proof.json`, `upstream-migration-validation.json`,
`upstream-migration-tests.tap` and the exact standard-export blockers. The
complete compatibility envelopes are intentionally retained outside the
application repository:

| Artifact | Bytes | SHA-256 |
| --- | ---: | --- |
| `upstream-migration-main.json` | 407,981,049 | `b78f02dcf746704f6b29a565ff4f595108e819b5cd4a7f13eb44b74c864c522a` |
| `upstream-migration-draft.json` | 407,365,779 | `8f560598229d75738ae13848d807c20d926394f48a7aa3be4f06013e026af408` |

Read the manifest before these large envelopes. Strict TypeScript and 30 AVA
checks passed, including independent complete two-profile verification and
adversarial omission, stale evidence, type, array-order and flag-tampering cases.
This verifies the bounded derived proof, not a production schema/SDK migration.
No upstream files, Git refs, dependency installations or publication changed.

## Upstream handoff and acceptance

1. Publish the shared proposal data/schema, closed review envelope, frozen
   occurrence proof and adversarial fixtures together in a reviewed upstream
   branch. This task does not create a branch, commit, push or pull request.
2. Review the retained non-standard cases, applicability and API representation
   bindings individually. Do not mark a gap aligned from passing local tests.
3. Port the accepted shared owner to upstream schemas and SDK/query/naming/DTO
   consumers, with lossless compatibility handling. Execute a corresponding SDK
   only when separately authorized and supported; LTAX-004 remains blocked.
4. Have Spectrum studio consume that accepted shared package and perform an explicit
   saved/working source migration. Do not silently relocate Body/Heading or
   foundation names.

Native checks are `pnpm test:classification`, the existing taxonomy/alias/schema/
persistence/coverage suites, and focused Registry/export browser interactions.
Browser paths collect and assert an empty page-error list. Canonical gap
JSON, generated Markdown, CLI and Analysis consume the existing gap register.

The local verification covers desktop and narrow Registry warnings, non-standard
Save, Cancel/reload, retained aliases, saved-name collision rejection, category
order, both compatibility downloads, color Scale Editor/Evaluation/Code, and
the existing export stories. Export controls no longer consume the entire narrow
token viewport; the collection retains at least 240 pixels and remains reachable
after reload with expanded navigation. Browser checks use an isolated production
snapshot because concurrent source edits can reload a shared Vite session.
Long per-term reasons have bounded, keyboard-scrollable review regions so they
do not make the editing row taller than its viewport. All reason text is retained.
Conforming definitions do not introduce empty keyboard-scroll regions.
Repeated narrow workflows cover both description edits and keyboard access to
the full reasons. The editing helper waits for Spectrum's virtualized table to
restore pointer events after scrolling, rather than forcing a click on an
inert row. The typography publishing check validates the compatibility envelope
and confirms hidden typography is excluded without removing its authoring preview.

Older fixtures still expect retired `typographyMetric`/`contrastLabel` categories,
assume every scale uses the global contrast list despite Gray's existing custom
list, or compare historic whole-source materialization fingerprints after
separate source-model changes. Those failures are not used as passing evidence,
and this slice does not restore retired categories or repin historical evidence.

Suggested roadmap updates after explicit user approval: record this bounded
proposal/review layer as progress on EPIC-3.1/3.3 and EPIC-7.3, while leaving
EPIC-3.2 source placement, the complete taxonomy migration and EPIC-7.4 upstream
adoption open. `docs/ROADMAP.md` is intentionally unchanged.
