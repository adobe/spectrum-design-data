// Copyright 2026 Adobe. All rights reserved.
import Color from "colorjs.io";
import type { ResolvedToken } from "./model";
import type { ColorSystemDocument } from "../color-system/model";
import {
  ColorOutputError,
  measureOutputContrast,
} from "../color-system/outputContrast";
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
): BrowserToken[] {
  const opacityTokenIds = new Set(
    tokens
      .filter((token) => opacityScaleIds.has(token.groupId))
      .flatMap((token) => (token.rowId ? [token.id, token.rowId] : [token.id])),
  );
  return tokens.map((token) =>
    token.type === "colors" && !token.validationError
      ? {
          ...token,
          value:
            (!token.referenceId &&
            !token.literalShadows &&
            !token.lifecycle?.frozen &&
            !token.valueOverridden
              ? finalUiValues.get(token.id)
              : undefined) ??
            serializeColor(
              new Color(String(token.value)),
              settings,
              opacityScaleIds.has(token.groupId) ||
                (!!token.referenceId && opacityTokenIds.has(token.referenceId)),
            ),
        }
      : token,
  );
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
  if (scale && target && !isOpacityColorStop(target)) {
    const background = outputColorCss(
      resolvedBackgroundLinear(document),
      settings,
    );
    const actual = measureOutputContrast(
      value,
      background,
      outputGamut(settings),
    );
    if (actual < target.value)
      throw new ColorOutputError({
        requestedContrast: target.value,
        achievableContrast: actual,
        gamut: outputGamut(settings),
        background,
        source: `Manual color ${token.uuid}`,
        observedColor: value,
        tokenId: token.uuid,
      });
  }
  return { ...token, value };
}
