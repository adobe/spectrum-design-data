# Token taxonomy and order audit plan

## Status and scope

Clarified on 2026-10-11. All identified product questions are resolved.
The plan covers a bounded audit, an app-owned architecture slice and local
documentation suitable for a future Spectrum design-data RFC. The approved
contract, defaults, v6 upgrades, canonical outputs and future-Save compatibility
aliases are integrated and local verification is complete.
Do not modify spectrum-design-data, submit an RFC, commit, push
or update the roadmap.

Alignment: INIT-3 System vocabulary and EPIC-7.1 Mappable models.
EPIC-4.2/4.4 supply future semantic-token requirements; EPIC-8.1/8.2 supply future
Platform formatting requirements. Neither authorizes a general semantic engine
or Platform editor here.

**Shared ownership:** the settled Structures/Size vocabulary, semantic browser
and v5 storage handoff are integrated. The Structures session retains its
generation/profile/cache, UI/stories and LTAX-009 evidence. This slice does not
change its pinned serializers or claim their upstream acceptance.

### Implementation record

The existing projection, source-reference, generation and storage owners now
consume the approved contract; no parallel naming or closure-status authority
was introduced.

| Module | Implemented behavior | Focused check |
| --- | --- | --- |
| `tokens/aliases.ts`, `aliasTargets.ts`, `aliasBrowser.ts` | Capture previous saved names once, direct canonical targets, own-name reuse, deletion, target/context cleanup, global collisions, live values and exact emitted-row references | `tests/token-aliases.ts`, `tests/taxonomy-alias-integration.ts`, `tests/aliases-persistence.ts` |
| `taxonomy/orderedVocabulary.ts` | Fixed checked-in UUIDs, requested vocabulary and default order, scoped source-name groups, deterministic upgrade and explicit unsupported-data diagnostics | `tests/taxonomy-ordered-vocabulary.ts` |
| `taxonomy/valueDomains.ts` | Finite open Scale index, positive safe-integer Number, numeric reuse only between those two groups | `tests/taxonomy-value-domains.ts` |
| `taxonomy/foundationNames.ts`, `edit-session/taxonomyUpgrade.ts` | Explicit shipped-name crosswalk, independent v6 working/saved upgrades, preserved custom data/order and no migration aliases | `tests/taxonomy-foundation-names.ts`, `tests/persistence.ts` |
| Existing CSS/cascade/export/artifact owners | Registry-ordered names, typed numeric fields, direct canonical references and explicit local dimension v3 profile | `tests/taxonomy-outputs.ts`, `tests/dimension-artifacts.ts` |
| `TokenBrowserView.css` | Keep the existing wide S2 table inside the available page width so narrow layouts can scroll to the Actions column | `tests/e2e/taxonomy-aliases.spec.ts` |

`pnpm test:taxonomy-order` and `pnpm test:token-aliases` cover the new contracts.
The affected taxonomy/defaults/storage/report/accounting checks, lint and build
pass. Completed browser verification and canonical evidence are recorded below;
none is executed upstream conformance or manual architecture acceptance.

Historical compatibility is measured separately from deliberate naming changes.
The three full-output hashes from `c84de71` were reproduced before deriving an
explicit naming-only comparison. All 3,486 historical token rows preserve
output/source IDs, values, units, contexts, formulas and mode wiring.
`tests/fixtures/taxonomy-materialization-baseline.json` retains both the historical
and invariant hashes; focused reference tests separately cover the taxonomy
metadata excluded from that comparison. The native portable-contract fixture
now uses explicit custom spacing classification and a value-only edit sidecar,
not an obsolete free-name override.

The audit found these integration requirements in addition to the crosswalk:

