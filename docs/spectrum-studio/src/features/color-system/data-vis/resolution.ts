// Copyright 2026 Adobe. All rights reserved.
import type { ColorSystemDocument, ColorScale } from "../model";
import { buildScaleData } from "../scaleGeneration";
import { generateColors } from "../dynamicGeneration";
import { resolvedBackgroundLinear } from "../surfaceGeneration";
import { outputColorCss, renderGamutForOutput } from "../colorMath";
import {
  contrastMultiplier,
  effectiveContrast,
  multiplyContrast,
  polarityContext,
} from "../polarity";
import { isFoundationPublished } from "../../foundations/types";
import { tokenDisplayName, type ResolvedToken } from "../../tokens/model";
import { concreteColor, renderedColor } from "./colors";
import { renderedContrast } from "./measurements";
import {
  frozenColorValue,
  type ContinuousDataVisScale,
  type DataVisPoint,
  type UiSwatchSource,
} from "./model";
import { linkedPrimitiveColor, type PrimitiveColor } from "./primitiveColors";
import { serializeOutputColor } from "../outputSerialization";

export interface UiSwatch {
  id: string;
  source: UiSwatchSource;
  label: string;
  value: string;
  generatedValue: string;
  manuallyOverridden: boolean;
}

export interface ResolvedDataVisPoint {
  id: string;
  position: number;
  value: string;
  source: DataVisPoint["source"] | { kind: "static-color"; value: string };
  actualContrast: number;
  targetContrast?: number;
  targetReached?: boolean;
  manuallyOverridden: boolean;
}

export function uiSwatchKey(
  source: Pick<UiSwatchSource, "scaleId" | "contrastId">,
) {
  return JSON.stringify([source.scaleId, source.contrastId]);
}

export function finalUiSwatches(
  document: ColorSystemDocument,
  tokens: readonly ResolvedToken[],
): UiSwatch[] {
  const scales = new Map(
    document.scales
      .filter(isFoundationPublished)
      .map((scale) => [scale.id, scale]),
  );
  return tokens
    .filter((token) => {
      const scale = scales.get(token.source.scaleId);
      return (
        !!scale &&
        (scale.customContrasts?.steps ?? document.contrasts).some(
          (step) => step.id === token.source.contrastId,
        )
      );
    })
    .map((token) => ({
      id: uiSwatchKey(token.source),
      source: {
        kind: "ui-swatch",
        scaleId: token.source.scaleId,
        contrastId: token.source.contrastId,
      },
      label: tokenDisplayName(token.name),
      value: token.value,
      generatedValue: token.generated.value,
      manuallyOverridden: token.valueOverridden,
    }));
}

export function dataVisBackground(document: ColorSystemDocument) {
  return outputColorCss(
    resolvedBackgroundLinear(document),
    document.settings.colorOutput,
  );
}

export function linkedUiSwatch(
  source: UiSwatchSource,
  swatches: readonly UiSwatch[],
) {
  const swatch = swatches.find(
    (candidate) => candidate.id === uiSwatchKey(source),
  );
  if (!swatch)
    throw new Error(
      `Linked UI swatch ${source.scaleId}/${source.contrastId} is unavailable. Choose a replacement color.`,
    );
  concreteColor(swatch.value);
  return swatch;
}

/** Receives resolved geometry and raw ratios: polarity and multiplication happen here once. */
export function resolveDataVisPoints(
  document: ColorSystemDocument,
  scale: ContinuousDataVisScale,
  swatches: readonly UiSwatch[],
  primitiveColors: readonly PrimitiveColor[] = [],
): ResolvedDataVisPoint[] {
  const background = resolvedBackgroundLinear(document),
    backgroundCss = dataVisBackground(document);
  const context = polarityContext(document),
    gamut = renderGamutForOutput(document.settings.colorOutput);
  if (scale.staticColors)
    return scale.staticColors.map((color) => {
      if (color.position === undefined)
        throw new Error("A Static continuous color has no position.");
      const value = serializeOutputColor(
        concreteColor(frozenColorValue(color)),
        document.settings.colorOutput,
      );
      const source: ResolvedDataVisPoint["source"] = color.tokenId
        ? { kind: "primitive-token", tokenId: color.tokenId }
        : { kind: "static-color", value };
      return {
        id: color.id,
        position: color.position,
        source,
        value,
        actualContrast: renderedContrast(
          renderedColor(value, backgroundCss, gamut),
          concreteColor(backgroundCss),
        ),
        manuallyOverridden: color.overrideValue !== undefined,
      };
    });
  return scale.points.map((point) => {
    if (point.source.kind === "primitive-token") {
      const linked = linkedPrimitiveColor(
        point.source.tokenId,
        primitiveColors,
      );
      return {
        id: point.id,
        position: point.position,
        source: point.source,
        value: linked.value,
        actualContrast: renderedContrast(
          renderedColor(linked.value, backgroundCss, gamut),
          concreteColor(backgroundCss),
        ),
        manuallyOverridden: linked.manuallyOverridden,
      };
    }
    if (point.source.kind === "ui-swatch") {
      const linked = linkedUiSwatch(point.source, swatches);
      return {
        id: point.id,
        position: point.position,
        source: point.source,
        value: linked.value,
        actualContrast: renderedContrast(
          renderedColor(linked.value, backgroundCss, gamut),
          concreteColor(backgroundCss),
        ),
        manuallyOverridden: linked.manuallyOverridden,
      };
    }
    if (!point.contrast)
      throw new Error(
        `Data vis point ${point.id} has no owned contrast recipe.`,
      );
    const source = point.source;
    const input: ColorScale | undefined =
      source.kind === "key-color"
        ? {
            id: `data-vis-point:${scale.id}:${point.id}`,
            name: scale.name,
            stops: [{ id: point.id, ...source.color }],
          }
        : document.scales.find((candidate) => candidate.id === source.scaleId);
    if (!input)
      throw new Error(
        `Data vis point ${point.id} has an unavailable UI scale. Choose a replacement color.`,
      );
    const targetContrast = multiplyContrast(
      effectiveContrast(point.contrast, context),
      contrastMultiplier(document),
    );
    const generated = generateColors(
      buildScaleData(input, document.settings.colorOutput),
      background,
      targetContrast,
      document.settings,
    );
    const actualContrast = renderedContrast(
      renderedColor(generated.dynamic.css, backgroundCss, gamut),
      concreteColor(backgroundCss),
    );
    return {
      id: point.id,
      position: point.position,
      source: point.source,
      value: generated.dynamic.css,
      targetContrast,
      actualContrast,
      targetReached:
        Math.abs(targetContrast - actualContrast) <=
        Math.max(0.035, targetContrast * 0.006),
      manuallyOverridden: false,
    };
  });
}
