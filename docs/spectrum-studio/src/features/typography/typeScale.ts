// Copyright 2026 Adobe. All rights reserved.
import type {
  GeneratedLineHeight,
  TypographyDocument,
  TypographyLineHeight,
} from "./model";
import { componentSizeIndex, TEXT_ZOOM_MAX, TEXT_ZOOM_MIN } from "./model";
import type { Rule } from "../logic/model";
import { applyRoundingRule, resolveRule } from "../logic/evaluate";
import {
  generateScale,
  type GeneratedScaleValue,
  type ScaleSettings,
} from "../scales/generate";
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
import { RULE_DEFAULTS } from "../logic/defaults";

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

/** Multiplier that component size and text zoom apply to every type-scale-relative length. */
export function textZoomMultiplier(
  document: Pick<TypographyDocument, "componentSize">,
  textZoom: number,
) {
  return Math.pow(
    TEXT_ZOOM_STEP_RATIO,
    componentSizeIndex(document.componentSize) + textZoom,
  );
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
      document.textSize *
      textZoomMultiplier(document, textZoom),
    below: document.smallSizes,
    above: document.largeSizes,
    parameters: {
      ratio: adaptiveRatio(document, textZoom, scaleTypes, interpolations),
    },
    roundingRuleId: document.textRoundingRuleId,
  };
}

/** Font size of every type step, rounded and kept within the minimum and maximum text size. */
export function typographyFontSizes(
  document: TypographyDocument,
  textZoom = document.textZoom,
  rules: readonly Rule[] = RULE_DEFAULTS,
  scaleTypes: readonly ScaleType[] = SCALE_TYPE_DEFAULTS,
  interpolations: readonly Interpolation[] = TYPOGRAPHY_INTERPOLATIONS,
): { settings: ScaleSettings; sizes: GeneratedScaleValue[] } {
  const settings = typographyScaleSettings(
    document,
    scaleTypes,
    interpolations,
    textZoom,
  );
  const sizes = generateScale(settings, {
    rules,
    scaleTypes,
    valueType: "font-size",
  }).map((size) => ({
    ...size,
    value: Math.min(
      document.maxTextSize,
      Math.max(document.minTextSize, size.value),
    ),
  }));
  return { settings, sizes };
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
    "line-height",
  );
  if (!Number.isFinite(length) || length <= 0)
    throw new Error("Line height must generate a positive finite length.");
  return { length, multiplier: length / fontSize };
}
