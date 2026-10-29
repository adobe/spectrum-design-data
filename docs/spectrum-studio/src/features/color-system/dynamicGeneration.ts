// Copyright 2026 Adobe. All rights reserved.
import {
  clamp01,
  contrastRatio,
  deltaE,
  linearToHex,
  outputColorCss,
  linearToOklab,
  convertLinearGamut,
  luminance,
  mapLinearRgb,
  targetLuminance,
  toGamma,
  toLinear,
  type LinearRgb,
} from "./colorMath";
import {
  enforceOutputAlpha,
  enforceOutputContrast,
  parsedOutputLinear,
} from "./outputContrast";
import { readAnchors, type ScaleData } from "./scaleGeneration";

export interface GeneratedColor {
  linear: LinearRgb;
  hex: string;
  css: string;
  measuredContrast: number;
}

export interface TransparentGeneratedColor extends GeneratedColor {
  sourceHex: string;
  sourceCss: string;
  alpha: number;
}

export interface GeneratedColors {
  targetContrast: number;
  targetLuminance: number;
  sourceLuminance: number;
  alpha: number;
  isDark: boolean;
  sourceLinear: LinearRgb;
  dynamic: GeneratedColor;
  opaque: GeneratedColor;
  transparent: TransparentGeneratedColor;
  chromaDeltaE: number;
}

export interface DynamicGenerationSettings {
  side: "auto" | "light" | "dark";
  extOffset: number;
  extSteep: number;
}

const generationCache = new WeakMap<ScaleData, Map<string, GeneratedColors>>();

function createGeneratedColor(
  linear: LinearRgb,
  backgroundLuminance: number,
  scaleData: ScaleData,
): GeneratedColor {
  return {
    linear,
    hex: linearToHex(linear, scaleData.gamut),
    css: outputColorCss(linear, scaleData.output, scaleData.gamut),
    measuredContrast: contrastRatio(
      luminance(linear, scaleData.gamut),
      backgroundLuminance,
    ),
  };
}

function gammaComposite(
  background: LinearRgb,
  source: LinearRgb,
  alpha: number,
  gamut: ScaleData["gamut"],
): LinearRgb {
  return mapLinearRgb(source, (channel, index) =>
    toLinear(
      toGamma(channel, gamut) * alpha +
        toGamma(background[index], gamut) * (1 - alpha),
      gamut,
    ),
  );
}

export function generateColors(
  scaleData: ScaleData,
  background: LinearRgb,
  targetContrast: number,
  settings: DynamicGenerationSettings,
  sideOverride?: boolean,
): GeneratedColors {
  const cacheKey = JSON.stringify([
    background,
    targetContrast,
    settings.side,
    settings.extOffset,
    settings.extSteep,
    sideOverride,
  ]);
  const cache =
    generationCache.get(scaleData) ?? new Map<string, GeneratedColors>();
  const cached = cache.get(cacheKey);
  if (cached) return cached;
  const backgroundCss = outputColorCss(
    background,
    scaleData.output,
    scaleData.gamut,
  );
  if (typeof scaleData.output === "object")
    background = parsedOutputLinear(backgroundCss, scaleData.gamut);
  const backgroundLuminance = luminance(background, scaleData.gamut);
  const isDark =
    sideOverride ??
    (settings.side === "dark" ||
      (settings.side === "auto" && backgroundLuminance > 0.1791));
  const desiredLuminance = targetLuminance(
    backgroundLuminance,
    targetContrast,
    isDark,
  );
  const extremity = scaleData.neutral
    ? 1
    : clamp01(
        settings.extOffset + (settings.extSteep * (targetContrast - 1)) / 11,
      );
  const endpoint = isDark ? 0 : 1;
  const sourceLuminance = clamp01(
    desiredLuminance + extremity * (endpoint - desiredLuminance),
  );
  const source = readAnchors(scaleData.anchors, sourceLuminance);
  const sourceDifference = isDark
    ? Math.min(
        luminance(source, scaleData.gamut) - backgroundLuminance,
        -0.0001,
      )
    : Math.max(
        luminance(source, scaleData.gamut) - backgroundLuminance,
        0.0001,
      );
  const alpha = clamp01(
    (desiredLuminance - backgroundLuminance) / sourceDifference,
  );
  const dynamicLinear = mapLinearRgb(
    source,
    (channel, index) => alpha * channel + (1 - alpha) * background[index],
  );
  const opaqueLinear = readAnchors(scaleData.anchors, desiredLuminance);
  let transparentAlpha = alpha;
  if (scaleData.neutral) {
    let minimum = 0;
    let maximum = 1;
    for (let iteration = 0; iteration < 30; iteration += 1) {
      const midpoint = (minimum + maximum) / 2;
      const candidateLuminance = luminance(
        gammaComposite(background, source, midpoint, scaleData.gamut),
        scaleData.gamut,
      );
      if (
        isDark
          ? candidateLuminance > desiredLuminance
          : candidateLuminance < desiredLuminance
      )
        minimum = midpoint;
      else maximum = midpoint;
    }
    transparentAlpha = (minimum + maximum) / 2;
  }
  const transparentLinear = gammaComposite(
    background,
    source,
    transparentAlpha,
    scaleData.gamut,
  );
  const final = (linear: LinearRgb): GeneratedColor => {
    if (typeof scaleData.output !== "object")
      return createGeneratedColor(linear, backgroundLuminance, scaleData);
    const result = enforceOutputContrast(
      linear,
      backgroundCss,
      targetContrast,
      scaleData.output,
      isDark,
      scaleData.scale.name,
    );
    return { ...result, hex: linearToHex(result.linear, scaleData.gamut) };
  };
  const dynamic = final(dynamicLinear);
  let opaque: GeneratedColor | undefined;
  let transparent: TransparentGeneratedColor | undefined;
  const resolveOpaque = () => (opaque ??= final(opaqueLinear));

  const result: GeneratedColors = {
    targetContrast,
    targetLuminance: desiredLuminance,
    sourceLuminance,
    alpha,
    isDark,
    sourceLinear: source,
    dynamic,
    get opaque() {
      return resolveOpaque();
    },
    get transparent() {
      if (transparent) return transparent;
      const output =
        typeof scaleData.output === "object"
          ? enforceOutputAlpha(
              source,
              backgroundCss,
              targetContrast,
              scaleData.output,
              isDark,
              scaleData.scale.name,
            )
          : undefined;
      return (transparent = {
        ...createGeneratedColor(
          transparentLinear,
          backgroundLuminance,
          scaleData,
        ),
        sourceHex: linearToHex(source, scaleData.gamut),
        sourceCss: outputColorCss(source, scaleData.output, scaleData.gamut),
        alpha: transparentAlpha,
        ...(output && {
          css: output.css,
          linear: output.linear,
          measuredContrast: output.measuredContrast,
          sourceCss: output.sourceCss,
          sourceHex: linearToHex(output.sourceLinear, scaleData.gamut),
          alpha: output.alpha,
        }),
      });
    },
    get chromaDeltaE() {
      return deltaE(
        linearToOklab(
          convertLinearGamut(dynamic.linear, scaleData.gamut, "srgb"),
        ),
        linearToOklab(
          convertLinearGamut(resolveOpaque().linear, scaleData.gamut, "srgb"),
        ),
      );
    },
  };
  cache.set(cacheKey, result);
  if (cache.size > 128) cache.delete(cache.keys().next().value!);
  generationCache.set(scaleData, cache);
  return result;
}
