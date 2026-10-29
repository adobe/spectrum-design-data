// Copyright 2026 Adobe. All rights reserved.
import {
  clamp01,
  linearToHex,
  luminance,
  mapLinearRgb,
  outputColorCss,
  renderGamutForOutput,
  type LinearRgb,
  type RgbGamut,
} from "./colorMath";
import { generateColors } from "./dynamicGeneration";
import type { ColorSystemDocument, Surface } from "./model";
import {
  buildScaleData,
  resolveScaleColorAtLightness,
} from "./scaleGeneration";
import { enforceOutputContrast, parsedOutputLinear } from "./outputContrast";

function goesLight(surface: Surface, reference: LinearRgb, gamut: RgbGamut) {
  return (
    !surface.forceDark &&
    (surface.contrast ?? 1) <= 1.05 / (luminance(reference, gamut) + 0.05)
  );
}

function deriveBaseSurface(
  surface: Surface,
  reference: LinearRgb,
  gamut: RgbGamut,
): LinearRgb {
  const contrast = surface.contrast ?? 1;
  const referenceLuminance = luminance(reference, gamut);
  if (goesLight(surface, reference, gamut)) {
    const maximum = Math.max(...reference, 0.000001);
    const target = contrast * (referenceLuminance + 0.05) - 0.05;
    const alpha = clamp01(
      (target - referenceLuminance) /
        Math.max(referenceLuminance / maximum - referenceLuminance, 0.000001),
    );
    return mapLinearRgb(reference, (channel) =>
      clamp01(channel + alpha * (channel / maximum - channel)),
    );
  }
  const target = (referenceLuminance + 0.05) / contrast - 0.05;
  const factor = target / Math.max(referenceLuminance, 0.000001);
  return mapLinearRgb(reference, (channel) => clamp01(factor * channel));
}

export function surfaceLinear(
  surface: Surface,
  document: ColorSystemDocument,
  parent?: LinearRgb,
): LinearRgb {
  const gamut = renderGamutForOutput(document.settings.colorOutput);
  const base = resolvedBackgroundLinear(document);
  if (surface.base) return base;
  const reference = surface.reference === "base" || !parent ? base : parent;
  if (
    !surface.sourceScaleId &&
    (!surface.source || surface.source === "base")
  ) {
    const referenceCss = outputColorCss(
      reference,
      document.settings.colorOutput,
      gamut,
    );
    const actualReference = parsedOutputLinear(referenceCss, gamut);
    return enforceOutputContrast(
      deriveBaseSurface(surface, actualReference, gamut),
      referenceCss,
      surface.contrast ?? 1,
      document.settings.colorOutput,
      !goesLight(surface, actualReference, gamut),
      surface.name,
    ).linear;
  }
  const scale = document.scales.find((candidate) =>
    surface.sourceScaleId
      ? candidate.id === surface.sourceScaleId
      : candidate.name === surface.source,
  );
  if (!scale)
    throw new Error(`Surface ${surface.id} has an unresolved tint source.`);
  return generateColors(
    buildScaleData(scale, document.settings.colorOutput),
    reference,
    surface.contrast ?? 1,
    document.settings,
    !goesLight(surface, reference, gamut),
  ).dynamic.linear;
}

export function resolvedBackgroundLinear(
  document: ColorSystemDocument,
): LinearRgb {
  const scale =
    document.scales.find((item) => item.id === document.backgroundScaleId) ??
    document.scales[0];
  return resolveScaleColorAtLightness(
    scale,
    document.backgroundLightness,
    document.settings.colorOutput,
  ).linear;
}

export function surfaceHex(surface: Surface, document: ColorSystemDocument) {
  return linearToHex(
    surfaceLinear(surface, document),
    renderGamutForOutput(document.settings.colorOutput),
  );
}

export function surfaceCss(surface: Surface, document: ColorSystemDocument) {
  return outputColorCss(
    surfaceLinear(surface, document),
    document.settings.colorOutput,
    renderGamutForOutput(document.settings.colorOutput),
  );
}
