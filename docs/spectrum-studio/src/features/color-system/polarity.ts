// Copyright 2026 Adobe. All rights reserved.
import { luminance, renderGamutForOutput } from "./colorMath";
import type {
  ColorSystemDocument,
  ContrastReference,
  ContrastToken,
} from "./model";
import { resolveScaleColorAtLightness } from "./scaleGeneration";

export const DEFAULT_CONTRAST_REFERENCE: ContrastReference = "light";
export const DEFAULT_POLARITY_COMPENSATION = 0;
/** CIE L* points added at 100% strength. */
export const MAX_POLARITY_OFFSET = 12;
// Higher values keep the boost flat longer before converging on 21:1.
const ROLLOFF_EXPONENT = 2;
// L* scale over which the boost ramps up from 1:1; smaller widens the lowest steps more.
const LOW_EXPANSION = 3;
const MIN_RATIO = 1;
const MAX_RATIO = 21;
const COLLAPSE_TOLERANCE = 0.005;

function clampRatio(ratio: number) {
  return Math.min(MAX_RATIO, Math.max(MIN_RATIO, ratio));
}

function lightnessFromLuminance(y: number) {
  return y > 216 / 24389 ? 116 * Math.cbrt(y) - 16 : (24389 / 27) * y;
}

function luminanceFromLightness(lightness: number) {
  return lightness > 8
    ? ((lightness + 16) / 116) ** 3
    : (lightness * 27) / 24389;
}

// Ratios are compared as lightness differences against black, where WCAG 2 understates dark-mode contrast.
function darkLightnessDelta(ratio: number) {
  return lightnessFromLuminance(0.05 * (clampRatio(ratio) - 1));
}

function ratioFromDarkLightnessDelta(delta: number) {
  return clampRatio(
    1 + luminanceFromLightness(Math.min(100, Math.max(0, delta))) / 0.05,
  );
}

// Ramps in from 1:1 to widen the lowest steps, then holds a constant L* offset that rolls off toward 21:1.
function boost(delta: number, offset: number) {
  return (
    delta +
    offset *
      (1 - Math.exp(-delta / LOW_EXPANSION)) *
      (1 - (delta / 100) ** ROLLOFF_EXPONENT)
  );
}

function unboost(target: number, offset: number) {
  let low = 0;
  let high = 100;
  for (let step = 0; step < 40; step += 1) {
    const middle = (low + high) / 2;
    if (boost(middle, offset) < target) low = middle;
    else high = middle;
  }
  return (low + high) / 2;
}

export function contrastReference(
  document: ColorSystemDocument,
): ContrastReference {
  return document.settings.contrastReference ?? DEFAULT_CONTRAST_REFERENCE;
}

export function polarityCompensation(document: ColorSystemDocument) {
  return (
    document.settings.polarityCompensation ?? DEFAULT_POLARITY_COMPENSATION
  );
}

export const DEFAULT_CONTRAST_MULTIPLIER = 1;
export const MAX_CONTRAST_MULTIPLIER = 3;

export function contrastMultiplier(document: ColorSystemDocument) {
  return document.settings.contrastMultiplier ?? DEFAULT_CONTRAST_MULTIPLIER;
}

/** Spectrum studio-style scaling of the distance from 1:1, so 1:1 stays fixed. */
export function multiplyContrast(ratio: number, multiplier: number) {
  return clampRatio((clampRatio(ratio) - 1) * Math.max(0, multiplier) + 1);
}

export function divideContrast(ratio: number, multiplier: number) {
  return multiplier > 0
    ? clampRatio((clampRatio(ratio) - 1) / multiplier + 1)
    : MIN_RATIO;
}

export function applyContrastMultiplier(
  document: ColorSystemDocument,
): ColorSystemDocument {
  const multiplier = contrastMultiplier(document);
  if (multiplier === 1) return document;
  return {
    ...document,
    contrasts: document.contrasts.map((contrast) => ({
      ...contrast,
      value: multiplyContrast(contrast.value, multiplier),
    })),
    scales: document.scales.map((scale) =>
      !scale.customContrasts
        ? scale
        : {
            ...scale,
            customContrasts: {
              ...scale.customContrasts,
              steps: scale.customContrasts.steps.map((step) => ({
                ...step,
                value: multiplyContrast(step.value, multiplier),
              })),
            },
          },
    ),
    surfaces: document.surfaces.map((surface) =>
      surface.base || surface.contrast === undefined
        ? surface
        : {
            ...surface,
            contrast: multiplyContrast(surface.contrast, multiplier),
          },
    ),
  };
}

/** Contrast the authored ratio needs at the opposite background extreme. */
export function compensatedContrast(
  ratio: number,
  strength: number,
  reference: ContrastReference,
) {
  const offset = Math.min(1, Math.max(0, strength)) * MAX_POLARITY_OFFSET;
  if (offset === 0) return clampRatio(ratio);
  const delta = darkLightnessDelta(ratio);
  return ratioFromDarkLightnessDelta(
    reference === "light" ? boost(delta, offset) : unboost(delta, offset),
  );
}

