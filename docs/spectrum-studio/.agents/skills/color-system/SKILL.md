---
name: color-system
description: How the Color foundation works in spectrum-studio. Use when touching color scales, stops, contrast steps, surfaces, palette colors, polarity compensation, the contrast multiplier, color output (gamut and format), CSS color library export, the color picker, the Scale Editor, or the Color evaluation and analysis views. Covers the document model, the single resolution pipeline, generation, output verification, and the checks and browser smoke path required for color changes. Data-vis color scales have their own skill.
---

# Color system

Code: `src/features/color-system/`. UI: `src/panels/color-system/`, `src/views/color-system/`,
`src/panels/foundations/FoundationsColorPanel.tsx` and `ColorSystemSettings.tsx`,
`src/components/color-picker/`, `src/components/palette/`. Roadmap: EPIC-1.1 (done). Data-vis scales
(sequential, diverging, categorical) are in the `data-vis` skill. Which color parameters a mode can
set, and the polarity and multiplier dials as adaptations, are in the `modes` skill. How color
becomes tokens is in `tokens`. Longer references: `docs/contrast-polarity-compensation.md`.

## The document model

`ColorSystemDocument` (`model.ts`, schema version 5):

- `scales`: each has `stops` (`lightness`, `hue`, `chroma` in OKLCh, optional `paletteColorId`
  link) and optionally its own `customContrasts` (steps, a base step, and a naming rule from Logic
  by `namingRuleId`).
- `palette`: static named colors. A stop linked to one takes its channels from it.
- `contrasts`: the shared contrast ratio list; each has a `value` and optional `oppositeValue`
  (an explicit value for the opposite background extreme that replaces the compensated one).
- `surfaces`: contrast-based backgrounds, referencing the base or a parent, with a role and
  `forceDark`. Surfaces are legacy, experimental, and may be removed in future versions.
- `backgroundScaleId` and `backgroundLightness`: the background everything is measured against.
- `settings`: `side`, `extOffset`, `extSteep`, `guardThreshold`, `colorOutput` (gamut and format),
  `polarityCompensation`, `contrastMultiplier`.
- `dataVisScales`: see the `data-vis` skill.

Contrast steps are editable only in the default Color context (no preview active); a scale's own
`customContrasts` are the exception that allows per-scale main-ratio overrides in Contrast modes.

### Custom contrast editing and reset

With the default Contrast mode selected, the custom-step editor follows the current background
polarity. For Light-reference systems, Light edits the starting ratio. Dark shows the
polarity-adjusted ratio, or **Mode override** when a manual target exists. Editing Dark retains
the Light starting ratio; **Reset** removes the manual target and restores the calculation from
the starting ratio and shared polarity-compensation setting. The overall contrast multiplier
applies afterward.

Do not reintroduce separate **Opposite contrast** fields or **Use compensation** buttons.
Existing `oppositeValue` records remain the compatible storage for manual opposite-polarity
targets, not named-mode patches. Preserve their continuous-background interpolation and use
`contrastForEffectiveEdit` to reverse it when storing an edit. Use
`customContrastEditingContextAtom` for the edit destination; do not infer it separately in a UI.
Nondefault Contrast modes retain their existing main-ratio patch behavior. Temporary Color
previews cannot author overrides.

Regression checks: `tests/custom-contrast-polarity.ts` (included in `test:polarity`) and
`tests/e2e/custom-contrast-polarity.spec.ts` cover inheritance, exact Dark edits, scoped reset,
and Save/Cancel/reload.

## One resolution pipeline

`resolveColorDocument(base, modes, preview, options)` (`resolution.ts`) is the single place the
effective document is built: it applies the active modes' dial values, then preview overrides, then
resolves palette links, then polarity compensation, then the contrast multiplier. Preview, token
generation, the CSS library and the evaluation views all read its output. Put color math in this
pipeline or the generators, never in a consumer, and do not compute a second copy of "the current
document". The atoms that expose it are `resolvedColorSystemDocumentAtom` and `cssBaseDocumentAtom`
(`state.ts`).

## Generation

- `scaleGeneration.ts` builds each scale's ramp from its stops (`buildRamp`,
  `resolveScaleColorAtLightness`).
- `dynamicGeneration.ts` (`generateColors`) finds the color for each contrast step against the
  background: a target luminance from the target ratio and the side (light or dark), the extremity
  from `extOffset` and `extSteep`, and the alpha and opaque variants. Contrast is measured, not
  assumed.
