// Copyright 2026 Adobe. All rights reserved.
import {
  clamp01,
  gamutClamp,
  outputColorCss,
  interpolateHue,
  linearToHex,
  luminance,
  type LinearRgb,
  renderGamutForOutput,
  requiresOutputGamutMapping,
  type OutputColorSpace,
  type RgbGamut,
} from "./colorMath";
import type { ColorScale, ColorStop } from "./model";
import { MAX_CHROMA as COLOR_MAX } from "./paletteValue";

export function stopOklch(
  stop: Pick<ColorStop, "lightness" | "chroma" | "hue">,
): readonly [number, number, number] {
  return [stop.lightness, (stop.chroma / 100) * COLOR_MAX, stop.hue];
}
const NEUTRAL_CHROMA = 2;
const RAMP_STEPS = 33;
const ANCHOR_INDICES = [4, 9, 14, 19, 24, 28] as const;
const REFERENCE_LEVELS = [
  0.05, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 0.95,
] as const;

export interface RampColor {
  lightness: number;
  linear: LinearRgb;
  luminance: number;
  hex: string;
  css: string;
}

export interface ColorAnchor {
  luminance: number;
  linear: LinearRgb;
}

export interface ScaleData {
  scale: ColorScale;
  neutral: boolean;
  ramp: RampColor[];
  anchors: ColorAnchor[];
  referencePalette: Record<number, string>;
  gamut: RgbGamut;
  output: OutputColorSpace;
}

export interface ResolvedScaleColor {
  linear: LinearRgb;
  css: string;
  hex: string;
  lightness: number;
  hue: number;
  chroma: number;
  gamut: RgbGamut;
}

const scaleDataCache = new Map<string, ScaleData>();

function scaleCacheKey(scale: ColorScale, output: OutputColorSpace) {
  return `${JSON.stringify(output)}|${scale.id}|${scale.name}|${scale.stops.map((stop) => `${stop.lightness},${stop.hue},${stop.chroma}`).join(";")}`;
}

function sortStops(stops: ColorStop[]) {
  return [...stops].sort((first, second) => first.lightness - second.lightness);
}

export function scaleHueChromaAt(stops: ColorStop[], lightness: number) {
  const sortedStops = sortStops(stops);
  if (sortedStops.length === 0) {
    throw new Error("A color scale requires at least one stop.");
  }

  const first = sortedStops[0];
  const last = sortedStops.at(-1)!;
  if (lightness <= first.lightness || sortedStops.length === 1) {
    return { hue: first.hue, chroma: first.chroma };
  }
  if (lightness >= last.lightness) {
    return { hue: last.hue, chroma: last.chroma };
  }

  const upperIndex = sortedStops.findIndex(
    (stop) => stop.lightness >= lightness,
  );
  const lower = sortedStops[upperIndex - 1];
  const upper = sortedStops[upperIndex];
  const span = upper.lightness - lower.lightness;
  const fraction = span === 0 ? 0 : (lightness - lower.lightness) / span;
  return {
    hue: interpolateHue(lower.hue, upper.hue, fraction),
    chroma: lower.chroma + (upper.chroma - lower.chroma) * fraction,
  };
}

export function resolveScaleColorAtLightness(
  scale: ColorScale,
  lightness: number,
  output: OutputColorSpace = "srgb",
): ResolvedScaleColor {
  const gamut = renderGamutForOutput(output);
  const resolvedLightness = clamp01(lightness);
  const { hue, chroma } = scaleHueChromaAt(scale.stops, resolvedLightness);
  const linear = gamutClamp(
    resolvedLightness,
    (chroma / 100) * COLOR_MAX,
    hue,
    gamut,
    requiresOutputGamutMapping(output),
  );
  return {
    linear,
    css: outputColorCss(linear, output, gamut),
    hex: linearToHex(linear, gamut),
    lightness: resolvedLightness,
    hue,
    chroma,
    gamut,
  };
}

export function buildRamp(
  scale: ColorScale,
  output: OutputColorSpace = "srgb",
): RampColor[] {
  const gamut = renderGamutForOutput(output);
  const minimumLightness = Math.min(
    ...scale.stops.map((stop) => stop.lightness),
    0,
  );
  const maximumLightness = Math.max(
    ...scale.stops.map((stop) => stop.lightness),
    1,
  );

  return Array.from({ length: RAMP_STEPS }, (_, index) => {
    const lightness =
      minimumLightness +
      ((maximumLightness - minimumLightness) * index) / (RAMP_STEPS - 1);
    const { hue, chroma } = scaleHueChromaAt(scale.stops, lightness);
    const linear = gamutClamp(
      clamp01(lightness),
      (chroma / 100) * COLOR_MAX,
      hue,
      gamut,
      requiresOutputGamutMapping(output),
    );
    return {
      lightness,
      linear,
      luminance: luminance(linear, gamut),
      hex: linearToHex(linear, gamut),
      css: outputColorCss(linear, output, gamut),
    };
  }).sort((first, second) => first.luminance - second.luminance);
}

export function rampAnchors(ramp: RampColor[]): ColorAnchor[] {
  const samples: ColorAnchor[] = [
    { luminance: 0, linear: [0, 0, 0] },
    ...ANCHOR_INDICES.map((index) => ({
      luminance: ramp[index].luminance,
      linear: ramp[index].linear,
    })),
    { luminance: 1, linear: [1, 1, 1] },
  ];
  samples.sort((first, second) => first.luminance - second.luminance);

  return samples.filter(
    (anchor, index) =>
      index === 0 || anchor.luminance - samples[index - 1].luminance >= 0.0001,
  );
}

export function readAnchors(
  anchors: ColorAnchor[],
  targetLuminance: number,
): LinearRgb {
  const target = clamp01(targetLuminance);
  if (target <= anchors[0].luminance) {
    return anchors[0].linear;
  }
  const last = anchors.at(-1)!;
  if (target >= last.luminance) {
    return last.linear;
  }

  const upperIndex = anchors.findIndex((anchor) => anchor.luminance >= target);
  const lower = anchors[upperIndex - 1];
  const upper = anchors[upperIndex];
  const fraction =
    (target - lower.luminance) / (upper.luminance - lower.luminance);
  return [
    lower.linear[0] + (upper.linear[0] - lower.linear[0]) * fraction,
    lower.linear[1] + (upper.linear[1] - lower.linear[1]) * fraction,
    lower.linear[2] + (upper.linear[2] - lower.linear[2]) * fraction,
  ];
}

export function buildScaleData(
  scale: ColorScale,
  output: OutputColorSpace = "srgb",
): ScaleData {
  const gamut = renderGamutForOutput(output);
  const cacheKey = scaleCacheKey(scale, output);
  const cached = scaleDataCache.get(cacheKey);
  if (cached) {
    return cached;
  }
  const ramp = buildRamp(scale, output);
  const anchors = rampAnchors(ramp);
  const neutral = scale.stops.every((stop) => stop.chroma < NEUTRAL_CHROMA);
  const referencePalette = Object.fromEntries(
    REFERENCE_LEVELS.map((level) => [
      Math.round(level * 1000),
      outputColorCss(readAnchors(anchors, level), output, gamut),
    ]),
  );
  const result = {
    scale,
    neutral,
    ramp,
    anchors,
    referencePalette,
    gamut,
    output,
  };
  scaleDataCache.set(cacheKey, result);
  if (scaleDataCache.size > 256) {
    const oldestKey = scaleDataCache.keys().next().value;
    if (oldestKey) scaleDataCache.delete(oldestKey);
  }
  return result;
}
