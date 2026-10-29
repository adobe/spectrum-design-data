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
  (Power or Linear, the locked formulas in `formulas.ts`), `base` blur, `scale` and `opacity` (0 to 100 %).
  Linear layers must not produce negative blur at the smallest level.
- Opacity belongs to each layer; the shared color must be opaque (`isOpaqueShadowColor`).
- `elevationIssues` returns readable problems and `isElevationDocument` accepts only a document with
  none. Use them rather than writing new checks.

## Generation (`generate.ts`)

`generateElevation(document, formulas, colorOutput?)` is the only path. For each level and layer it
takes the blur from the layer's formula, sets the vertical offset to blur times depth, fixes X offset
and spread at 0, and applies the layer opacity to the shadow color (serialized with the user's color
output format). `shadowCss` joins the layers into one value, or `none` with no layers. Preview, tokens,
CSS and Changes all use these two functions. The levels come out as `ElevationLevel` with a step name
from `scales/stepNames`.

## Modes (`resolution.ts`)

`resolveElevationDocument(document, modes, sets, preview)` applies mode values, then preview overrides.
It ignores a set's default mode and only the set that owns each capability applies.

- **Dials**: `elevation.depth` and `elevation.color` are real parameters in `FOUNDATION_PARAMETERS`
  (edited through `updateElevationModeParameterAtom`). Neither is bindable to a formula part yet.
- **Per-layer opacities** (`elevation.layerOpacities`, capability only) are a sparse per-mode patch
  keyed by layer id. This is not a dial. See debt DEBT-028: it stands in for an opacity system that does
  not exist yet.

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

- Per-mode opacity patches (DEBT-028). Opacity should come from a future opacity system with its own
  dials, which shadows reference. Do not add more per-mode structural patches.
- Level ids built from document id and index (`elevation-{documentId}-{index}`): new identities follow
  the design-data UUID guidelines (`tokens`, DEBT-017).
- Throwing from generation or restore for stored data (DEBT-029). Return issues.
- Combination caps that throw (DEBT-002; `buildElevationCss` caps at 256).

## Checks

`test:elevation` and `tests/shadow-artifacts.ts` (run the file directly; there is no package script);
`test:mode-combinations` and `test:modes` for mode behavior; `test:changelog`, `test:impact` and
`pnpm check:changelog-coverage` when persisted data changes. Browser: `elevation.spec.ts`, with
`pageerror` asserted empty (`verify-change`). `test:elevation` is listed as failing in the sandbox
(DEBT-012, unconfirmed).
