// Copyright 2026 Adobe. All rights reserved.
import type {
  GeneratedLineHeight,
  GeneratedTypographyToken,
  TypographyDocument,
  TypographyLineHeight,
} from "./model";
import { componentSizeIndex, TEXT_ZOOM_MAX, TEXT_ZOOM_MIN } from "./model";
import type { Rule } from "../logic/model";
import { RULE_DEFAULTS } from "../logic/defaults";
import { applyRoundingRule, resolveRule } from "../logic/evaluate";
import { generateScale, type ScaleSettings } from "../scales/generate";
import {
  resolveScaleType,
  SCALE_TYPE_DEFAULTS,
  scaleTypeIssues,
  type ScaleType,
} from "../scales/scaleType";
import {
  evaluateInterpolationMapping,
  type Interpolation,
} from "../scales/interpolationDefinition";
import {
  requireTypographyInterpolation,
  TYPOGRAPHY_INTERPOLATIONS,
} from "./lineHeightInterpolations";

export const TEXT_ZOOM_PARAMETER_ID = "typography.textZoom";
export const TYPE_SCALE_MIN_POSITION = -3;
export const TYPE_SCALE_MAX_POSITION = 14;
export const TEXT_ZOOM_STEP_RATIO = 1.125;

function typeScale(
  document: TypographyDocument,
  library: readonly ScaleType[],
) {
  const formula = resolveScaleType(library, document.scaleTypeId);
  if (formula.kind !== "type-scale")
    throw new Error("Typography requires the shared Type scale.");
  const issues = scaleTypeIssues(formula);
  if (issues.length) throw new Error(issues.join(" "));
  return formula;
}

export function adaptiveRatio(
  document: TypographyDocument,
  textZoom: number,
  scaleTypes: readonly ScaleType[] = SCALE_TYPE_DEFAULTS,
  interpolations: readonly Interpolation[] = TYPOGRAPHY_INTERPOLATIONS,
) {
  const formula = typeScale(document, scaleTypes);
  const adaptation = formula.textSizeAdaptation!;
  const interpolation = requireTypographyInterpolation(
    interpolations,
    adaptation.interpolationId,
  );
  const ratio = formula.parameters[0].default;
  const adapted = evaluateInterpolationMapping(
    interpolation,
    textZoom <= 0
      ? {
          interpolationId: interpolation.id,
          from: TEXT_ZOOM_MIN,
          to: 0,
          outputAtFrom: adaptation.ratioAtSmallest,
          outputAtTo: ratio,
        }
      : {
          interpolationId: interpolation.id,
          from: 0,
          to: TEXT_ZOOM_MAX,
          outputAtFrom: ratio,
          outputAtTo: adaptation.ratioAtLargest,
        },
    textZoom,
  );
  if (adapted <= 0)
    throw new Error("Choose an interpolation that keeps the ratio positive.");
  return adapted;
}

export function typographyScaleSettings(
  document: TypographyDocument,
  scaleTypes: readonly ScaleType[] = SCALE_TYPE_DEFAULTS,
  interpolations: readonly Interpolation[] = TYPOGRAPHY_INTERPOLATIONS,
  textZoom = document.textZoom,
  base?: number,
): ScaleSettings {
  const formula = typeScale(document, scaleTypes);
  return {
    scaleTypeId: formula.id,
    base:
      (base ?? formula.base.default) *
      Math.pow(
        TEXT_ZOOM_STEP_RATIO,
        componentSizeIndex(document.componentSize) + textZoom,
      ),
    below: document.smallSizes,
    above: document.largeSizes,
    parameters: {
      ratio: adaptiveRatio(document, textZoom, scaleTypes, interpolations),
    },
    roundingRuleId: document.textRoundingRuleId,
  };
}

export function generateLineHeight(
  card: TypographyLineHeight,
  fontSize: number,
  rules: readonly Rule[],
  roundingRuleId: string,
  interpolations: readonly Interpolation[],
): GeneratedLineHeight {
  const multiplier = card.isAdaptive
    ? evaluateInterpolationMapping(
        requireTypographyInterpolation(
          interpolations,
          card.adaptive.interpolationId,
        ),
        card.adaptive,
        fontSize,
      )
    : card.defaultValue;
  const length = applyRoundingRule(
    resolveRule(rules, roundingRuleId),
    fontSize * multiplier,
  );
  if (!Number.isFinite(length) || length <= 0)
    throw new Error("Line height must generate a positive finite length.");
  return { length, multiplier: length / fontSize };
}

export function generateTypography(
  document: TypographyDocument,
  textZoom = document.textZoom,
  rules: readonly Rule[] = RULE_DEFAULTS,
  scaleTypes: readonly ScaleType[] = SCALE_TYPE_DEFAULTS,
  interpolations: readonly Interpolation[] = TYPOGRAPHY_INTERPOLATIONS,
): GeneratedTypographyToken[] {
  const settings = typographyScaleSettings(
    document,
    scaleTypes,
    interpolations,
    textZoom,
  );
  const ratio = settings.parameters.ratio;
  const sizes = generateScale(settings, { rules, scaleTypes });
  const icons =
    document.iconography.alignment === "text"
      ? generateScale(
          typographyScaleSettings(
            document,
            scaleTypes,
            interpolations,
            textZoom,
            document.iconography.baseSize,
          ),
          { rules, scaleTypes },
        )
      : null;
  const constrain = (value: number) =>
    Math.min(document.maxTextSize, Math.max(document.minTextSize, value));
  return sizes.map(({ index: position, step: scale, value }, index) => {
    const fontSize = constrain(value);
    const lineHeights = Object.fromEntries(
      document.lineHeights.map((card) => [
        card.id,
        generateLineHeight(
          card,
          fontSize,
          rules,
          document.lineHeightRoundingRuleId,
          interpolations,
        ),
      ]),
    );
    const iconography = document.iconography;
    const alignedCard =
      iconography.alignment === "line-height"
        ? document.lineHeights.find(
            (card) => card.id === iconography.lineHeightId,
          )
        : undefined;
    const iconSize = icons
      ? constrain(icons[index].value)
      : alignedCard
        ? generateLineHeight(
            alignedCard,
            fontSize,
            rules,
            document.lineHeightRoundingRuleId,
            interpolations,
          ).length
        : (() => {
            throw new Error("Choose an available icon line height.");
          })();
    return {
      name: `font-size-${scale}`,
      position,
      scale,
      fontSize,
      lineHeights,
      iconSize,
      ratio,
      textZoom,
    };
  });
}

export function validateTypographyGeneration(
  document: TypographyDocument,
  rules: readonly Rule[],
  scaleTypes: readonly ScaleType[],
  interpolations: readonly Interpolation[],
) {
  for (let textZoom = TEXT_ZOOM_MIN; textZoom <= TEXT_ZOOM_MAX; textZoom++) {
    generateTypography(document, textZoom, rules, scaleTypes, interpolations);
  }
}
