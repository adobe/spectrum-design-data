---
name: structures
description: How Structures work in spectrum-studio. Use when touching Structures (layout scaffolds), structure slots (width, padding, gap, radius, elevation, alignment, direction), template elements (Text, icons, Visual, Bar), reusable Structure references, T-shirt rule applications on a Structure, generated semantic layout tokens, or the Structure editor, preview and permutations views. Covers the model, children, generation, persistence and known debt.
---

# Structures

Code: `src/features/structures/`. UI: `src/panels/structures/`, `src/views/structures/`, composed in
`src/pages/Design.tsx`. Detailed behavior (element bindings table, insertion UX, reusable references,
naming, verification history) is in `docs/structure-element-templates.md`; read it before changing
elements, references or naming. Roadmap: INIT-4 (EPIC-4.1 to 4.4, planned) and EPIC-5.1 (T-shirt rules).
The shipped slice is narrower than the epics; do not build beyond the request (`AGENTS.md` roadmap alignment).

## Stored source and runtime model

- Defaults, canonical export and authoring envelope **21** store `PortableStructuresDocument`
  (`schemaVersion` **1**, `portableModel.ts`). Its sections are `structures` (definitions, bindings,
  options and typed configuration), `publications` (durable generated identities) and `examples`
  (glyph resources). Session selections and canvas state are separate from authored data.
- A **Structure** has a UUID-v4 `conceptId`, distinct from its Registry name identity. Top-level
  `name` references Registry category/term UUIDs; owned Layout labels remain local. Historic Text
  retains its existing Element-term binding without relaxing Registry uniqueness.
- Registered variants reference their category and value terms. Supplemental `classification`
  preserves generation metadata independently of display names. Local variants and Booleans retain
  local labels; local Booleans do not contribute token names.
- `portableConversion.ts` is the single read adapter into runtime `StructuresDocument`
  (`schemaVersion` **7**, `model.ts`). The runtime has resolved labels, `properties` and `editor`
  configuration for existing domain operations. It is not a second persisted representation or
  a separate generator. Do not serialize runtime records directly.
- Configuration targets an owning Structure plus a path of occurrence UUIDs. Parent effects may
  address owned Layouts, never internals of independent Base/Text references. Leaf overrides retain
  complete snapshots with explicit field removals and matching glyph resources; incomplete leaf
  imports report errors rather than silently acquiring inherited values.
- **Slots** (`STRUCTURE_SLOTS`) are the fixed property set: width, height, min and max of each,
  horizontal and vertical alignment, direction, gap, four paddings, four corner radii, elevation. Each
  slot has a Registry classification (for example property=padding plus position=top) and, for length
  slots, a token `family` (size, spacing, radius, elevation).
- A slot binding is either `{ $ref }` (a primitive token reference) or `{ value }` (a literal: Hug or
  Fill for sizing, a Registry term for alignment and direction). Width, height, horizontal, vertical and
  direction are required.
- Terms for property, position, constraint and axis live in `vocabulary.ts` with fixed ids. Names are
  Registry projections; see `taxonomy-vocabulary`. Do not type or parse names.
- Change stored contracts only with a lossless migration at the appropriate owner:
  `structureSourceCodec.ts` for portable storage and `upgradeStructuresDocument` for older runtime
  formats. Follow the persistence checklist below.

## Children (`elements.ts`, `children.ts`)

`elements` is an ordered list of two kinds of child:

- **Leaf elements**: Text, Workflow-icon, UI-icon, Visual, Bar (`ELEMENT_TYPES`). They bind to existing
  foundations (typography, size) for **preview only**. They are not token producers: they add no token
  concepts, aliases or saved mode values, and never enter semantic grouping.
- **Structure references** (`kind: "structureReference"`): point to another Structure by id. A
  reference is one inert module; the source owns its bindings, rules and settings. Self-references,
  cycles and missing targets are rejected (`assertStructureGraph`). A source cannot be deleted or
  reverted while referenced.

## Generation (`generation.ts`)

- `StructureGeneration`: nonempty distinct Registry `sizeTermIds`, `nameRef` (a governed Registry
  name, Element or Structure term), and `applications` of Generator rules. Selected terms must
  exist in every applied Generator; do not constrain this list to the old five sizes.
- A `StructureRuleApplication` targets `all` or `custom` binding ids, using the rule engine in
  `formula-engine`. `previewTargets` select element previews separately from layout-token `targets`.
