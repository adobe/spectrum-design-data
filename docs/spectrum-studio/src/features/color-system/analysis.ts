// Copyright 2026 Adobe. All rights reserved.
import Color from "colorjs.io";
import { colorJsSpace } from "./outputSettings";
import {
  contrastRatio,
  convertLinearGamut,
  linearToOklab,
  oklabToLinear,
  oklabToOklch,
  oklchToOklab,
  outputColorCss,
  luminance,
  renderGamutForOutput,
  type LinearRgb,
  type Oklab,
  type OutputColorSpace,
  type RgbGamut,
} from "./colorMath";
import {
  buildScaleData,
  readAnchors,
  stopOklch,
  type ScaleData,
} from "./scaleGeneration";
import { generateColors } from "./dynamicGeneration";
import { surfaceCss, surfaceLinear } from "./surfaceGeneration";
import type {
  ColorScale,
  ColorSystemDocument,
  ContrastToken,
  Surface,
} from "./model";
import type { PlaneDomains } from "./colorPlane";
import { MAX_CHROMA } from "./paletteValue";
import { contrastStepIndex, scaleContrasts } from "./contrastSteps";
import type { Rule } from "../logic/model";
import { STANDARD_SCALE_NAMING_RULE } from "../logic/scaleNaming";

const NEUTRAL_EPSILON = 0.000001;

export interface AnalysisColor {
  lab: Oklab;
  lightness: number;
  chroma: number;
  hue: number | null;
  css: string;
}
export interface TrajectorySample extends AnalysisColor {
  position: number;
}
export interface AnalysisScale {
  id: string;
  name: string;
  data: ScaleData;
  samples: TrajectorySample[];
  keys: (AnalysisColor & { id: string; inGamut: boolean })[];
}
export interface OutputObservation extends AnalysisColor {
  id: string;
  originalOrder: number;
  scaleIndex: number;
  authoredTarget: number;
  target: number;
  achieved: number;
  calculated: number;
  grayscale: string;
}

export function describeColor(
  linear: LinearRgb,
  gamut: RgbGamut,
  css: string,
): AnalysisColor {
  if (!linear.every(Number.isFinite))
    throw new Error("Color analysis received non-finite color channels.");
  // Equal RGB channels are neutral in both D65 gamuts; avoid matrix-rounding hue noise.
  const neutral = Math.max(...linear) - Math.min(...linear) < 1e-7;
  const lab = linearToOklab(
    neutral ? linear : convertLinearGamut(linear, gamut, "srgb"),
  );
  const [lightness, chroma, hue] = oklabToOklch(lab);
  if (![lightness, chroma, hue].every(Number.isFinite))
    throw new Error("Could not convert this color to OKLab.");
  return {
    lab,
    lightness,
    chroma,
    hue: chroma <= NEUTRAL_EPSILON ? null : hue,
    css,
  };
}

export function decodeAnalysisColor(css: string, gamut: RgbGamut): LinearRgb {
  const parsed = new Color(css);
  if (parsed.alpha !== 1)
    throw new Error("Analysis measurements require an opaque generated color.");
  const values = parsed.to(`${colorJsSpace(gamut)}-linear`).coords;
  const linear: LinearRgb = [
    Number(values[0]),
    Number(values[1]),
    Number(values[2]),
  ];
  if (!linear.every(Number.isFinite))
    throw new Error(`Could not measure generated color "${css}".`);
  return linear;
}

export function trajectorySample(
  data: ScaleData,
  position: number,
): TrajectorySample {
  const linear = readAnchors(data.anchors, position);
  return {
    ...describeColor(
      linear,
      data.gamut,
      outputColorCss(linear, data.output, data.gamut),
    ),
    position,
  };
}

