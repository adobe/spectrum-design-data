// Copyright 2026 Adobe. All rights reserved.
import { useAtomValue } from "jotai";
import { useMemo } from "react";
import { typographyDocumentAtom } from "../../features/typography/state";
import { taxonomyDocumentAtom } from "../../features/taxonomy/state";
import { modeSetsAtom } from "../../features/modes/state";
import { iconsDocumentAtom } from "../../features/icons/documentState";
import { rulesAtom } from "../../features/logic/library";
import {
  interpolationsAtom,
  scaleTypesAtom,
} from "../../features/logic/scaleTypeLibrary";
import { buildTypographyComparisons } from "../../features/typography/comparisons";
import { AnalyzePage } from "../analyze/AnalyzeLayout";
import { TypographyComparisonView } from "./TypographyComparisonView";

export function TypographyAnalyze() {
  const document = useAtomValue(typographyDocumentAtom);
  const registry = useAtomValue(taxonomyDocumentAtom);
  const modeSets = useAtomValue(modeSetsAtom);
  const rules = useAtomValue(rulesAtom);
  const scaleTypes = useAtomValue(scaleTypesAtom);
  const interpolations = useAtomValue(interpolationsAtom);
  const icons = useAtomValue(iconsDocumentAtom);
  const result = useMemo(() => {
    try {
      return {
        datasets: buildTypographyComparisons(document, modeSets, registry, {
          rules,
          scaleTypes,
          interpolations,
          icons,
        }),
      };
    } catch (error) {
      if (!(error instanceof Error)) throw error;
      return { error: error.message };
    }
  }, [document, modeSets, registry, rules, scaleTypes, interpolations, icons]);
  return (
    <AnalyzePage component="TypographyAnalyze" title="Typography">
      <TypographyComparisonView
        {...result}
        initialLineHeightId={`${document.previewLineHeightId}-lineHeight`}
      />
    </AnalyzePage>
  );
}