- Only token-backed slots (`$ref`, with a family) are eligible. Applicability intersects authored
  All/Custom targets for layout and element previews. Excluded bindings retain their anchor;
  inactive applications retain saved targets. Only active targets may not overlap.
  Use the shared applicability predicate and actual typography metric metadata.
- `structureTokenGroups` merges four equivalent padding or radius sides into one token, and equivalent
  left and right or top and bottom padding into a horizontal or vertical group.
- Generated rows come from `design-data/tshirtArtifacts.ts` (`buildTshirtArtifacts`) and reach the
  Tokens browser as semantic tokens (`tokens/semanticBrowserState.ts`). Semantic tokens cannot take
  per-mode edits yet (see `tokens`, DEBT-016).
- Generation naming is an explicit Registry reference, separate from the authored name. Migration
  preserves existing references (List-item still generates with the `list` term). The existing
  top-level rename operation registers/reuses the new name and updates generation naming where
  applicable; owned Layout label edits do not add naming segments. Reads, previews and exports
  never register terms or allocate identities.

## Resolution and preview (`resolution.ts`, `composition.ts`, `elementResolution.ts`)

`resolveStructure` turns a Structure into CSS, and `resolveComposition` resolves references down the
graph at a size, using the source's attached Generator order to find the nearest supported size
when one is unavailable (Medium on ties), with a visible warning. Unrelated library rules do not
set the fallback order. Hug and Fill need a measured layout, so they report "must be measured" until measured.
Resolution returns `issues` per slot; it does not throw for an unresolved token. Add markers, selection
outlines and the empty-Structure authoring floor never count toward layout measurement.

## Persistence, Changes and Impact

Runtime Structures live in `structuresDocumentAtom` (`documentState.ts`) and the authoring snapshot, with
`structureChanges` (`changes.ts`) feeding Changes. Revert, Save, Cancel, reload and Reset all cover the
whole collection, including elements and order. Removing a source, step or metric is blocked while a
Structure references it (`assertStructureReferences`). Follow `authoring-lifecycle` and
`changelog-parity.mdc`; child edits must contribute zero token-concept growth. Local capability gaps
are LTAX-012 (elements) and LTAX-013 (references and naming); upstream alignment is not assessed (see
`design-data-contract`).

`registeredNames.ts` reconciles name bindings during authoring/migration and resolves current Registry
labels. `configurationState.ts` owns shared root/nested option-binding edits; view callbacks must not
assemble persisted configuration records. Preserve the existing domain operations for other edits.

`structureSourceCodec.ts` and `storage.ts` encode/decode saved and working sources independently within
one atomic authoring-record write, using shared migration name allocations. Keep the existing storage
key, saved baseline and attachments; migration is not reseeding. Failed conversion/writes must preserve
the previous record. Publication identities remain durable even when their output is inactive.

The portable contract is implemented locally, not accepted upstream. See
`docs/rfcs/portable-structures.md`. Separating publication records improves definition readability;
it does not imply a reduction in total storage.

## UI

Edit mode has Add insertion points; readonly allows inspection. Before adding a new unique component,
ask about a Storybook story (`AGENTS.md`). Stories exist for the editor, elements, references, rule
dialog and permutations. Use `component-catalog` for shared controls.

## Known debt and what not to copy

Open items are in `docs/known-debt.md`. Follow Working rule 5 in `AGENTS.md`. Do not copy:

- Ids derived from parts (`structureBindingId`, `elementBindingId` use `tokenUuid`): follow the
  design-data UUID guidelines for new identities (`tokens`, DEBT-017).
- Throws on load or restore for Structure problems (DEBT-025). Return issues instead.

## Checks

`test:structure-portable-contract` covers portable conversion, 1,024 parent configurations, output
preservation, storage migration, lifecycle and shared configuration edits. The focused
`list-item-structure-defaults.spec.ts` browser checks cover parent controls, nested edits, local
Booleans and Registry-backed naming through Save/reload.

`test:structures`, `test:structure-references`, `test:structure-elements`,
`test:structure-padding-icons`, `test:base-structure-defaults`, `test:tshirt-sizing`,
`test:tshirt-integration`; `test:changelog`, `test:impact` and `pnpm check:changelog-coverage` when
persisted data changes. Browser: `structures.spec.ts`, `structure-elements.spec.ts`,
`structure-references.spec.ts`, `tshirt-generation.spec.ts`, with `pageerror` asserted empty
(`verify-change`). Known failing baseline checks near this area are in DEBT-010 to DEBT-012.