| Existing owner | Required change or preservation |
| --- | --- |
| `foundationGovernance.ts` and native source-name models | Replace the unconditional foundation-label Property and compound source-name emission with explicit UUID classifications. Keep custom scale names distinct. |
| `lineHeightNames.ts` | Preserve line-height card/metric identities and shared renames while allowing one Element with two distinct Properties. Do not parse display names to classify them. |
| `model.ts`, `contributions.ts` and Registry | Apply category-aware numeric lookup and the narrow exception consistently; diagnose legacy ordered assignments without truncating them. |
| `dimensionArtifacts.ts` | Its current local profile requires `foundationScale` and integer `scaleIndex`. Revise the app-owned profile deliberately instead of changing display labels while claiming valid new output. |
| `tshirtProfile.ts` and `semanticBrowserState.ts` | Separate app canonical order from pinned Spectrum profile acceptance. Preserve real emitted primitive references and semantic concept/context identities. |
| `primitiveIdentity.ts` | Mathematical index identifies dimension primitives; displayed Scale index is not a stable alias target when smaller counts change. |
| `browserSavedState.ts` | Use saved canonical outputs and their owning mode scopes, not the live Cartesian preview samples, for alias events and accounting. |
| `cssLibrary.ts` | Dynamic utility classes and internal `--bg`/contrast variables are not taxonomy identities. Preserve their CSS relationships while exposing canonical token names. |
| `cascadeExport.ts` and `export.ts` | Share the ordered projection, preserve typed numeric fields and export aliases against exact emitted targets. |
| `edit-session` storage | The v6 taxonomy migration wraps settled v1-v5 upgrades and the coherent working/saved transaction. Add no historical migration aliases. |

## Confirmed contract

Tokens-page presentation is distinct from this canonical contract. The List
view compacts single-child classification chains, places each token's data on
its terminal classification row, and permits mixed/cascading parent selection.
List labels and Grid headings omit category prefixes; full names, ordered
exported paths, taxonomy UUIDs and saved accounting remain unchanged. Diagnostic
and compatibility-alias sections stay explicit, and foundation panels are
excluded. A single controlled checkbox column and typed React Aria toggle
adapter preserve deliberate keyboard selection without counting groups as
tokens in the page summary or action bar. See `docs/archive/tokens-browser-plan.md` for
the bounded contract, completed local UI evidence and remaining broader
verification limitations. This clarification links `LTAX-002` without
changing its reference pin, alignment disposition, manual criteria or RFC state.

- Codify group order, not vocabulary-row ranks or sibling-token sorting.
  Ship the requested order as an author-editable default using Registry's
  existing controls. Use one order for each system, not per-token overrides.
- One term per group, including Interactive context and Interaction.
  Preserve unsupported imported multi-term assignments with diagnostics;
  do not silently select one term.
- Resolve UUID references into one typed ordered-segment representation used
  for names and table hierarchy. Grouping does not assert literal conceptual
  parentage or affect cascade precedence. Never parse names to infer taxonomy.
- Keep category/term UUIDs, term ownership and internal field mappings immutable
  during normal editing. Semantic migrations require explicit old/new references.
- Keep global trimmed, case-insensitive whole-value text uniqueness:
  Focus conflicts with focus, but not focus-ring. Resolve ownership conflicts
  individually, not by permitting duplicate words in different groups.
- Scale index is an open numeric coordinate, including negative, fractional,
  intermediate and larger values. Number is a separate positive-whole-number
  domain starting at one for fixed options or numbered parts, not a global
  one-through-10 enum.
- Permit numeric reuse only between Scale index and Number, with separate
  category-owned UUIDs. Keep same-category duplicate checks and text/numeric-string
  diagnostics outside that exception.
- New groups are broadly available across supported token scopes and optional.
  Include Property in names and hierarchy, requiring it only for output families
  that need it. Generic Spacing and complete Elevation shadows need not invent one.
- Use shared whole-name kebab-case across all app outputs. Compound words remain
  one term. A future Platform naming setting controls the whole name; document
  that boundary without building the Platform editor.
- Apply the new canonical names to Tokens, previews, artifacts and code exports.
  Preserve generated values, units, token/source identities, modes and references.
- Preserve durable working/saved data, Save/Cancel, reload recovery, Reset all
  and custom data. Supersede older memory-only and global numeric-ownership
  proposals explicitly.

## Default group order

1. Token category
2. Color name
3. Contrast label
4. Surface name
5. Foundation scale
6. Typography metric
7. Structure
8. Role
9. Affordance
10. Element
11. Visibility
12. Attribute
13. Property constraint
14. Property
15. Orientation
16. Position
17. Size
18. Density
19. Shape
20. Interactive context
21. Interaction
22. Scale index
23. Number

