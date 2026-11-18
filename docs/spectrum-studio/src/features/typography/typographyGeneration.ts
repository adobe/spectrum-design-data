// Copyright 2026 Adobe. All rights reserved.
import type { GeneratedTypographyToken, TypographyDocument } from "./model";
import { TEXT_ZOOM_MAX, TEXT_ZOOM_MIN } from "./model";
import type { Rule } from "../logic/model";
import { RULE_DEFAULTS } from "../logic/defaults";
import { SCALE_TYPE_DEFAULTS, type ScaleType } from "../scales/scaleType";
import type { Interpolation } from "../scales/interpolationDefinition";
import { TYPOGRAPHY_INTERPOLATIONS } from "./lineHeightInterpolations";
import { generateLineHeight, typographyFontSizes } from "./typeScale";
import type { IconsDocument } from "../icons/model";
import { validateIconsGeneration, workflowIconSizes } from "../icons/generate";
import { ICONS_DEFAULTS } from "../icons/defaults";

export {
  adaptiveRatio,
  generateLineHeight,
  TEXT_ZOOM_PARAMETER_ID,
  TEXT_ZOOM_STEP_RATIO,
  TYPE_SCALE_MAX_POSITION,
  TYPE_SCALE_MIN_POSITION,
  typographyFontSizes,
  typographyScaleSettings,
} from "./typeScale";

/** Icons own the workflow icon sizes; Typography publishes them beside each type step. */
export function generateTypography(
  document: TypographyDocument,
  textZoom = document.textZoom,
  rules: readonly Rule[] = RULE_DEFAULTS,
  scaleTypes: readonly ScaleType[] = SCALE_TYPE_DEFAULTS,
  interpolations: readonly Interpolation[] = TYPOGRAPHY_INTERPOLATIONS,
  icons: IconsDocument = ICONS_DEFAULTS,
): GeneratedTypographyToken[] {
  const { settings, sizes } = typographyFontSizes(
    document,
    textZoom,
    rules,
    scaleTypes,
    interpolations,
  );
  const ratio = settings.parameters.ratio;
  const iconSizes = workflowIconSizes(icons, document, textZoom, {
    rules,
    scaleTypes,
    interpolations,
  });
  return sizes.map(
    ({ index: position, step: scale, value: fontSize }, index) => ({
      name: `font-size-${scale}`,
      position,
      scale,
      fontSize,
      lineHeights: Object.fromEntries(
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
      ),
      iconSize: iconSizes[index],
      ratio,
      textZoom,
    }),
  );
}

export function validateTypographyGeneration(
  document: TypographyDocument,
  rules: readonly Rule[],
  scaleTypes: readonly ScaleType[],
  interpolations: readonly Interpolation[],
  icons: IconsDocument = ICONS_DEFAULTS,
) {
  for (let textZoom = TEXT_ZOOM_MIN; textZoom <= TEXT_ZOOM_MAX; textZoom++) {
    generateTypography(
      document,
      textZoom,
      rules,
      scaleTypes,
      interpolations,
      icons,
    );
  }
  validateIconsGeneration(icons, document, {
    rules,
    scaleTypes,
    interpolations,
  });
}