- `surfaceGeneration.ts` resolves a surface's color from its contrast and reference.
- `polarity.ts`: polarity compensation (0 to 100%) adds up to 12 CIE L\* points to each contrast's
  lightness difference; the contrast multiplier scales each ratio's distance from 1:1,
  `(c - 1) * m + 1`, capped at 21:1. Both are mode dials and adaptations. See the doc above before
  changing either; it also explains why the CSS emits precomputed values per color-scheme mode and
  applies the multiplier at paint time.
- Tokens are made from this output by `tokens/colorGeneration.ts` and `tokens/generation.ts`.

## Output and verification

- Gamut (`srgb`, `display-p3`, `rec2020`) and format (`rgb`, `oklch`, `hex`, `hsl`) are one shared
  saved setting (`outputSettings.ts`, `settings.colorOutput`). Hex and HSL are available only for
  sRGB output.
- `outputContrast.ts` re-measures contrast after formatting. A relationship that cannot reach its
  target raises `ColorOutputError`; the failed relationship keeps its authored sources and blocks
  dependent output and export. A manually edited swatch is formatted but never recolored to
  repair its target. Surface these as visible errors, not as thrown crashes (Working rule 2).
- `cssLibrary.ts` builds the pure CSS library (no runtime JS), in a worker
  (`cssLibrary.worker.ts`). It emits per color-scheme mode values; the contrast multiplier
  is applied in CSS. A change to generation or the library is a slow-check trigger.

## Palette

Palette colors are static, named colors that stops can link to (`palette.ts`,
`paletteReferences.ts`, `paletteValue.ts`). Removing or detaching one goes through
`paletteReferences` (`paletteConsumers`, `detachPaletteColor`, `normalizePaletteReferences`), and
`usePaletteIntegrity` drops links whose color no longer exists. Palette names must be unique.
Palette tokens write their edits back to the palette color (see `tokens`).

## UI surfaces

- Panels: `FoundationsColorPanel`, `ScaleStopEditor`, `SurfaceEditor`, `PaletteEditor`,
  `CustomContrastEditor` and `CustomContrastControls`, `ColorOutputControls`.
- Views: `ColorEvaluation`, `ContextualEvaluation`, `ColorAnalyze` and `ColorAnalysisView`,
  `ContrastRamp`, `ScaleColorPreview`, `CssExport`.
- The color picker (`components/color-picker/`) and palette swatch components are reusable UI:
  use them and follow `component-catalog` instead of building new pickers. Color conversion,
  gamut mapping, formatting, contrast measurement and picker internals (including OKLCh polar
  editing for wide-gamut defaults and the canvas worker) are in the `color-management` skill; read
  it before writing any code that parses, converts or formats a color.
- Naming of scales and steps goes through the taxonomy (`taxonomy/colorGovernance.ts`,
  `contrastSteps.ts`), not free text; see `design-data-contract`.

## Required checks

Pick checks with `verify-change`. Color-specific rules from `AGENTS.md`:

- Run the directly affected unit checks: `test:color-picker`, `test:color-output`,
  `test:custom-contrasts`, `test:polarity`, `test:contrast-multiplier`, `test:color-analysis`,
  `test:gray-defaults`, `test:palette`.
- Shared color math, formatters, state or utility imports: also run at least one browser
  interaction test for every consuming UI surface.
- Browser smoke path for any color-system change: open Foundations, open the Colors subpanel,
  open the Scale Editor, open the Evaluation view, and exercise the changed control. The existing
  `tests/e2e/color-system-smoke.spec.ts` covers it. It must assert that `pageerror` is empty.
- `test:color-system` (performance) runs once, at the end, only when generation or the CSS
  library or its worker changed.

## Known debt and what not to copy

Open items are in `docs/known-debt.md`. Follow Working rule 5 in `AGENTS.md`. Relevant now:

- Per-mode structural overrides (`scaleStops`, `scaleContrasts`, `dataVisSources`,
  `dataVisContrasts` in the mode's color settings, applied in `resolveColorDocument`) are legacy.
  The model is dials only. Do not add any similar override, and do not build features on them
  (DEBT-003).
- The older color token override layer (DEBT-013).
- New throws for color or contrast problems on authored data. `ColorOutputError` is the existing
  case, caught by `ColorOutputBoundary`; show other problems as visible diagnostics.