const trajectoryCache = new Map<string, TrajectorySample[]>();
export function sampleTrajectory(data: ScaleData) {
  const cacheKey = JSON.stringify([data.gamut, data.output, data.anchors]);
  const cached = trajectoryCache.get(cacheKey);
  if (cached) return cached;
  const positions = [
    ...new Set([
      ...Array.from({ length: 129 }, (_, index) => index / 128),
      ...data.anchors.map((anchor) => anchor.luminance),
    ]),
  ].sort((a, b) => a - b);
  const initial = positions.map((position) => trajectorySample(data, position));
  const distance = (
    point: TrajectorySample,
    a: TrajectorySample,
    b: TrajectorySample,
  ) => {
    const dx = b.lab[1] - a.lab[1];
    const dy = b.lab[2] - a.lab[2];
    const length = dx * dx + dy * dy;
    const t =
      length === 0
        ? 0
        : Math.min(
            1,
            Math.max(
              0,
              ((point.lab[1] - a.lab[1]) * dx +
                (point.lab[2] - a.lab[2]) * dy) /
                length,
            ),
          );
    return Math.hypot(
      point.lab[1] - a.lab[1] - dx * t,
      point.lab[2] - a.lab[2] - dy * t,
    );
  };
  const refine = (
    a: TrajectorySample,
    b: TrajectorySample,
    depth: number,
  ): TrajectorySample[] => {
    const middle = trajectorySample(data, (a.position + b.position) / 2);
    const quarter = trajectorySample(data, (a.position * 3 + b.position) / 4);
    const threeQuarter = trajectorySample(
      data,
      (a.position + b.position * 3) / 4,
    );
    if (
      Math.max(
        distance(middle, a, b),
        distance(quarter, a, b),
        distance(threeQuarter, a, b),
      ) <= 0.0005
    )
      return [];
    if (depth >= 12)
      throw new Error(
        "Could not draw the scale trajectory within the analysis accuracy limit.",
      );
    return [
      ...refine(a, middle, depth + 1),
      middle,
      ...refine(middle, b, depth + 1),
    ];
  };
  const samples = initial.flatMap((sample, index) =>
    index === 0 ? [sample] : [...refine(initial[index - 1], sample, 0), sample],
  );
  trajectoryCache.set(cacheKey, samples);
  if (trajectoryCache.size > 128)
    trajectoryCache.delete(trajectoryCache.keys().next().value!);
  return samples;
}

export function buildAnalysisScale(
  scale: ColorScale,
  output: OutputColorSpace,
): AnalysisScale {
  if (!scale.stops.length) throw new Error(`${scale.name} has no scale keys.`);
  for (const stop of scale.stops) {
    if (
      ![stop.lightness, stop.chroma, stop.hue].every(Number.isFinite) ||
      stop.lightness < 0 ||
      stop.lightness > 1 ||
      stop.chroma < 0
    ) {
      throw new Error(`${scale.name} contains an invalid key color.`);
    }
  }
  const data = buildScaleData(scale, output);
  return {
    id: scale.id,
    name: scale.name,
    data,
    samples: sampleTrajectory(data),
    keys: scale.stops.map((stop) => {
      const lch = stopOklch(stop);
      const lab = oklchToOklab(lch);
      const linear = convertLinearGamut(oklabToLinear(lab), "srgb", data.gamut);
      return {
        id: stop.id,
        lab,
        lightness: lch[0],
        chroma: lch[1],
        hue: lch[1] <= NEUTRAL_EPSILON ? null : ((lch[2] % 360) + 360) % 360,
        css: `oklch(${lch[0]} ${lch[1]} ${lch[2]})`,
        inGamut: linear.every(
          (channel) => channel >= -1e-7 && channel <= 1 + 1e-7,
        ),
      };
    }),
  };
}

