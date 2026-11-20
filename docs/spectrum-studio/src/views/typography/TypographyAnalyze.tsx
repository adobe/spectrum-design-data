// Copyright 2026 Adobe. All rights reserved.
import { atom, useAtomValue } from "jotai";
import {
  typographyPreviewSourceAtom,
  previewTaxonomyAtom,
  previewModeSetsAtom,
  previewIconsAtom,
  previewRulesAtom,
  previewInterpolationsAtom,
  previewScaleTypesAtom,
  liveTypographyDocumentAtom,
} from "../../features/edit-session/previewSources";
import type {
  TypographyAnalysisInput,
  TypographyAnalysisOutput,
} from "../../features/typography/analysisWork";
import { usePreviewWorker } from "../../features/derived-work/usePreviewWorker";
import { DerivedContentBoundary } from "../../components/DerivedContentBoundary";
import { AnalyzePage } from "../analyze/AnalyzeLayout";
import { TypographyComparisonView } from "./TypographyComparisonView";

const createAnalysisWorker = () =>
  new Worker(
    new URL("../../features/typography/analysis.worker.ts", import.meta.url),
    { type: "module" },
  );
const analysisInputAtom = atom(
  (get): TypographyAnalysisInput => ({
    document: get(typographyPreviewSourceAtom),
    registry: get(previewTaxonomyAtom),
    modeSets: get(previewModeSetsAtom),
    rules: get(previewRulesAtom),
    scaleTypes: get(previewScaleTypesAtom),
    interpolations: get(previewInterpolationsAtom),
    icons: get(previewIconsAtom),
    preview: get(liveTypographyDocumentAtom),
  }),
);

export function TypographyAnalyze() {
  const input = useAtomValue(analysisInputAtom);
  const result = usePreviewWorker<
    TypographyAnalysisInput,
    TypographyAnalysisOutput
  >(input, createAnalysisWorker);
  return (
    <AnalyzePage component="TypographyAnalyze" title="Typography">
      <DerivedContentBoundary
        state={result.status}
        label="Updating typography analysis"
        error={result.error}
        onRetry={result.retry}
      >
        {result.ready && (
          <TypographyComparisonView
            datasets={result.ready.value}
            initialLineHeightId={`${result.ready.input.document.previewLineHeightId}-lineHeight`}
          />
        )}
      </DerivedContentBoundary>
    </AnalyzePage>
  );
}
