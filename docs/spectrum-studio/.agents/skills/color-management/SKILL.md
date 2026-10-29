---
name: color-management
description: How to handle color values correctly in spectrum-studio code: parsing, conversion, gamut mapping, output format, serialization, contrast measurement, and picker or visualization rendering. Use when building or editing a color picker control, a color-relative UI, a color visualization, a swatch, or any code that parses, converts, maps, formats or compares colors. Not about scales, surfaces or tokens (see color-system and tokens).
---

# Color management

Code: `src/features/color-system/{colorMath,outputSettings,outputSerialization,outputContrast,
paletteValue}.ts`, `src/features/color-system/data-vis/colors.ts`, `src/components/color-picker/`.
`color-system` covers the Color foundation (scales, surfaces, polarity); this skill covers how any
code handles a color value. Use the existing helpers below. Do not write new color math, a new
parser or a new serializer.

## Two layers: hand-written linear math, and Color.js

- `colorMath.ts` is the hand-written core: `LinearRgb`, `Oklab` and `Oklch` tuples; gamma and
  linear conversion per gamut (`toLinear`, `toGamma`); cached XYZ D65 matrices for sRGB, Display P3
  and Rec 2020 (`convertLinearGamut`); OKLab and OKLCh conversion; `luminance`, `contrastRatio`,
  `deltaE`; and `interpolateHue`. Use it for generation and any high-volume or per-pixel math.
- Color.js (`colorjs.io`) is used for parsing, `toGamut`, `inGamut`, space conversion and output
  serialization. Use it at the edges, not in inner loops.
- Parse color strings only through `concreteColor` (`data-vis/colors.ts`), which rejects `var()`,
  `env()` and `currentcolor` and any unavailable channel and returns a plain `Color`. In the picker
  use `parsePickerColor` and `parsePickerHex`. Never parse with a regular expression.

## Gamut and format are one saved setting

`ColorOutputSettings` (`outputSettings.ts`): gamut `srgb`, `display-p3` or `rec2020`, and format
`rgb`, `oklch`, `hex` or `hsl`. Hex and HSL are valid only for sRGB output; an incompatible change
falls back to RGB with an explanation (`updateColorOutputSettings`, `isFormatAvailable`). Always
read the setting; never hard-code a gamut or format. "Map outputs to sRGB" keeps wide-gamut
authored sources but maps generated output to sRGB (`requiresOutputGamutMapping`).

A stored chroma coordinate of 100 is OKLCh chroma 0.4 (`paletteValue.ts`, `MAX_CHROMA`), and
authored chroma goes to 125.

## Gamut mapping

- Output uses Color.js `toGamut` with the CSS method. The method is the constant
  `COLOR_OUTPUT_MAPPING_METHOD` in `outputSerialization.ts`. Import it; never type the string.
  `mapOutputColor` is the entry point.
- Generation uses `gamutClamp(lightness, chroma, hue, gamut, preserveAppearance)` in
  `colorMath.ts`, which keeps lightness and hue and bisects chroma until in gamut, and switches to
  the Color.js mapping when `preserveAppearance` is true.
- These are two separate implementations (DEBT-018). For anything saved, exported or shown as
  output, use the output path (`mapOutputColor` or `serializeOutputColor`). Do not add a third
  mapping method.

## Serialization

`serializeOutputColor` and `serializeLinearOutputColor` (`outputSerialization.ts`) produce the
final string in the user's format: up to 12 decimals, `0` for zero, `rgb(...)` for sRGB and
`color(display-p3 ...)` or `color(rec2020 ...)` otherwise, eight-digit hex when alpha is not 1, and
hue 0 for an achromatic OKLCh or HSL. They throw on a missing channel or invalid opacity, so
callers on authored data must catch and show a visible error (`ColorOutputError` is the existing
pattern). Do not format colors with `toString` or template strings for output.

## Contrast is measured after formatting

Measure contrast from the serialized output, not the value before formatting
(`measureOutputContrast`, `enforceOutputContrast`, `renderedOutputLinear` in `outputContrast.ts`).
A manually edited swatch is formatted but never recolored to repair a target. Generation
composites alpha in gamma space (`gammaComposite` in `dynamicGeneration.ts`); do not change that
for display code.

## Picker and visualization code (`components/color-picker/`)

- A picker is configured by `PickerColorSpace` (`sRGB`, `Display P3`, `OKlch`) and `PickerModel`
  (`cartesian` or `polar`), resolved by `getColorSpaceConfig` to channels, default axes and a
  third channel. Axis ranges come from `getChannelRange`.
- Show where valid colors end: `getChannelGamutRange` finds each channel's in-gamut range by
  bisection (cached), and `isOutOfGamut` and `mapColorToGamut` are the shared checks. A color the
  user picks outside the output gamut must be mapped, not clamped per channel.
- Display P3 HSL is a custom conversion (`p3HslUtils.ts`), since CSS has no P3 `hsl`.
- Canvases are rasterized off the main thread: `colorRaster.ts` (cache and queue) and
  `colorCanvas.worker.ts`. Do not rasterize on the main thread. `getCanvasPixelColor` converts for
  the canvas's own color space (`srgb` or `display-p3`).
- Reuse the existing picker, loupe, slider and swatch components (`component-catalog`) rather than
  building a new one. New color-relative UI takes its gamut, format and mode from the saved
  settings and the resolved color document (`color-system`), so it stays in step with the app.
- Local display or gamut choices in a picker never change the saved setting, and an open picker is
  not reset when the shared default changes.

## Known debt and what not to copy

Open items are in the Color section of `docs/known-debt.md`. Follow Working rule 5 in `AGENTS.md`.
Do not copy: a second gamut-mapping method, a second serializer, a naming scheme that differs from
`ColorGamut` (`display-p3`, not `Display-P3`), or silent fallbacks on a parse failure.

## Checks

`test:color-picker`, `test:color-output` (four scripts), `test:color-analysis`, `test:palette`, and
`test:data-vis-interpolation` for interpolation helpers. If shared math or formatters changed,
also run the browser smoke path in `color-system`, with `pageerror` asserted empty
(`verify-change`).