export function findSlice(
  samples: readonly TrajectorySample[],
  lightness: number,
  evaluate: (position: number) => TrajectorySample,
): { kind: "available"; color: TrajectorySample } | { kind: "unavailable" } {
  if (!Number.isFinite(lightness) || lightness < 0 || lightness > 1)
    throw new Error("Slice lightness must be between 0 and 1.");
  for (let index = samples.length - 1; index >= 0; index -= 1) {
    const high = samples[index];
    if (Math.abs(high.lightness - lightness) <= 1e-7)
      return { kind: "available", color: high };
    if (index === 0) continue;
    const low = samples[index - 1];
    if ((high.lightness - lightness) * (low.lightness - lightness) > 0)
      continue;
    let a = low;
    let b = high;
    for (let step = 0; step < 30; step += 1) {
      const middle = evaluate((a.position + b.position) / 2);
      if (Math.abs(middle.lightness - lightness) < 1e-7)
        return { kind: "available", color: middle };
      if ((a.lightness - lightness) * (middle.lightness - lightness) <= 0)
        b = middle;
      else a = middle;
    }
    return {
      kind: "available",
      color: evaluate((a.position + b.position) / 2),
    };
  }
  return { kind: "unavailable" };
}

export function analysisDomains(
  scales: readonly AnalysisScale[],
): PlaneDomains {
  const maximum = Math.max(
    MAX_CHROMA,
    ...scales.flatMap((scale) => [
      ...scale.samples.map((sample) => sample.chroma),
      ...scale.keys.map((key) => key.chroma),
    ]),
  );
  const limit = Math.ceil(maximum / 0.05) * 0.05;
  return [
    [-limit, limit],
    [-limit, limit],
  ];
}

export function grayscaleForLightness(lightness: number) {
  return outputColorCss(oklabToLinear([lightness, 0, 0]), "oklch", "srgb");
}

export function buildOutputProfile(
  document: ColorSystemDocument,
  scale: ColorScale,
  surface: Surface,
  authored: readonly ContrastToken[],
  rules: readonly Rule[] = [STANDARD_SCALE_NAMING_RULE],
): OutputObservation[] {
  const gamut = renderGamutForOutput(document.settings.colorOutput);
  const data = buildScaleData(scale, document.settings.colorOutput);
  const background = surfaceLinear(surface, document);
  const measuredBackground = luminance(
    decodeAnalysisColor(surfaceCss(surface, document), gamut),
    gamut,
  );
  return scaleContrasts(document, scale)
    .map((contrast, originalOrder) => {
      if (!Number.isFinite(contrast.value) || contrast.value < 1)
        throw new Error("Contrast targets must be finite and at least 1:1.");
      const generated = generateColors(
        data,
        background,
        contrast.value,
        document.settings,
      );
      const linear = decodeAnalysisColor(generated.dynamic.css, gamut);
      const color = describeColor(linear, gamut, generated.dynamic.css);
      return {
        ...color,
        id: contrast.id,
        originalOrder,
        scaleIndex: contrastStepIndex(originalOrder, scale, rules),
        target: contrast.value,
        authoredTarget:
          authored.find((item) => item.id === contrast.id)?.value ??
          contrast.value,
        achieved: contrastRatio(luminance(linear, gamut), measuredBackground),
        calculated: generated.dynamic.measuredContrast,
        grayscale: grayscaleForLightness(color.lightness),
      };
    })
    .sort((a, b) => a.target - b.target || a.originalOrder - b.originalOrder);
}

export function repairReference<T extends { id: string }>(
  items: readonly T[],
  selected: string | null,
  preferred?: string | null,
) {
  return (
    items.find((item) => item.id === selected) ??
    items.find((item) => item.id === preferred) ??
    items[0]
  );
}

export function splitHueSamples(samples: readonly TrajectorySample[]) {
  return samples.map((sample, index) => ({
    x: sample.position,
    y: sample.hue,
    breakBefore:
      index > 0 &&
      sample.hue !== null &&
      samples[index - 1].hue !== null &&
      Math.abs(sample.hue - samples[index - 1].hue!) > 180,
  }));
}
