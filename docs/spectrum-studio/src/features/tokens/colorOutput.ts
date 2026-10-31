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

export function normalizeBrowserColorOutputs(
  tokens: BrowserToken[],
  settings: ColorOutputSettings,
  finalUiValues: ReadonlyMap<string, string>,
): BrowserToken[] {
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
            serializeOutputColor(new Color(String(token.value)), settings),
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
  const value = serializeOutputColor(new Color(token.value), settings);
  const scale = document.scales.find(
    (scale) => scale.id === token.source.scaleId,
  );
  const target = (scale?.customContrasts?.steps ?? document.contrasts).find(
    (contrast) => contrast.id === token.source.contrastId,
  );
  if (scale && target) {
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
