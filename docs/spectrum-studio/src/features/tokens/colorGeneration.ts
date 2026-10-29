// Copyright 2026 Adobe. All rights reserved.
import { foundationNameSegment } from "../taxonomy/formatting";
import { isFoundationPublished } from "../foundations/types";
import type {
  ColorScale,
  ColorSystemDocument,
  ContrastToken,
  OutputGamut,
} from "../color-system/model";
import {
  generateColors,
  type DynamicGenerationSettings,
} from "../color-system/dynamicGeneration";
import { buildScaleData } from "../color-system/scaleGeneration";
import type { LinearRgb } from "../color-system/colorMath";
import {
  PALETTE_SCALE_ID,
  type GeneratedToken,
  tokenStableKey,
  tokenUuid,
} from "./model";
import { contrastStepIndex } from "../color-system/contrastSteps";
import type { Rule } from "../logic/model";
import { ColorOutputError } from "../color-system/outputContrast";
import { dataVisMemberId } from "../color-system/data-vis/identity";

export function colorSourceTokenIds(document: ColorSystemDocument): string[] {
  return [
    ...document.palette.map((color) =>
      tokenUuid(tokenStableKey(PALETTE_SCALE_ID, color.id)),
    ),
    ...document.scales
      .filter(isFoundationPublished)
      .flatMap((scale) =>
        (scale.customContrasts?.steps ?? document.contrasts).map((contrast) =>
          tokenUuid(tokenStableKey(scale.id, contrast.id)),
        ),
      ),
    ...document.dataVisScales
      .filter(isFoundationPublished)
      .flatMap((scale) =>
        scale.kind === "categorical"
          ? scale.members.map((member) => dataVisMemberId(scale.id, member.id))
          : [],
      ),
  ];
}

export type ColorTokenOutcome =
  | { status: "ready"; token: GeneratedToken }
  | {
      status: "blocked";
      token: Omit<GeneratedToken, "value">;
      error: ColorOutputError;
    };

export type ColorTokenOutcomeReuse = (
  input: readonly [
    ColorScale,
    ContrastToken[],
    LinearRgb,
    DynamicGenerationSettings,
    OutputGamut,
    readonly Rule[],
  ],
  generate: () => ColorTokenOutcome[],
) => ColorTokenOutcome[];

export function generateScaleColorTokens(
  scale: ColorScale,
  contrasts: ContrastToken[],
  background: LinearRgb,
  settings: DynamicGenerationSettings,
  outputGamut: OutputGamut,
  rules: readonly Rule[],
): GeneratedToken[] {
  return generateScaleColorTokenOutcomes(
    scale,
    contrasts,
    background,
    settings,
    outputGamut,
    rules,
  ).map((outcome) => {
    if (outcome.status === "blocked") throw outcome.error;
    return outcome.token;
  });
}

export function generateScaleColorTokenOutcomes(
  scale: ColorScale,
  contrasts: ContrastToken[],
  background: LinearRgb,
  settings: DynamicGenerationSettings,
  outputGamut: OutputGamut,
  rules: readonly Rule[],
  reuse?: ColorTokenOutcomeReuse,
): ColorTokenOutcome[] {
  if (!isFoundationPublished(scale)) return [];
  if (reuse)
    return reuse(
      [scale, contrasts, background, settings, outputGamut, rules],
      () =>
        generateScaleColorTokenOutcomes(
          scale,
          contrasts,
          background,
          settings,
          outputGamut,
          rules,
        ),
    );
  const scaleData = buildScaleData(scale, outputGamut);
  const colorName = foundationNameSegment(scale.name);
  return (scale.customContrasts?.steps ?? contrasts).map(
    (contrast, index): ColorTokenOutcome => {
      const token: Omit<GeneratedToken, "value"> = {
        uuid: tokenUuid(tokenStableKey(scale.id, contrast.id)),
        name: {
          colorName,
          contrastValue: String(contrastStepIndex(index, scale, rules)),
        },
        source: {
          tokenType: "color",
          scaleId: scale.id,
          contrastId: contrast.id,
        },
      };
      try {
        return {
          status: "ready",
          token: {
            ...token,
            value: generateColors(
              scaleData,
              background,
              contrast.value,
              settings,
            ).dynamic.css,
          },
        };
      } catch (error) {
        if (!(error instanceof ColorOutputError)) throw error;
        return { status: "blocked", token, error };
      }
    },
  );
}
