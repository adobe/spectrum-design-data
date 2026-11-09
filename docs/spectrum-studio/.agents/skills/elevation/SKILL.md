---
name: elevation
description: How the Elevation foundation works in spectrum-studio. Use when touching shadows or elevation levels, shadow layers, Depth or shadow color, per-mode shadow opacities, elevation tokens or CSS, the Elevation panel or its Elements, Comparison, Analyze and CSS views, or Structures that reference elevation tokens. Covers the document model, generation, mode capabilities, tokens, persistence, and known debt including the missing opacity system.
---

# Elevation

Code: `src/features/elevation/`. UI: `src/panels/foundations/FoundationsElevationPanel.tsx`,
`src/panels/elevation/ElevationEditor.tsx`, `src/views/elevation/` (Elements, Comparison, Analyze, CSS
export). Roadmap: EPIC-1.6 (planned in the roadmap table although the foundation ships), EPIC-1.9
(shared engine; elevation is still adopting it), EPIC-2.3 (parameters). The blur formulas use
`formula-engine`; dials and ownership are in `modes`.

## Document (`elevation/model.ts`, schema 1)

- One scale per document: a UUID `id`, a Registry `name` (`TaxonomyNameReference`), `below` and `above`
  level counts, `depth` (0 to 200 %), an opaque `color`, optional `hideFromPublishing`.
- Up to 8 `layers` (`ELEVATION_LAYER_MAX`), each a random UUID `id`, a unique `label`, a `scaleTypeId`
  (Power or Linear, the locked formulas in `formulas.ts`), `base` blur, `scale` and
  exactly one opacity input: `opacityTokenId`, `manualOpacity` (0 to 1), or
  historical `opacity` (0 to 100 %, compatibility only).
  Linear layers must not produce negative blur at the smallest level.
- Each layer owns its opacity reference or manual fraction; the shared color
  must be opaque (`isOpaqueShadowColor`).
- `elevationIssues` returns readable problems and `isElevationDocument` accepts only a document with
  none. Use them rather than writing new checks.

## Generation (`generate.ts`)

`resolveElevationDocument` resolves opacity token references through `resolveOpacity`
before `generateElevation(document, formulas, colorOutput?)`. For each level and layer generation
takes the blur from the layer's formula, sets the vertical offset to blur times depth, fixes X offset
and spread at 0, and applies the layer opacity to the shadow color (serialized with the user's color
output format). `shadowCss` joins the layers into one value, or `none` with no layers. Preview, tokens,
CSS and Changes all use these two functions. The levels come out as `ElevationLevel` with a step name
from `scales/stepNames`.

## Modes (`resolution.ts`)

`resolveElevationDocument(document, modes, sets, preview, opacitySource)` applies mode values, then preview overrides.
It ignores a set's default mode and only the set that owns each capability applies.

- **Dials**: `elevation.depth` and `elevation.color` are real parameters in `FOUNDATION_PARAMETERS`
  (edited through `updateElevationModeParameterAtom`). Neither is bindable to a formula part yet.
- **Opacity:** `opacityTokenId` follows the Opacity foundation's final value in
  the selected modes and preview. `manualOpacity` remains fixed. Historical
  per-layer mode patches are upgraded by `edit-session/opacityUpgrade.ts`;
  do not add new patches.

## Opacity entry

Use `panels/elevation/ShadowOpacityControls.tsx` and the shared `TokenComboBox`
contract in `component-catalog`. One field supports token-name/value search,
list selection and direct percentage entry. Keep `customValue` available when
a reference is selected. `3` and `3%` mean three percent, stored as `0.03`;
0% and 100% are valid. Token references use badges; custom percentages use
normal Spectrum input text.

Do not add a “Manual percentage” option, a second NumberField, or local
token-deletion handling. The shared component owns acceptance and clearing.
Opacity is required: deleting a token opens an empty replacement draft without
writing an invalid layer. Write through `updateShadowLayerAtom`, which preserves
the exclusive reference/manual input and existing validation.

## Tokens and CSS (`output.ts`)

`browserElevationSources` makes one `elevation` token per level whose value is the whole shadow string
(plus the structured `shadows`). Names are Registry projections (`elevationTokenName`, governed by the
foundation; see `taxonomy-vocabulary`). `buildElevationCss` writes one block per combination of the
mode sets that own an elevation capability, built with `modes/combinations.ts`. Unpublished foundations
(`hideFromPublishing`) emit nothing. Structures use elevation tokens as a slot value, and removing a
layer or level is blocked while a Structure references it (`structures`).

## Persistence, Changes and Impact

The document is stored as `foundations/elevation`, and `elevationDocumentAtom` blocks a change that
would break a Structure reference. `elevationChanges` and `elevationTokenChanges` (`changes.ts`) feed
Changes. Removing a layer also removes its per-mode opacity patches and Undo restores them
(`removeShadowLayerAtom`, `restoreShadowLayerAtom`). Follow `authoring-lifecycle` and
`changelog-parity.mdc`; `layerOpacities` reaches Impact by a different route than other parameters
(DEBT-007). Editing validates generation for the document and for every mode before saving; that is
intended edit-time validation.

## Known debt and what not to copy

Open items are in `docs/known-debt.md`. Follow Working rule 5 in `AGENTS.md`. Do not copy:

- Historical per-mode opacity patches. Use current Opacity foundation references
  rather than adding structural patches.
- Level ids built from document id and index (`elevation-{documentId}-{index}`): new identities follow
  the design-data UUID guidelines (`tokens`, DEBT-017).
- Throwing from generation or restore for stored data (DEBT-029). Return issues.
- Combination caps that throw (DEBT-002; `buildElevationCss` caps at 256).

## Checks

`test:elevation` and `tests/shadow-artifacts.ts` (run the file directly; there is no package script);
`test:token-combobox` and `tests/elevation-opacity.ts` cover shared entry and opacity propagation;
`test:mode-combinations` and `test:modes` for mode behavior; `test:changelog`, `test:impact` and
`pnpm check:changelog-coverage` when persisted data changes. Browser: `elevation.spec.ts`, with
`pageerror` asserted empty (`verify-change`). `test:elevation` is listed as failing in the sandbox
(DEBT-012, unconfirmed).
