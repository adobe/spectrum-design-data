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

## Model (`structures/model.ts`)

- A **Structure** has a random UUID `conceptId`, a local `name` label, `properties`, optional
  `generation`, and optional `elements`. The document is `StructuresDocument` (`schemaVersion` 4).
- **Slots** (`STRUCTURE_SLOTS`) are the fixed property set: width, height, min and max of each,
  horizontal and vertical alignment, direction, gap, four paddings, four corner radii, elevation. Each
  slot has a Registry classification (for example property=padding plus position=top) and, for length
  slots, a token `family` (size, spacing, radius, elevation).
- A slot binding is either `{ $ref }` (a primitive token reference) or `{ value }` (a literal: Hug or
  Fill for sizing, a Registry term for alignment and direction). Width, height, horizontal, vertical and
  direction are required.
- Terms for property, position, constraint and axis live in `vocabulary.ts` with fixed ids. Names are
  Registry projections; see `taxonomy-vocabulary`. Do not type or parse names.
- Change the slot set or schema only with a lossless `upgradeStructuresDocument` step and the
  persistence checklist below.

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
- Token naming is explicit: a rule that makes tokens requires a naming choice. Previews and Apply never
  silently create Registry terms. Changing the local label does not rename terms or token ids.

## Resolution and preview (`resolution.ts`, `composition.ts`, `elementResolution.ts`)

`resolveStructure` turns a Structure into CSS, and `resolveComposition` resolves references down the
graph at a size, using the source's attached Generator order to find the nearest supported size
when one is unavailable (Medium on ties), with a visible warning. Unrelated library rules do not
set the fallback order. Hug and Fill need a measured layout, so they report "must be measured" until measured.
Resolution returns `issues` per slot; it does not throw for an unresolved token. Add markers, selection
outlines and the empty-Structure authoring floor never count toward layout measurement.

## Persistence, Changes and Impact

Structures live in `structuresDocumentAtom` (`documentState.ts`) and the authoring snapshot, with
`structureChanges` (`changes.ts`) feeding Changes. Revert, Save, Cancel, reload and Reset all cover the
whole collection, including elements and order. Removing a source, step or metric is blocked while a
Structure references it (`assertStructureReferences`). Follow `authoring-lifecycle` and
`changelog-parity.mdc`; child edits must contribute zero token-concept growth. Local capability gaps
are LTAX-012 (elements) and LTAX-013 (references and naming); upstream alignment is not assessed (see
`design-data-contract`).

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

`test:structures`, `test:structure-references`, `test:structure-elements`,
`test:structure-padding-icons`, `test:base-structure-defaults`, `test:tshirt-sizing`,
`test:tshirt-integration`; `test:changelog`, `test:impact` and `pnpm check:changelog-coverage` when
persisted data changes. Browser: `structures.spec.ts`, `structure-elements.spec.ts`,
`structure-references.spec.ts`, `tshirt-generation.spec.ts`, with `pageerror` asserted empty
(`verify-change`). Known failing baseline checks near this area are in DEBT-010 to DEBT-012.