Preserve the existing source-name groups before Structure, but do not force
every migrated token to assign one. Token category starts with Spacing.
Fresh/reset data uses this sequence; upgrades preserve authored custom order
and insert newly required groups deterministically.

Reuse existing UUIDs where category meanings match. Renaming Constraint to
Property constraint and Axis to Orientation keeps their `constraint` and `axis`
internal keys. Audit the newly added Structure/Size categories rather than
creating duplicates. Check in new UUIDs once, not on reload.

## Seed vocabulary

Vocabulary is extensible. Rows do not imply term rank, blank terms or required
assignments. Do not prune omitted existing vocabulary or equate physical
positions automatically with Start/End.

| Group | Terms or semantics |
| --- | --- |
| Token category | Spacing |
| Structure | Base, List, List-item, Container, Accessory, Accessory-item, Banner, Group, Field, Form, App |
| Role | Positive, Negative, Informative, Warning, Neutral, Accent |
| Affordance | Drop-target, Focus-ring, Selection-indicator, Drag-handle |
| Element | Text, Visual, Workflow-icon, UI-icon, Bar, Control, Pasteboard, Page, Section, Artboard, Surface, Body, Heading, Component |
| Visibility | Subtle, Subdued, Emphasized |
| Attribute | Border, Background, Dash, Shadow, Corner, Overlay, Gradient |
| Property constraint | Minimum, Maximum |
| Property | Padding, Gap, Width, Height, Indent, Size, Opacity, Length, Blur, Offset, Angle, Step, Radius, Aspect-ratio, Thickness, Stop, Color, Line height, Unitless line height |
| Orientation | Horizontal, Vertical |
| Position | Start, End, Affixed |
| Size | 3x-small, 2x-small, Extra-small, Small, Medium, Large, Extra-large, 2x-large, 3x-large |
| Density | Regular, Compact, Spacious |
| Shape | Uniform |
| Interactive context | Selected, Disabled, Loading |
| Interaction | Default, Hover, Focus, Down, Drag |
| Scale index | Open numeric coordinates, not enumerated sample values |
| Number | Positive whole numbers for fixed options or numbered parts |

Dash belongs only to Attribute. Role means semantic intent, not necessarily
Spectrum's older generic `role`. Structure vocabulary is not identical to an
app-native authored Structure entity.

## Explicit migration crosswalk

Examples use default order and Scale index 100. Names are not identity inputs.
These are user-directed mappings, not rules inferred by splitting hyphens.

| Current output/source | New classification | Name example |
| --- | --- | --- |
| font-size | Element: Text; Property: Size | text-size-100 |
| body-lineHeight | Element: Body; Property: Line height | body-line-height-100 |
| heading-lineHeight | Element: Heading; Property: Line height | heading-line-height-100 |
| component-lineHeight | Element: Component; Property: Line height | component-line-height-100 |
| body-unitlessLineHeight | Element: Body; Property: Unitless line height | body-unitless-line-height-100 |
| heading-unitlessLineHeight | Element: Heading; Property: Unitless line height | heading-unitless-line-height-100 |
| component-unitlessLineHeight | Element: Component; Property: Unitless line height | component-unitless-line-height-100 |
| workflow-icon-size | Element: Workflow-icon; Property: Size | workflow-icon-size-100 |
| Global Spacing | Token category: Spacing; no Global assignment | spacing-100 |
| Global Size | Property: Size; no Global assignment | size-100 |
| Global Radius | Property: Radius; no Global assignment | radius-100 |
| Base horizontal spacing | Token category: Spacing; Structure: Base; Orientation: Horizontal | spacing-base-horizontal-100 |
| Base gap | Token category: Spacing; Structure: Base; Property: Gap | spacing-base-gap-100 |
| Elevation named Shadow | Element: Surface; Attribute: Shadow | surface-shadow-100 |
| Preview surface named overlay | Rename its existing term to Floating surface; Attribute owns Overlay | floating-surface-color for a published color token |
| Compound color names | Keep names such as Illustrator Orange atomic in Color name; Property: Color | illustrator-orange-color, with Scale index only for actual scale tokens |

