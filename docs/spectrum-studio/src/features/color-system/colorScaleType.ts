// Copyright 2026 Adobe. All rights reserved.
import Color from "colorjs.io";
import type { ContrastToken } from "./model";
import {
  gammaComposite,
  generateColors,
  type DynamicGenerationSettings,
  type GeneratedColor,
} from "./dynamicGeneration";
import {
  contrastRatio,
  linearToHex,
  luminance,
  outputColorCss,
  type LinearRgb,
} from "./colorMath";
import { readAnchors, type ScaleData } from "./scaleGeneration";
import { renderedOutputLinear, parsedOutputLinear } from "./outputContrast";
import { serializeOutputColor } from "./outputSerialization";
import type { OpacityResult } from "../opacity/generation";
import { DEFAULT_COLOR_OUTPUT } from "./outputSettings";

export class ColorScaleOutputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ColorScaleOutputError";
  }
}

/** Derived stop input, never written back to the authored contrast list. */
export interface OpacityColorStop extends ContrastToken {
  kind: "opacity";
  opacity: number;
}

export function isOpacityColorStop(
  stop: ContrastToken,
): stop is OpacityColorStop {
  return "kind" in stop && stop.kind === "opacity" && "opacity" in stop;
}

export function opacityStopsEnabled(settings: DynamicGenerationSettings) {
  return (
    settings.colorScaleType === "transparent" &&
    settings.syncDefaultStopsWithOpacity === true
  );
}

export function colorGoesDark(
  background: LinearRgb,
  settings: DynamicGenerationSettings,
  data: Pick<ScaleData, "gamut">,
) {
  return (
    settings.side === "dark" ||
    (settings.side === "auto" && luminance(background, data.gamut) > 0.1791)
  );
}

export function opacityColorStops(
  result: OpacityResult,
  background: LinearRgb,
  settings: DynamicGenerationSettings,
  gamut: ScaleData["gamut"],
): OpacityColorStop[] {
  if (result.issues.length)
    throw new ColorScaleOutputError(result.issues.join(" "));
  const dark = colorGoesDark(background, settings, { gamut });
  const endpoint: LinearRgb = dark ? [0, 0, 0] : [1, 1, 1];
  return result.levels.map((level) => ({
    id: level.id,
    scaleIndex: level.scaleIndex,
    kind: "opacity",
    opacity: level.value,
    value: contrastRatio(
      luminance(
        gammaComposite(background, endpoint, level.value, gamut),
        gamut,
      ),
      luminance(background, gamut),
    ),
  }));
}

export function generateSelectedColor(
  data: ScaleData,
  background: LinearRgb,
  stop: ContrastToken,
  settings: DynamicGenerationSettings,
): GeneratedColor {
  if (!isOpacityColorStop(stop)) {
    const colors = generateColors(data, background, stop.value, settings);
    if (settings.colorScaleType === "opaque") return colors.opaque;
    if (settings.colorScaleType === "transparent") return colors.transparent;
    return colors.dynamic;
  }
  const backgroundCss = outputColorCss(background, data.output, data.gamut);
  const actualBackground = parsedOutputLinear(backgroundCss, data.gamut);
  const backgroundLuminance = luminance(actualBackground, data.gamut);
  const dark = colorGoesDark(actualBackground, settings, data);
  const endpoint: LinearRgb = dark ? [0, 0, 0] : [1, 1, 1];
  const desired = luminance(
    gammaComposite(actualBackground, endpoint, stop.opacity, data.gamut),
    data.gamut,
  );
  const referenceContrast = contrastRatio(desired, backgroundLuminance);
  const extremity = data.neutral
    ? 1
    : Math.min(
        1,
        Math.max(
          0,
          settings.backgroundBlend +
            (settings.colorSourceCurveOffset * (referenceContrast - 1)) / 11,
        ),
      );
  const source = readAnchors(
    data.anchors,
    Math.min(1, Math.max(0, desired + extremity * ((dark ? 0 : 1) - desired))),
  );
  const sourceColor = new Color(
    outputColorCss(source, data.output, data.gamut),
  );
  sourceColor.alpha = stop.opacity;
  const output =
    typeof data.output === "object"
      ? data.output
      : { ...DEFAULT_COLOR_OUTPUT, authoringGamut: data.gamut };
  const exactHex = Math.round(stop.opacity * 255) / 255 === stop.opacity;
  const css = serializeOutputColor(
    sourceColor,
    output.outputFormat === "hex" && !exactHex
      ? { ...output, outputFormat: "rgb" }
      : output,
  );
  const linear = renderedOutputLinear(css, backgroundCss, data.gamut);
  return {
    css,
    linear,
    hex: linearToHex(linear, data.gamut),
    measuredContrast: contrastRatio(
      luminance(linear, data.gamut),
      backgroundLuminance,
    ),
  };
}
