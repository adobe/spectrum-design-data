---
name: typography
description: How the Typography foundation works in spectrum-studio. Use when touching typography settings, the type scale, text zoom, line heights, icon sizing, typography tokens or names, the rem CSS export with data-text-zoom blocks, the Typography panel or its Elements, Comparison, Analyze and CSS views, or component size (which lives in typography for now). Covers the document model, text zoom, the single generation path, consumers, and known debt.
---

# Typography

Code: `src/features/typography/`. UI: `src/panels/foundations/FoundationsTypographyPanel.tsx`,
`src/panels/typography/` (`LineHeightCard`, `TypeScaleFields`), `src/views/typography/` (Elements,
Comparison, Analyze, Ramp, CSS export). Roadmap: EPIC-1.2 (in progress), EPIC-2.3 (the text zoom
binding), EPIC-2.5 (component size). The type scale itself is a formula; read `formula-engine` for the
formula, rounding rules and interpolations, and `modes` for dials.

## Document (`typography/model.ts`, schema 8)

- `scaleTypeId` is always the shared Type scale formula (`TYPOGRAPHY_SCALE_TYPE_ID`). `smallSizes` is
  0 to 3 and `largeSizes` is 0 to 14 steps. `minTextSize` and `maxTextSize` clamp generated sizes.
- `textRoundingRuleId` rounds font sizes and `lineHeightRoundingRuleId` rounds line-height lengths;
  both are rounding rules by id (see `formula-engine`). `outputUnit` is px, rem, em or pt
  (`units.ts`; 16 px reference).
- `lineHeights` are cards: a `defaultValue` multiplier and an optional adaptive mapping from font size
  to multiplier (an interpolation from the library). Each card produces a length token and a unitless
  token. `previewLineHeightId` picks the Elements sample.
- `iconography` aligns icon size either to text (a second scale from `baseSize`) or to a line-height
  card's length.
- Metric names (`metricNames`) are Registry references (`TaxonomyNameReference`), not strings; names are
  projections (see `taxonomy-vocabulary`). New metrics register terms through the contributions path.
- `isTypographyDocument` is the shape guard. Schema or field changes need a lossless upgrade and the
  persistence checklist below.

## Text zoom

Text zoom is the typography mode dial `typography.textZoom`, an integer from -4 to 8
(`TEXT_ZOOM_MIN`, `TEXT_ZOOM_MAX`, `clampTextZoom`). It moves the base by a ratio of 1.125 per step
(`TEXT_ZOOM_STEP_RATIO`) and changes the scale ratio through the Type scale formula's
`textSizeAdaptation`: an interpolation from the ratio at the smallest text size, through the formula
ratio at zoom 0, to the ratio at the largest.

`resolveTypographyDocument(base, modes, preview, { modeSets })` (`resolution.ts`) layers mode values
and then preview overrides onto the base document. It ignores a set's default mode and any mode set
that does not own the parameter. Mirror this when adding another typography dial. The same rule is
described in `modes`.

## One generation path

`generateTypography(document, textZoom, rules, scaleTypes, interpolations)`
(`typographyGeneration.ts`) is the only path. Call it; do not recompute sizes. It builds on
`generateScale` (`formula-engine`), clamps, then derives line heights and icon sizes. Each output token
has `position`, `scale` (step name), `fontSize`, `lineHeights` by card id, `iconSize`, `ratio` and
`textZoom`.

`typographyTokenGroups` defines the metrics: font size, a length and a unitless line height per card,
and icon size. `typographyTokenValues` and `typographyTokenName` project names through the Registry
(`typographyTokens.ts`) and report taxonomy collisions. Do not build a token name from a label.

## Consumers

- Tokens: `tokens/browserSources` takes generated tokens plus naming (`tokens`). Per-mode generation
  uses `resolveTypographyDocument` for each mode combination (`modes/combinations.ts`).
- CSS: `buildTypographyCss` (`typographyCss.ts`) emits a base block and one `[data-text-zoom="n"]` block
  for every zoom value. Rem output multiplies on top of the browser's text size.
- Views: Elements, Comparison (by text zoom or by mode, `comparisons.ts`), Analyze, Ramp and the CSS
  export all call the same generator.
- Structures bind Text and icon elements to typography references; removing a source, step or metric is
  blocked while referenced (`structures`).
- Rules and formulas that typography uses cannot be deleted while consumed (`logic/consumers.ts`).

## Component size

`componentSize` lives in this document only temporarily: it shifts the type base by the same 1.125
ratio per size step, and also drives T-shirt rules and Structure sizes. The intended model is a
system-level configuration outside typography, since it affects typography, spacing, size and radius
(EPIC-2.5, DEBT-027). Keep the dependency, flag it when touched, and do not add product-default fields
anywhere else.

## Persistence, Changes and Impact

The document persists as `foundations/typography` with `typographyDocumentAtom`, which also contributes
scale-step terms to the Registry. Follow `authoring-lifecycle` and `changelog-parity.mdc`. Edits go
through `updateTypographyAtom`, which requires edit mode and validates generation across every zoom
value before saving. That is intended edit-time validation.

## Known debt and what not to copy

Open items are in `docs/known-debt.md`. Follow Working rule 5 in `AGENTS.md`. Do not copy:

- Ids derived from parts (typography reference ids in `tokens/primitiveIdentity.ts`): new identities
  follow the design-data UUID guidelines (`tokens`, DEBT-017).
- Throwing from a generation path for stored or authored data (DEBT-026). Return issues.
- Adding more fields to typography for product defaults (DEBT-027).

## Checks

`test:typography`, `test:typography-tokens`, `test:typography-preview`, `test:typography-analysis`,
`test:typography-reference`; `test:changelog`, `test:impact` and `pnpm check:changelog-coverage` when
persisted data changes; `test:tshirt-sizing` when component size changes. Browser:
`typography-panel.spec.ts`, `typography-analysis.spec.ts`, `typography-text-zoom-reference.spec.ts`,
`typography-icon-preview.spec.ts`, with `pageerror` asserted empty (`verify-change`). `test:defaults`
expects a retired category (DEBT-022).