Normal and unitless line heights retain distinct outputs and unchanged units.
Line height remains one Property term. Workflow-icon remains one Element.
Keep all six existing compound palette names atomic: Illustrator Orange,
Photoshop Blue, XD Fuchsia, Dimension Green, After Effects Indigo and InDesign
Magenta.

Do not emit old compound metric terms alongside their replacement classifications
or Global in the three default foundation scales. Preserve vocabulary needed by
other/custom references and audit removal before retiring it.

Fresh/reset defaults do not seed the eight retired Typography metric terms or
the old `typography` Property placeholder. Their native metric IDs remain
serialization keys, not vocabulary. Keep the approved Typography metric category
and its order, empty by default, for compatible custom authoring. Elevation's
source reference uses the existing Surface Element UUID; its classification adds
the Shadow Attribute. Do not invent an "Elevation scale" seed to retain the old
source reference. The native Structure elevation slot still needs its separate
`elevation` Property term.

Shadow and Spacing require reviewed category-reference remapping, not changing
an old term's owner in place. Global text uniqueness prevents simultaneously
keeping old/new owners of the same spelling. Migrate the graph atomically with
explicit provenance and new target terms where necessary.
The overlay-to-Floating surface change keeps the existing term UUID and owner.

## One-time alias tokens

This is a specifically approved addition, not a general alias-authoring engine.

- On future user Save, compare previous saved canonical names with the names
  being saved by stable canonical identity. Create persisted alias tokens for
  changed old names, each directly referencing its canonical token.
- Do not create aliases for initial data migration, fresh/reset defaults,
  unsaved intermediate edits, temporary previews, removed tokens or newly
  created tokens without a previous saved name.
- Keep each alias's own stable identity and captured old full name. Do not
  register old strings as taxonomy terms, reformat them with current order,
  infer classifications from them or create alias chains.
- Save alias changes and authoring data atomically. Diagnose conflicting names;
  never suffix, overwrite or silently omit them.
- When a canonical token resumes one of its own alias names, remove the redundant
  alias and create an alias for the name being replaced. Another token's name or
  alias still blocks the Save.
- Show aliases in Tokens list/grid with their target and resolved value.
  Allow deletion only in Edit mode; no independent value editing. Cover
  Save/Cancel/reload/revert, filters, selection, bulk-action restrictions and details.
- Deleted aliases stay deleted; no default mapping or generation effect restores
  them. Remove aliases atomically when their canonical source/step is removed,
  while preserving real Structure/reference deletion guards.
- Export aliases as references, not duplicated literals. Audit stable target and
  mode namespaces rather than guessing from names or selecting arbitrary rows.
- Report published compatibility records separately from canonical foundation
  concepts and scoped mode-value denominators. Do not add duplicate preview/chart
  samples or classify alias records as manual foundation-value overrides.

## Evidence and initial gaps

Initial pins, to be refreshed with relevant working-file hashes before editing:

