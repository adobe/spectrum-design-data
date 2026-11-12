// Copyright 2026 Adobe. All rights reserved.
import Color from "colorjs.io";
import type {
  ColorOverrideContrast,
  ColorOverrideSource,
  ResolvedToken,
} from "./model";
import type { ColorSystemDocument } from "../color-system/model";
import { measureOutputContrast } from "../color-system/outputContrast";
import { serializeOutputColor } from "../color-system/outputSerialization";
import {
  outputGamut,
  type ColorOutputSettings,
} from "../color-system/outputSettings";
import { resolvedBackgroundLinear } from "../color-system/surfaceGeneration";
import { outputColorCss } from "../color-system/colorMath";
import type { BrowserToken } from "./browserModel";
import {
  isOpacityColorStop,
  opacityStopsEnabled,
} from "../color-system/colorScaleType";

export function opacityLinkedScaleIds(document: ColorSystemDocument) {
  return new Set(
    opacityStopsEnabled(document.settings)
      ? document.scales
          .filter((scale) => !scale.customContrasts)
          .map((scale) => scale.id)
      : [],
  );
}

function serializeColor(
  color: Color,
  settings: ColorOutputSettings,
  preserveOpacity: boolean,
) {
  return serializeOutputColor(
    color,
    preserveOpacity &&
      settings.outputFormat === "hex" &&
      Math.round(Number(color.alpha) * 255) / 255 !== Number(color.alpha)
      ? { ...settings, outputFormat: "rgb" }
      : settings,
  );
}

export function normalizeBrowserColorOutputs(
  tokens: BrowserToken[],
  settings: ColorOutputSettings,
  finalUiValues: ReadonlyMap<string, string>,
  opacityScaleIds: ReadonlySet<string> = new Set(),
  document?: ColorSystemDocument,
): BrowserToken[] {
  const opacityTokenIds = new Set(
    tokens
      .filter((token) => opacityScaleIds.has(token.groupId))
      .flatMap((token) => (token.rowId ? [token.id, token.rowId] : [token.id])),
  );
  return tokens.map((token) => {
    if (token.type !== "colors" || token.validationError) return token;
    const value =
      (!token.referenceId &&
      !token.literalShadows &&
      !token.lifecycle?.frozen &&
      !token.valueOverridden
        ? finalUiValues.get(token.sourceId ?? token.id)
        : undefined) ??
      serializeColor(
        new Color(String(token.value)),
        settings,
        opacityScaleIds.has(token.groupId) ||
          (!!token.referenceId && opacityTokenIds.has(token.referenceId)),
      );
    return {
      ...token,
      value,
      contrastWarning: document
        ? token.valueOverridden && token.colorSource
          ? assessColorOverrideContrast(value, token.colorSource, document)
          : undefined
        : token.contrastWarning,
    };
  });
}

export function assessColorOverrideContrast(
  value: string,
  source: ColorOverrideSource,
  document: ColorSystemDocument,
): ColorOverrideContrast | undefined {
  const scale = document.scales.find((scale) => scale.id === source.scaleId);
  const target = (scale?.customContrasts?.steps ?? document.contrasts).find(
    (contrast) => contrast.id === source.contrastId,
  );
  if (!scale || !target || isOpacityColorStop(target)) return undefined;
  const settings = document.settings.colorOutput;
  const background = outputColorCss(
    resolvedBackgroundLinear(document),
    settings,
  );
  const actualContrast = measureOutputContrast(
    value,
    background,
    outputGamut(settings),
  );
  if (actualContrast >= target.value) return undefined;
  return {
    colorName: source.name.colorName,
    scaleIndex: source.name.contrastValue,
    requestedContrast: target.value,
    actualContrast,
    background,
  };
}

export function overrideContrastMessage(
  warning: ColorOverrideContrast,
): string {
  return `Override value does not meet system defined contrast for ${warning.colorName} ${warning.scaleIndex} of ${warning.requestedContrast}:1`;
}

export function normalizeManualColorOutput(
  token: ResolvedToken,
  document: ColorSystemDocument,
): ResolvedToken {
  if (!token.valueOverridden) return token;
  const settings = document.settings.colorOutput;
  const parsed = new Color(token.value);
  const scale = document.scales.find(
    (scale) => scale.id === token.source.scaleId,
  );
  const target = (scale?.customContrasts?.steps ?? document.contrasts).find(
    (contrast) => contrast.id === token.source.contrastId,
  );
  const value = serializeColor(
    parsed,
    settings,
    !!target && isOpacityColorStop(target),
  );
  return {
    ...token,
    value,
    contrastWarning: assessColorOverrideContrast(
      value,
      { ...token.source, name: token.generated.name },
      document,
    ),
  };
}
