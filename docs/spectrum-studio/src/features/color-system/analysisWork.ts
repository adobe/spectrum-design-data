// Copyright 2026 Adobe. All rights reserved.
import {
  buildAnalysisScale,
  buildOutputProfile,
  repairReference,
} from "./analysis";
import type { ColorSystemDocument, ContrastToken } from "./model";
import type { Rule } from "../logic/model";

export interface ColorAnalysisInput {
  document: ColorSystemDocument;
  authoredContrasts: readonly ContrastToken[];
  authoredScaleContrasts?: Readonly<Record<string, readonly ContrastToken[]>>;
  rules?: readonly Rule[];
  referenceScaleId: string | null;
  selectedScaleId?: string | null;
  surfaceId: string | null;
  includeOutput: boolean;
}

export function computeColorAnalysis(input: ColorAnalysisInput) {
  const { document } = input;
  const scales = document.scales.map((scale) =>
    buildAnalysisScale(scale, document.settings.colorOutput),
  );
  const reference = repairReference(
    document.scales,
    input.referenceScaleId,
    input.selectedScaleId,
  );
  const surface = repairReference(
    document.surfaces,
    input.surfaceId,
    document.surfaces.find((item) => item.base)?.id,
  );
  let output: {
    profile?: ReturnType<typeof buildOutputProfile>;
    error?: string;
    referenceId?: string;
    surfaceId?: string;
  } = {};
  if (input.includeOutput && reference && surface) {
    output = { referenceId: reference.id, surfaceId: surface.id };
    try {
      output = {
        ...output,
        profile: buildOutputProfile(
          document,
          reference,
          surface,
          input.authoredScaleContrasts?.[reference.id] ??
            input.authoredContrasts,
          input.rules,
        ),
      };
    } catch (failure) {
      output.error =
        failure instanceof Error ? failure.message : String(failure);
    }
  }
  return { scales, output };
}
export type ColorAnalysisOutput = ReturnType<typeof computeColorAnalysis>;
