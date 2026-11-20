// Copyright 2026 Adobe. All rights reserved.
import type { ModeSet } from "../modes/model";
import type { TypographyPreviewInput } from "./previewWork";
import { buildTypographyComparisons } from "./comparisons";

export interface TypographyAnalysisInput extends Omit<
  TypographyPreviewInput,
  "resolved"
> {
  modeSets: ModeSet[];
  preview?: Pick<TypographyPreviewInput["document"], "textSize" | "textZoom">;
}

export function computeTypographyAnalysis(input: TypographyAnalysisInput) {
  return buildTypographyComparisons(
    input.document,
    input.modeSets,
    input.registry,
    input,
    input.preview,
  );
}

export type TypographyAnalysisOutput = ReturnType<
  typeof computeTypographyAnalysis
>;
