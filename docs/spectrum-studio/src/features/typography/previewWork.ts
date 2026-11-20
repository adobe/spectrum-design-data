// Copyright 2026 Adobe. All rights reserved.
import type { TypographyDocument } from "./model";
import type { IconsDocument } from "../icons/model";
import type { Rule } from "../logic/model";
import type { ScaleType } from "../scales/scaleType";
import type { Interpolation } from "../scales/interpolationDefinition";
import type { TaxonomyDocument } from "../taxonomy/model";
import { generateTypography } from "./typographyGeneration";
import { buildTypographyPreviewCss } from "./typographyCss";

export const TYPOGRAPHY_PREVIEW_SCOPE = ".typographyRampPreview";

export interface TypographyPreviewInput {
  document: TypographyDocument;
  resolved: TypographyDocument;
  rules: Rule[];
  scaleTypes: ScaleType[];
  interpolations: Interpolation[];
  registry: TaxonomyDocument;
  icons: IconsDocument;
}

export function computeTypographyPreview(input: TypographyPreviewInput) {
  const tokens = generateTypography(
    input.resolved,
    undefined,
    input.rules,
    input.scaleTypes,
    input.interpolations,
    input.icons,
  );
  return {
    tokens,
    css: buildTypographyPreviewCss(
      input.resolved,
      tokens,
      TYPOGRAPHY_PREVIEW_SCOPE,
      input.registry,
    ),
  };
}

export type TypographyPreviewOutput = ReturnType<
  typeof computeTypographyPreview
>;