| Authority | Baseline | Limits |
| --- | --- | --- |
| App | `c84de71cec30d63bac6ee2034a7989cf47e751fc`, plus dirty files | Concurrent Structures, T-shirt sizing, semantic output and storage work must be preserved and integrated. |
| Spectrum checkout | `838a6835b746f9d77b2697374408901f334d854e` | Data 3.2.5, spec package 4.3.0, format `1.0.0-draft`; separate authorities. |
| Spectrum draft | [adobe/spectrum-design-data#1454](https://github.com/adobe/spectrum-design-data/pull/1454), `fa714564eaa33bc37f905fad64162d60d6a48087` | Inspected open/draft/unmerged; not current checkout or accepted direction. |
| SDK | Source at those pins | Source behavior is not executed SDK conformance. |

The app's `taxonomy/model.ts`, `formatting.ts` and `tree.ts` already provide the
ordered projection. Audit all live consumers: older adapters and special native
export paths do not prove the whole app uses identical naming.

Spectrum already supplies field `serialization.position` and formatting.
Current/draft orders differ from the desired order, and classified fields such
as Structure can be excluded from general naming. Its draft interaction arrays
differ from the approved app single-term policy.

Scale index currently has an integer field catalog, string-only undeclared
token-name schema fields and SDK branches using `as_i64`. Preserve the open
numeric target and document a consistent correction locally. Do not silently
coerce strings, discard fractions or claim current upstream conformance.
Specify finite representation, precision, negative-zero and exponent spelling
limits against the app's existing number model and formatter.

Relevant prior evidence:
`sdk/core/src/naming.rs:235-487,555-664`,
`sdk/core/src/registry_data.rs:3353-3385`,
`packages/design-data-spec/schemas/token.schema.json:15-18,121-135`,
`packages/design-data-spec/schemas/field.schema.json:47-55,81-85`.
Draft positions are separately at `sdk/core/src/registry_data.rs:3220-3254`.

## Execution phases

1. **Complete the bounded audit.** Pin settled app/reference evidence; inventory
   categories/terms, source and metric models, numeric contracts, references,
   generators/exporters, Tokens, persistence and saved-impact owners. Publish
   the UUID crosswalk, consumer matrix, ambiguities and migration inventory.
2. **Define the native contract.** Reuse existing taxonomy/projection owners.
   Extend only what governed source/output classification, numeric domains,
   conditional Property and persisted direct-reference alias records require.
   Make schema/direct validation agree and category-aware lookup precede numeric reuse.
3. **Migrate defaults and authoring graphs.** Add checked-in UUIDs, reviewed order
   and classifications. Upgrade working/saved independently and atomically.
   Preserve custom data, values, formulas, references and identities; add empty
   alias collections to recognized older data without historical alias creation.
4. **Wire all live outputs and aliases.** Share canonical projection/whole-name
   formatter across preview, Tokens, artifacts and code. Implement future-Save
   aliases, own-name reuse, deletion/target cleanup and validated reference
   exports. Reuse S2 components and the Alias column; no table redesign or new
   sibling sorting.
5. **Validate lifecycle, names and accounting.** Test exact crosswalk names,
   stable values/identities, alias transactions, Save/Cancel/reload/revert,
   custom upgrades, saved/shipped differences, staleness and scoped denominators.
6. **Document local RFC-ready evidence.** Supersede old conflicting decisions,
   record actual checks in the canonical gap register and prepare a local RFC
   packet covering meanings/order, formatting, numeric correction, cardinality
   differences, identity/reference migration and conformance fixtures.

Each phase depends on the preceding contract/data work; final documentation
claims depend on actual verification. No arbitrary-step insertion controls,
foundation classification dialogs, per-scale step mapping, general semantic
engine, Platform editor or Git publishing is included.

## Verification and acceptance

Add focused tests for all new models/helpers and exact named outputs:

- Default versus custom group order; object-key independence; optional omissions;
  single-term enforcement; unknown/duplicate/missing order entries and references.
- Explicit mappings, Property inclusion/requirements, atomic multiword terms,
  ownership resolution and unchanged UUIDs/internal keys.
- Open numeric coordinates, positive whole Numbers, finite/precision/spelling
  boundaries, approved numeric reuse and strict text/numeric-string checks.
- Shared name/hierarchy segments, leaves, search and selection, final-name
  collision diagnostics without dropped records.
- Working/saved migrations, custom-data preservation, failure recovery,
  Save/Cancel/reload/Reset all/revert and unchanged generated values.
- Future-Save-only aliases, no initial aliases, atomic collisions, direct targets
  across modes, no chains, own-name reuse, deletion persistence and source cleanup.
- Alias list/grid/details/export parity, read-only safeguards, no independent
  value editing and separate accounting without inflated denominators.

Use the smallest affected existing defaults/taxonomy/identity/sources/naming/
tokens/structures/references/persistence/changelog/impact/materialization/
coverage/gap tests together, then lint/build. Browser paths run after the major
feature is complete, covering Registry and Tokens at desktop/narrow widths with
empty `pageerror` lists. Shared color changes additionally require all affected
surfaces and the Foundations/Colors/Scale Editor/Evaluation smoke path.
New unique components require separate Storybook approval.

Track LTAX-001, LTAX-002, LTAX-003, LTAX-004 and LTAX-008 where applicable.
Record direction, owner, profile/revision, criteria, checks, blockers and remaining
limits. Add a separately scoped gap only when needed. Keep implementation,
alignment disposition and RFC acceptance separate; missing/stale evidence stays
unassessable. Local tests do not substitute for explicit manual/upstream review.

Context: [target contract](../design-data-target-contract.md),
[PR review](../design-data-pr-1454-review.md),
[storage contract](../design-data-authoring-storage-contract.md) and
[earlier local RFC](../rfcs/taxonomy-ownership-and-projections.md).
The future proposal remains documentation in this project only.

### Completed local verification

Verified on 2026-10-11 in the shared `reusable-scales` checkout.
The affected checks were run in bounded groups, not as repeated full-suite runs.

| Check group | Result |
| --- | --- |
| Defaults, taxonomy/order/identity/sources, canonical names, tokens and aliases | Passed, including explicit custom classification, nonempty edit-sidecar schema validation, cross-owner alias collision atomicity and direct emitted references |
| Persistence, changelog, impact, native Analysis, materialization, coverage and assessment | Passed; compatibility records remain outside canonical concept/mode-value denominators |
| Portable contract, Radius, dimension artifacts, Spacing, Color, contrast multiplier, color Analysis and typography tokens | Passed; stale naming-only fixtures were corrected without changing value/identity assertions |
| Canonical gap tests, generated Markdown and register check | Passed; manual criteria, reference assessment and RFC acceptance remain separate |
| Typecheck, ESLint and production build | Passed; existing static/dynamic icon-import build warnings remain |
| `tests/e2e/taxonomy-editing.spec.ts` | Five focused Registry paths passed: desktop/390 px draft and cell editing, shared renames/deletion protection, category identity/internal keys and numeric draft validation |
| `tests/e2e/taxonomy-aliases.spec.ts` | Five paths passed: desktop/390 px alias lifecycle, independent collision rejection, category-order naming/hierarchy and Colors editor/Analyze/CSS smoke |

Browser checks use **https://localhost:5173/** and assert empty `pageerror`
lists. The desktop and 390 px screenshots were inspected. The existing S2 table
now scrolls within the available page width, including its Actions column;
the existing narrow app-header composition was not redesigned.
Collision coverage is a separate bounded browser test, retaining the original
assertions and lifecycle timeout rather than extending it.

The obsolete one-time default-conversion script was removed; fixed checked-in
UUIDs and genuine identity tests remain. All work is uncommitted. No branch,
upstream repository or roadmap was changed.

### Shipped catalog correction

Verified on 2026-10-12. The earlier implementation changed canonical projections
but mistakenly left all eight obsolete compound Typography metric terms in
the checked-in catalog. An audit found no remaining shipped references to those
records. Removed them and the unused `typography` Property placeholder.
Replaced the invented Elevation scale source reference with the already registered
Surface Element and removed that placeholder term. Existing Element/Property/
Attribute UUIDs and ownership are unchanged; no default IDs were regenerated.

Retained the explicitly approved source-name category order, editor-only Global
and spacing labels, native Structure vocabulary, and the native metric keys.
Typography metric is empty in fresh/reset defaults rather than removed from the
approved global order. This correction is within EPIC-3.1/3.2/3.3 and the previously
approved architecture slice, not a new vocabulary policy.

Older-record Elevation recovery now adds every name/classification dependency
needed by the revised default source. Historical tests explicitly supply the
retired metric records instead of relying on today's shipped defaults. Current
v6 saved/working records remain authoritative and are not purged or replaced
on reload. A fresh session or confirmed Reset all adopts the corrected catalog;
Reset all replaces saved edits, so it is never performed automatically.

Raw-default assertions cover all eight exact Element/Property mappings and owned
UUIDs, absence of obsolete seed terms, and the Elevation and Floating surface
crosswalks. Affected defaults/order/identity/sources/naming, Typography, Elevation,
shadow artifacts, persistence, aliases, Structures, changelog, impact and coverage
checks pass. All three historical materialization invariants and 3,486 token rows
remain unchanged. Typecheck, ESLint and production build pass.

Three focused browser paths on localhost:5173 verify fresh Registry defaults at
1440 and 390 px, canonical token exports, Typography and Elevation Elements,
reload, preserved saved vocabulary and confirmed Reset all. Each asserts an empty
`pageerror` list; desktop/narrow screenshots were inspected. Canonical LTAX-002
evidence records the correction without changing manual acceptance, upstream
alignment, RFC state or concept/mode-value denominator policy.
