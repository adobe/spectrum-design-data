# Design-data alignment review

## Current scope supplement

The snapshot review below remains evidence about the original checkout, not the
destination architecture. The user approved a joint future-contract proposal with
portable derivations, optionally used foundation mode declarations, and no
desktop/mobile foundation duplication as the intended direction. See
[the target contract](../design-data-target-contract.md) for JTC-001 through JTC-011
and [PR #1454 review](../design-data-pr-1454-review.md) for the separately pinned draft
taxonomy/vocabulary profile. R1 now implements a bounded read-only assessment/profile
adapter and additive CLI report metadata, not a new authoring schema or draft adoption.
Separately approved R2 presents those assessments in Analysis; R3 adds reporting-only
evaluation/assignment provenance without choosing canonical emission or resolver policy.
R4's [PC-0.1 proposal](design-data-portable-contract-proposal.md) and isolated fixtures
now add portable-contract requirements and recorded migration evidence. They do not
change current schema validity, select unresolved policies or establish a new runtime.
The prior baseline-spacing/non-color mapping recommendation is deferred pending
the architectural assessment and explicit target decisions.

## Status and provenance

Read-only review on 2026-10-05, after
[the internal audit](architecture-alignment-audit.md). No upstream files, app
defaults, application code, persisted state, or package dependencies were changed.
Implementation remains subject to [the approval gate](architecture-alignment-plan.md).

| Source | Observed version or revision |
| --- | --- |
| Local spectrum-design-data checkout | `838a6835`; relevant package paths clean at review time |
| `@adobe/design-data-spec` package | `4.3.0` |
| Normative document and rule version | `1.0.0-draft`, explicitly subject to change |
| `@adobe/spectrum-design-data` | `3.2.5` |
| Registry compatibility package | `5.0.42` |
| Component API compatibility package | `6.1.60` |
| Existing local SDK binary | `design-data 0.12.1`; not rebuilt or proven to correspond to the checkout |

Package versions and document spec versions are different identifiers; do not
substitute one for another. Counts below describe this working snapshot, not a
guarantee about future releases.

Scout memory/investigation discovery returned no Scout tools. `bd` and `moon`
were unavailable in the shell. Direct read-only inspection was used; no Scout
memory, issue, task graph, commit, push, or source regeneration was performed.
The available design-data MCP is not evidence that its embedded snapshot equals
this checkout. The report must record separate provenance if it ever uses it.

## Authoritative sources and loading boundaries

`packages/design-data` is the canonical data root. The registry compatibility
package reads registry files from that root. The component API package resolves
the same package's `components/` and adds legacy aliases such as `title` and
`properties`. Neither is an independent dataset to count twice.

The originally requested `packages/design-data/component-schemas` does not
exist. `packages/component-schemas` is the relevant compatibility/API package;
it currently has a loader, not a separate directory of component schema JSON.
Package guidance mentioning spec-local `components/` is not an adequate loading
authority; inspect actual exports and filesystem locations.

The current design-data export map exposes JSON subpaths and has no `.` export.
Do not assume a root JavaScript import provides registry helpers. Use supported
subpaths for published-package loading or an explicit local-checkout adapter.
Local discovery should also account for categories, such as relationships, not
listed by every current export map.

Never use legacy `packages/tokens/src` as an independent source of truth. The
evolution/authoring documents identify legacy token output as derived from
cascade-format data. Naming exceptions and legacy schemas may still be relevant
validator inputs and must be recorded as compatibility metadata.

## Complete current schema inventory

All 20 schema JSON files were parsed, including nested definitions and reference
edges. Forty-five `$ref` occurrences were found; no relative target file was
missing. This check does not resolve every remote schema URI or prove validator
support. Schema roots using `oneOf`, `items`, or `$defs` cannot be assessed from
top-level `required` alone.

All paths below are relative to `packages/design-data-spec/schemas/`.

| Schema | Managed type and key distinction |
| --- | --- |
| `token.schema.json` | Structured or legacy-string names, literal value XOR alias, optional metadata and component bindings; object names require property |
| `cascade-file.schema.json` | Array of token rows, not the app's `{schemaVersion, modeSets, tokens}` wrapper |
| `dataset.schema.json` | Optional dataset-root discovery descriptor, directories, and paths; not an authoring-foundation document |
| `field.schema.json` | Field name, kind, validation policy, serialization, registry and domain scope |
| `mode-set.schema.json` | Named axis, available modes, declared default, optional coverage rules |
| `manifest.schema.json` | Foundation version pin, queries, type-preserving token overrides, restrictions, extensions and formatting |
| `platform-extension.json` | Platform vocabulary enhancements: extends, term IDs, platform terminology/aliases and notes |
| `product-context.schema.json` | Product-layer provenance, rationale, overrides and extensions; not an unresolved product-preset-default model |
| `registry-value.json` | Typed vocabulary collection with custom-value policy, descriptions, values and lifecycle |
| `component.schema.json` | Component identity/URI, metadata, API options, implementations, slots, anatomy, states, bindings, accessibility and document blocks |
| `anatomy-part.schema.json` | Named component parts, containment, documentation and lifecycle |
| `state-declaration.schema.json` | State names, trigger/precedence/layering and lifecycle; inspect embedded component state definitions for contextual fields |
| `relationship.schema.json` | Array of component-token relationships (CTRs), scope, context, literal/alias values and interim legacy metadata |
| `accessibility.schema.json` | Semantic roles/intents, focusability, keyboard intents and WCAG references; not a contrast-evaluation result store |
| `document-block.schema.json` | Typed content, optional agent-specific text and do/dont guidance |
| `guideline.schema.json` | Identified guideline documents, category, relationships, tags and document blocks |
| `value-types/color.schema.json` | Color string schema; do not infer equivalent gamut/precision merely from string equality |
| `value-types/typography.schema.json` | Composite font family, size, weight, line height and optional spacing |
| `value-types/typography-scale.schema.json` | Composite font size/line height output; not reusable formula/expression definitions |
| `value-types/drop-shadow.schema.json` | Array of structured shadows; not elevation authoring logic |

Simple numbers/strings also appear in token/property contracts. Four dedicated
value-type schemas are not the only valid literal representations. Preserve
property/value-type provenance and unit semantics during normalization.

## Document, rule, and fixture coverage

All 23 spec documents were inventoried and their type/contract sections reviewed:

- Core data: index, token-format, taxonomy, registry, mode-sets, cascade,
  dataset-layout, manifest, product-context, and relationship-format.
- Component content: component-format, anatomy-format, state-model,
  accessibility, accessibility-adapters, document-blocks, and guideline-format.
- Consumer/lifecycle behavior: query, diff, evolution, authoring-workflow,
  agent-surface, and manifest-schema-override-spike.

The YAML rule catalog was parsed with an existing installed YAML library,
without adding dependencies. It contains 59 IDs, SPEC-001 through SPEC-059.
Use the catalog, not guessed rule numbers or older summaries, for diagnostics.
Coverage includes aliases, uniqueness, modes, taxonomy, lifecycle, component
cross-references, documentation, accessibility, manifest queries, dataset layout,
property decomposition, CTR integrity, and alias mode-context compatibility.

Conformance areas are valid, invalid, reference, resolution, manifest-extensions,
query, diff, and generation. They were inventoried as authority for future
focused checks; the entire upstream test suite was not executed.

## Recurring interoperability contracts

### Identity, names, and aliases

Per-row UUID identifies a particular token value/row for diff and references.
`conceptId` groups mode rows of the same concept. The draft requires consistent
concept IDs across those rows and permits aliases to target a concept ID; such
resolution uses the referencing token's own context.

Do not equate independently minted app/upstream UUIDs. Use explicit mapping
provenance where identities differ. Missing concept IDs are an identity/coverage
limitation, not permission to synthesize undocumented upstream IDs.

Literal `value` and `$ref` are mutually exclusive. Aliases require existence,
compatible type, acyclic resolution, and correct mode context. Composite inline
references also have separate validation. String-named tokens remain accepted
legacy debt, but do not participate as name-object cascade records.

Fields are declared separately from vocabulary registries. Current declarations
typically make semantic vocabulary advisory, mode membership strict, and numeric
index validation non-enumerated. Cross-registry ID overlap is explicitly allowed;
uniqueness checks must be scoped correctly, not globally applied to every term.

### Modes and cascade

Current built-ins are `colorScheme` (light/dark/wireframe), `scale`
(desktop/mobile), and `contrast` (regular/high). Custom declarations are allowed;
the app's textScaling axis is not automatically a spec gap.

Omitted mode fields imply declared defaults for matching/specificity. Only
non-default fields increase specificity. Foundation, platform, and product
precedence is followed by specificity, then earlier document order and
lexicographically earlier file path. Resolve aliases after choosing a candidate.

Do not sort token arrays before resolution. Canonical report sorting must retain
original file and row order as provenance. A mode axis is not a platform layer,
and a formula parameter is not automatically a mode value.

### Platforms and products

Manifests support a bounded set of operations, including queries, restrictions,
type-preserving token overrides/re-aliases, and supported artifact extensions.
Vocabulary platform extensions are different from token cascade overrides.

The schema-override decision explicitly disallows platform-local relaxation of
foundation schemas. Unsupported app authoring objects cannot become conformant
merely by being placed under a platform extensions directory. Keep them in an
explicit app-owned contract and propose an upstream model first.

Product-context captures override rationale; it does not silently resolve the
app roadmap's product-preset defaults decision or authorize moving componentSize.

### Components, relationships, and documentation

Component names, URI identities, options, slots, anatomy and states have explicit
contracts and scoped uniqueness. State arrays represent component conditions,
not adaptive mode selections. CTRs describe component/part/property/options scope
and values or references separately from primitive token names.

Document blocks provide content and optional distinct agent instructions.
Guidelines require populated document blocks and have separately checked related
references. Accessibility captures semantic behavior and WCAG links. These models
are already supported upstream; absent authoring UI is an app capability gap,
not a reason to invent competing upstream types.

### Lifecycle, diff, and generation

Token replacement/deprecation fields require valid targets and rationale for
splits. The draft specifies an explicit removal window. Browser status labels
such as draft/released cannot be substituted for complete lifecycle records.

Upstream diff precedence starts with UUID, then name-object equivalence, then
replacement links. Categories partition records. A cross-system coverage report
is not a release diff: it additionally needs reviewed mappings and unassessable
outcomes. Do not report every app-specific record as an upstream deletion.

Authoring writes go to registered dataset-root directories; generated legacy
output remains derived. This application is not yet writing an upstream dataset
and must not claim those guarantees for its current authoring JSON.

## Actual reference-data snapshot

| Category | Observed coverage |
| --- | --- |
| Token files | Eight arrays; 2,533 rows and 2,533 distinct row UUIDs |
| Concept metadata | 1,208 distinct nonempty concept IDs; 159 rows without conceptId |
| Alias rows | 722 top-level `$ref` records |
| Components | 97 JSON declarations |
| Relationships | 91 JSON arrays |
| Fields | 33 declarations |
| Mode sets | Three declarations |
| Registry | 32 JSON collections; directory also contains a non-JSON entry |
| Guidelines | 26 JSON documents |

These counts are not directly comparable denominators. A component declaration,
relationship row, token concept, mode row, and registry term are different units.
An empty token file does not mean all of that domain is absent from relationship
data. Compatibility aliases must not duplicate inventory entries.

## Bidirectional app mapping

| App data | Representation and disposition |
| --- | --- |
| Generated color values | Transformable token rows; preserve gamut and reviewed structured-name mapping |
| Generated typography/spacing/size | Numeric or composite outputs are representable; current app browser model is primitive-only and needs a loss-aware adapter |
| Custom mode sets | Representable declarations; app presets/foundation parameter payloads are not themselves token rows |
| Token identities and per-mode values | Directionally aligned; retain current stable identity and explicit cross-system mapping; do not mint IDs during every report run |
| Color cascade export | Contains concept/row identities and mode catalog; wrapper is not a conformant cascade-file array; scope is color/system values, not all foundations |
| Token names | Current colorName/contrastValue and display names need reviewed field/registry mapping, not blind rename-by-string |
| Palette/surfaces | Fixed generated values can map; generation inputs, preview roles and rendering configuration require separate authoring metadata |
| Rules, formulas, interpolations | Generated results fit; reusable definitions and consumer/binding semantics need proposed authoring models |
| Adaptive claims and continuous controls | Discrete emitted mode values fit; ownership, parameters, ranges and continuous behavior need proposed authoring models |
| Platform ID/name list | Partial vocabulary mapping only; missing manifest/layer/extension behavior is an app modeling gap |
| Token editing/status/baselines | Supported description/lifecycle can project partially; draft status, stale baselines and working snapshots remain app-local |
| Contrast evaluation/compensation | Generated outputs fit where property semantics are known; authoring algorithm/settings and measured evaluation evidence are not semantic accessibility declarations |
| Components/options/anatomy/states/CTRs | Supported upstream but current app mostly lacks authored/default records; report capability/content absence, do not populate |
| Fields/registry/guidelines/docs/accessibility | Supported upstream; app taxonomy and authoring support are incomplete or not present |
| Structures/themes/product defaults | Roadmap questions or planned data; do not claim missing-current-data evidence or build those epics here |
| Home insights | Fixtures, not authoritative default dataset or validated coverage measurements |

## Validation baseline and limitations

`moon` was unavailable, so the already-built SDK was used directly, without
building or source regeneration:

```sh
sdk/target/debug/design-data validate-dataset packages/design-data \
  --spec-schemas packages/design-data-spec/schemas \
  --exceptions-path packages/tokens/naming-exceptions.json --format json
```

Observed result: exit 1, `valid: false`, 12 errors and 1,380 warnings. All errors
report required `value` in layout-component token rows. Warning groups:
SPEC-009 (227), SPEC-042 (4), SPEC-043 (25), SPEC-046 (14), SPEC-050 (450), and
SPEC-058 (660). This is a validator/input baseline, not proof that the live draft
requires each affected alias to have a value; legacy schema selection and binary
freshness remain unresolved. Preserve raw diagnostic provenance in future reports.

Actual task definitions expose `design-data-spec:check`, registry/guideline
validation, dataset validation, and aggregate design-data validation. Package
guidance referring to AVA tasks is partly stale. Resolve current moon definitions
before prescribing a task; do not invent a `design-data-spec:test` task.

## Review exit and next action

### First implemented mapping: foundational color ramps

`foundation-color-ramp-v1` maps app-generated `colorName`/`contrastValue` rows to
upstream `colorFamily`/`scaleIndex` rows only in `tokens/color-palette.tokens.json`.
Evidence: app `contrastTokenLabel` and cascade export, upstream
`fields/colorFamily.json` (hue family with ramp ordinal) and
`fields/scaleIndex.json` (numeric foundational scale index). This is an ordinal
mapping, not a claim that equal indices imply equal contrast or RGB.

Exact family, index, and declared color/contrast context are required. Custom
names, semantic/component rows, extra axes, and multimode ambiguity are excluded;
duplicate targets remain ambiguous. Omitted mode keys require a declaration's
default, not a guessed light/regular value. Tests cover these restrictions.

The current real report confirms 352 pairs (10 equal and 342 value differences
under the declared tolerances). Its 12 SDK input errors and unresolved aliases
remain diagnostics. Other mapping rows in the matrix above are still proposals
or unassessable boundaries, not implemented equivalence guarantees.

### Completion adapter update: 2026-10-05

Generated typography, spacing, and size records now use the existing token source
adapter and edit resolver, preserving effective names, exact-mode value overrides,
and pre-override evidence. Pure shared mode/typography resolution keeps base values,
ownership/default behavior, and pending dimension rules aligned with UI generation;
temporary previews remain excluded. This repairs app output projection, not a new
semantic mapping or composite-value equivalence guarantee.

Explicit external mapping inputs validate their optional contracts before matching.
Markdown and JSON expose source/mapping/validator provenance and resolution limits.
The refreshed real report retains 352 assessable foundational color pairs and the
same source hashes; other matrix rows remain proposals or limited representations.
See the execution plan's first-completion-batch checkpoint for verified checks and
remaining mode/platform, resolution, and contextual unit/composite boundaries.

### Non-color mapping candidate review: 2026-10-05

Read-only follow-up at reference revision `838a6835`, design-data `3.2.5`, spec
package `4.3.0`. Scout discovery exposed no Scout investigation/search tools; source
and schema files were inspected directly. No registry, token, or schema was changed.

The following are **proposed mappings**, not additional confirmed pairs. Candidate
counts select the app's declared-default color/contrast/text-scaling combination,
with the existing component size `m`; they do not collapse all app mode rows.

| Candidate | App evidence | Reference evidence | Reviewed disposition |
| --- | --- | --- | --- |
| Font-size ordinals | `typographyTokens.ts` font-size group; `typographyGeneration.ts` and `scales/generate.ts:scaleStepName`; 17 baseline values at 50/75 and 100-1500 | `tokens/typography.tokens.json` has 18 font-size tiers for each of desktop/mobile. The desktop 100 row is UUID `938e2d24-1e90-48f0-a596-595a69103707`, literal `14px`, with `property: font-size-100`, `scaleIndex: 100`, and `legacyKey: font-size-100` | 17 overlapping ordinals for desktop are promising, but legacy indexed property spelling and density context need an explicit adapter policy. The app has no declared density axis. No match is inferred from equal values or display names. |
| Global spacing ordinals | Built-in `spacing-scale-1`, existing geometric formula, base 8; 18 baseline steps, with below-base labels 20/40/60/80 | `tokens/layout.tokens.json:6345-6494` has 15 unscoped `property: spacing` literals. UUID `507c0b4a-9dbc-4242-89fd-5efc4d1c35b9` is index 100, `8px` | 10 shared ordinals, 100-1000. Below-base labels differ; 25/50/75/85 must not be relabeled to nearest app steps. A mapping must select the built-in scale by identity and use an approved baseline-context policy. |
| Global size ordinals | Built-in `size-scale-1`, linear formula, base 24; 15 baseline values at 50/75 and 100-1300 | `tokens/layout-component.tokens.json` has 28 unscoped `property: size` literals whose name fields are only property/index/legacyKey. UUID `d0703b1d-57f0-4601-9353-e1807cd966a3` is index 100, `8px` | 15 shared ordinals, with intentional recipe/value differences. Do not shift app 100 to reference 400 merely because both can be 24px. Icon-, anatomy-, and component-scoped sizes are excluded. |
| Line-height families | App has body, heading, component, and component-unitless families in `typographyTokens.ts` | `typography.tokens.json:907-931` uses `property: line-height` with `referenceScaleIndex: 100`; desktop/mobile are `18px`/`22px`. `fields/referenceScaleIndex.json` explicitly distinguishes another scale's tier from a token's own index | No family mapping approved. Multiple app role-specific families must not silently target one generic reference family. Numeric unitless values are not equivalent to absolute px without font-size/role context. |
| Composite typography | Current app projection emits primitive families; recipe and interpolation definitions remain app-owned | `typography.tokens.json:69-143` has composite typography values with brace references to font family/size/weight/spacing/line height | Keep unassessable until composite projection and reference resolution have supported context/provenance. No flattening or copied defaults. |

Discriminating sources: `fields/scaleIndex.json` defines a foundational ramp ordinal;
`fields/scale.json` and `mode-sets/scale.json` define desktop/mobile **density**;
`spec/mode-sets.md:58-68` requires declared defaults and cautions against inferred
Cartesian products. App textScaling is continuous text-size intent projected to
presets, not an alias for density. `componentSize` remains in typography pending
EPIC-2.5; this review does not create product defaults.

Remaining requirements before implementing any candidate:

- Retain stable foundation/token-family evidence instead of inferring semantics
  from editable display names. Independent app/upstream UUIDs remain independent.
- Approve exactly which baseline operating contexts are compared. The app emits
  colorScheme/contrast/textScaling contexts for non-color rows, while reference
  typography has density and reference spacing/size omit mode fields. Do not drop
  axes or claim cross-axis equivalence merely because current values are invariant.
- Normalize only supported literal dimensions with explicit unit/schema evidence;
  app numeric px and upstream `14px`/`8px` strings currently remain unassessable.
  No rem conversion, percentage/calc evaluation, arbitrary string coercion, or alias
  resolution is authorized by this candidate review.
- Keep custom/renamed scale scope, component/anatomy records, extra axes, non-default
  presets, duplicate targets, unresolved references, and incompatible units outside
  the first mapping unless their semantics are separately reviewed.

The earlier recommended implementation slice was baseline-only font-size/spacing/size ordinal
mapping with these policies explicitly approved and fixtures for both eligible and
excluded cases. Alternatives are explicit reviewed ID-pair inventories that remain
unassessable across unknown contexts, or deferral until a density/model contract is
defined. Neither alternative authorizes INIT-2/INIT-8 expansion. The current library
is unchanged and still confirms only the 352 foundational color pairs. This next-step
recommendation is superseded by the joint-contract pivot; retain the candidate
inventory as output evidence rather than importing legacy density/taxonomy into
the authoring architecture.

### Foundation mode/platform diagnostic boundary

Registry `type: platform` is retained as evidence without merging it into app
platform declarations. Same-category shared row identities expose context differences
and remain unassessable across them; reviewed default-context requirements cannot
fall back to a first mode or equate undeclared defaults. Matched mode declarations
report vocabulary and default differences without equating their foundation payloads.
Invalid required inputs suppress speculative mode/platform coverage diagnostics.
The temporary-checkout browser test proves normalized loader/CLI/page declaration
refresh and recomputation of an existing reviewed color mapping when a new fixture
palette row is discovered, with output artifacts excluded from watched inputs;
its stub SDK does not prove schema/cascade conformance. Platform manifest extensions,
restrictions, and product layers remain outside this verified boundary.

### Joint target and PR #1454 follow-up

PR #1454 at `fa714564eaa33bc37f905fad64162d60d6a48087` is an open draft with
GitHub-reported conflicts against its live base, not the audited local checkout.
Its 137-file delta and RFC #1453 support separating universal categories from
component-relative vocabulary, splitting property sub-qualities/surfaces/affordances,
separating visibility from variants, and preserving one component states catalog
behind two semantic interaction arrays. Token UUIDs, literal values, and alias
targets remain unchanged in the inspected merge-base delta, while 551 structured
rows change. Unchanged output therefore does not prove unchanged architecture.

The review records 92 legacy relationship state-array shape errors introduced
relative to the draft's merge base under a targeted `$defs.scope` check, plus
trigger-placement, transitional prose/anchoring, query-capability, and profile
compatibility limits. This does not constitute a complete schema/SDK test run;
reported CI and author verification have separate provenance and scope.

Do not replace current report input/hash/validator provenance with this branch,
infer that its taxonomy is merged, or mix its 2,374-row inventory with the existing
2,533-row checkout. Current-state, proposed-profile, and target validity must be
separate. R1 evidence/assessment modeling is now implemented before further ordinal
mappings; portable schemas and density retirement
remain independent design requirements not implemented by the PR.

### R1 runtime evidence boundary

The CLI's optional independently versioned architecture section carries 16 reviewed
JTC/PR findings, eight open requirements, five separate profiles, and 33 source pins.
The reader verifies only source bytes or cached immutable Git objects; it never
reruns the PR review's schema checks/CI or executes a validator on the pinned draft.
Current configured-checkout SDK identity/fixture statuses are carried separately
from curated source evidence, with binary/source correspondence not established.
Matching hashes establish reviewed-snapshot freshness, not complete validity or
accepted future schemas. Missing evidence is unverified; changed/advanced evidence
is stale; independently evidenced facts remain present during required-input errors.
The browser remains output-only until R2 approval. See the execution plan's R1
checkpoint for checks, compatibility, preserved behavior, and remaining gates.

All current schema categories, reference-data roots, normative document categories,
and rules have an explicit review disposition. Deeper conformance execution,
fresh SDK validation, and numeric/unit equivalence proofs remain implementation
checks, not completed claims.

Use [the gap register and approval packet](design-data-alignment-gaps.md) to
approve concrete architecture slices. Do not modify upstream data to make the
comparison green, and do not present invalid/unassessable input as app coverage.
