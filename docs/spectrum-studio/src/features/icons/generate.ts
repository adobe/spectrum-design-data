// Copyright 2026 Adobe. All rights reserved.
import type { Rule } from "../logic/model";
import { RULE_DEFAULTS } from "../logic/defaults";
import { generateScale, type GeneratedScaleValue } from "../scales/generate";
import type { Interpolation } from "../scales/interpolationDefinition";
import { SCALE_TYPE_DEFAULTS, type ScaleType } from "../scales/scaleType";
import { TYPOGRAPHY_INTERPOLATIONS } from "../typography/lineHeightInterpolations";
import type { TypographyDocument } from "../typography/model";
import { TEXT_ZOOM_MAX, TEXT_ZOOM_MIN } from "../typography/model";
import {
  generateLineHeight,
  TEXT_ZOOM_PARAMETER_ID,
  textZoomMultiplier,
  typographyFontSizes,
  typographyScaleSettings,
} from "../typography/typeScale";
import {
  WORKFLOW_ICON_SCALE_ID,
  type GeneratedIconValue,
  type IconScale,
  type IconsDocument,
} from "./model";

export interface IconGenerationLibrary {
  rules?: readonly Rule[];
  scaleTypes?: readonly ScaleType[];
  interpolations?: readonly Interpolation[];
}

export const MISSING_ICON_LINE_HEIGHT = "Choose an available icon line height.";

/** Workflow publishes one token per type step, and Line height reads one value per type step, so both use Typography's steps. */
export function iconScaleFollowsTypeSteps(scale: IconScale) {
  return scale.id === WORKFLOW_ICON_SCALE_ID || scale.source === "line-height";
}

export function iconScaleRange(
  scale: IconScale,
  typography: Pick<TypographyDocument, "smallSizes" | "largeSizes">,
) {
  return iconScaleFollowsTypeSteps(scale)
    ? { below: typography.smallSizes, above: typography.largeSizes }
    : { below: scale.below, above: scale.above };
}

function rawIconScale(
  icons: IconsDocument,
  scale: IconScale,
  typography: TypographyDocument,
  textZoom: number,
  rules: readonly Rule[],
  scaleTypes: readonly ScaleType[],
  interpolations: readonly Interpolation[],
): GeneratedScaleValue[] {
  const range = iconScaleRange(scale, typography);
  if (scale.source === "line-height") {
    const card = typography.lineHeights.find(
      (candidate) => candidate.id === scale.lineHeightId,
    );
    const { sizes } = typographyFontSizes(
      typography,
      textZoom,
      rules,
      scaleTypes,
      interpolations,
    );
    return sizes.map((size) => {
      const length = card
        ? generateLineHeight(
            card,
            size.value,
            rules,
            typography.lineHeightRoundingRuleId,
            interpolations,
          ).length
        : Number.NaN;
      return { ...size, raw: length, factor: 1, value: length };
    });
  }
  const library = {
    rules,
    scaleTypes,
    valueType: "workflow-icon-size" as const,
  };
  if (scale.source === "follow-typography")
    return generateScale(
      {
        ...typographyScaleSettings(
          typography,
          scaleTypes,
          interpolations,
          textZoom,
          scale.base,
        ),
        ...range,
        startStep: scale.startStep,
        roundingRuleId: icons.roundingRuleId,
      },
      library,
    );
  return generateScale(
    { ...scale, ...range, roundingRuleId: icons.roundingRuleId },
    {
      ...library,
      rawValueMultiplier: textZoomMultiplier(typography, textZoom),
    },
    { [TEXT_ZOOM_PARAMETER_ID]: textZoom },
  );
}

/** Single generation path for icon sizes: Elements, Analysis, tokens and change tracking all call this. */
export function generateIconScale(
  icons: IconsDocument,
  scale: IconScale,
  typography: TypographyDocument,
  textZoom = typography.textZoom,
  {
    rules = RULE_DEFAULTS,
    scaleTypes = SCALE_TYPE_DEFAULTS,
    interpolations = TYPOGRAPHY_INTERPOLATIONS,
  }: IconGenerationLibrary = {},
): GeneratedIconValue[] {
  return rawIconScale(
    icons,
    scale,
    typography,
    textZoom,
    rules,
    scaleTypes,
    interpolations,
  ).map(({ index, step, raw, value }) => ({
    scaleId: scale.id,
    index,
    step,
    raw,
    value: Math.min(icons.maxIconSize, Math.max(icons.minIconSize, value)),
  }));
}

export function workflowIconScale(icons: IconsDocument) {
  const scale = icons.scales.find(
    (candidate) => candidate.id === WORKFLOW_ICON_SCALE_ID,
  );
  if (!scale) throw new Error("Icons needs its Workflow scale.");
  return scale;
}

/** Workflow icon size for each Typography type step, in type step order. */
export function workflowIconSizes(
  icons: IconsDocument,
  typography: TypographyDocument,
  textZoom = typography.textZoom,
  library: IconGenerationLibrary = {},
): number[] {
  const values = generateIconScale(
    icons,
    workflowIconScale(icons),
    typography,
    textZoom,
    library,
  ).map((value) => value.value);
  if (values.some((value) => !Number.isFinite(value)))
    throw new Error(MISSING_ICON_LINE_HEIGHT);
  return values;
}

/** Problems that would stop icon sizes from generating at any text zoom. */
export function iconsGenerationIssues(
  icons: IconsDocument,
  typography: TypographyDocument,
  library: IconGenerationLibrary = {},
): string[] {
  const issues = new Set<string>();
  for (const scale of icons.scales) {
    if (
      scale.source === "line-height" &&
      !typography.lineHeights.some((card) => card.id === scale.lineHeightId)
    ) {
      issues.add(`${scale.name}: ${MISSING_ICON_LINE_HEIGHT}`);
      continue;
    }
    for (let textZoom = TEXT_ZOOM_MIN; textZoom <= TEXT_ZOOM_MAX; textZoom++) {
      try {
        const values = generateIconScale(
          icons,
          scale,
          typography,
          textZoom,
          library,
        );
        if (values.some((value) => !Number.isFinite(value.value))) {
          issues.add(`${scale.name}: Some icon sizes could not be calculated.`);
          break;
        }
      } catch (failure) {
        issues.add(
          `${scale.name}: ${failure instanceof Error ? failure.message : String(failure)}`,
        );
        break;
      }
    }
  }
  return [...issues];
}

export function validateIconsGeneration(
  icons: IconsDocument,
  typography: TypographyDocument,
  library: IconGenerationLibrary = {},
) {
  const issues = iconsGenerationIssues(icons, typography, library);
  if (issues.length) throw new Error(issues.join(" "));
}