/** 0 at the authored background extreme, 1 at the opposite extreme. */
export function polarityWeight(
  backgroundLuminance: number,
  reference: ContrastReference,
) {
  const lightness =
    Math.min(100, Math.max(0, lightnessFromLuminance(backgroundLuminance))) /
    100;
  return reference === "light" ? 1 - lightness : lightness;
}

export interface PolarityContext {
  weight: number;
  strength: number;
  reference: ContrastReference;
}

export function oppositeContrast(
  contrast: Pick<ContrastToken, "value" | "oppositeValue">,
  context: PolarityContext,
) {
  return (
    contrast.oppositeValue ??
    compensatedContrast(contrast.value, context.strength, context.reference)
  );
}

export function effectiveContrast(
  contrast: Pick<ContrastToken, "value" | "oppositeValue">,
  context: PolarityContext,
) {
  const authored = clampRatio(contrast.value);
  if (context.weight <= 0) return authored;
  const opposite = oppositeContrast(contrast, context);
  if (context.weight >= 1) return clampRatio(opposite);
  return clampRatio(
    Math.exp(
      Math.log(authored) +
        context.weight * (Math.log(opposite) - Math.log(authored)),
    ),
  );
}

/** Past the midpoint, edits belong to the opposite polarity so authored values stay untouched. */
export function editsOppositeValue(context: PolarityContext) {
  return context.weight >= 0.5;
}

/** Maps a slider edit back to the stored authored or opposite value. */
export function contrastForEffectiveEdit(
  contrast: ContrastToken,
  target: number,
  context: PolarityContext,
): ContrastToken {
  const desired = clampRatio(target);
  if (editsOppositeValue(context)) {
    const authored = Math.log(clampRatio(contrast.value));
    const opposite = Math.exp(
      (Math.log(desired) - (1 - context.weight) * authored) / context.weight,
    );
    return { ...contrast, oppositeValue: clampRatio(opposite) };
  }
  let low = MIN_RATIO;
  let high = MAX_RATIO;
  for (let step = 0; step < 40; step += 1) {
    const middle = (low + high) / 2;
    if (effectiveContrast({ ...contrast, value: middle }, context) < desired)
      low = middle;
    else high = middle;
  }
  return { ...contrast, value: clampRatio((low + high) / 2) };
}

/** Ids whose effective value merged with the previous step even though authored values differ. */
export function collapsedContrastIds(
  authored: ContrastToken[],
  effective: ContrastToken[],
) {
  const collapsed = new Set<string>();
  effective.forEach((contrast, index) => {
    if (index === 0) return;
    const previous = effective[index - 1];
    const authoredDiffers =
      Math.abs(authored[index].value - authored[index - 1].value) >
      COLLAPSE_TOLERANCE;
    if (
      authoredDiffers &&
      Math.abs(contrast.value - previous.value) <= COLLAPSE_TOLERANCE
    ) {
      collapsed.add(previous.id);
      collapsed.add(contrast.id);
    }
  });
  return collapsed;
}

export function backgroundLuminance(document: ColorSystemDocument) {
  const scale =
    document.scales.find((item) => item.id === document.backgroundScaleId) ??
    document.scales[0];
  const background = resolveScaleColorAtLightness(
    scale,
    document.backgroundLightness,
    document.settings.colorOutput,
  );
  return luminance(
    background.linear,
    renderGamutForOutput(document.settings.colorOutput),
  );
}

export function polarityContext(
  document: ColorSystemDocument,
): PolarityContext {
  const reference = contrastReference(document);
  return {
    weight: polarityWeight(backgroundLuminance(document), reference),
    strength: polarityCompensation(document),
    reference,
  };
}

/** Pre-pass that replaces authored contrasts with the values for the document's background. */
export function applyPolarityCompensation(
  document: ColorSystemDocument,
): ColorSystemDocument {
  const context = polarityContext(document);
  const hasOpposites = [
    ...document.contrasts,
    ...document.scales.flatMap((scale) => scale.customContrasts?.steps ?? []),
  ].some((contrast) => contrast.oppositeValue !== undefined);
  if (context.weight === 0 || (context.strength === 0 && !hasOpposites))
    return document;
  return {
    ...document,
    contrasts: document.contrasts.map((contrast) => ({
      ...contrast,
      value: effectiveContrast(contrast, context),
    })),
    scales: document.scales.map((scale) =>
      !scale.customContrasts
        ? scale
        : {
            ...scale,
            customContrasts: {
              ...scale.customContrasts,
              steps: scale.customContrasts.steps.map((step) => ({
                ...step,
                value: effectiveContrast(step, context),
              })),
            },
          },
    ),
    surfaces: document.surfaces.map((surface) =>
      surface.base || surface.contrast === undefined
        ? surface
        : {
            ...surface,
            contrast: effectiveContrast({ value: surface.contrast }, context),
          },
    ),
  };
}
