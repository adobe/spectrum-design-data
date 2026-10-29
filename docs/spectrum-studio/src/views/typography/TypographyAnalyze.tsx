// Copyright 2026 Adobe. All rights reserved.
import { useAtomValue } from "jotai";
import { useMemo } from "react";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { typographyDocumentAtom } from "../../features/typography/state";
import { taxonomyDocumentAtom } from "../../features/taxonomy/state";
import { modeSetsAtom } from "../../features/modes/state";
import { rulesAtom } from "../../features/logic/library";
import {
  interpolationsAtom,
  scaleTypesAtom,
} from "../../features/logic/scaleTypeLibrary";
import { buildTypographyComparisons } from "../../features/typography/comparisons";
import { FoundationsElementsHeader } from "../FoundationsElementsHeader";
import { TypographyComparisonView } from "./TypographyComparisonView";

const containerStyle = style({
  display: "flex",
  flexDirection: "column",
  gap: 20,
  padding: 16,
  minHeight: "full",
  overflow: "auto",
});

export function TypographyAnalyze() {
  const document = useAtomValue(typographyDocumentAtom);
  const registry = useAtomValue(taxonomyDocumentAtom);
  const modeSets = useAtomValue(modeSetsAtom);
  const rules = useAtomValue(rulesAtom);
  const scaleTypes = useAtomValue(scaleTypesAtom);
  const interpolations = useAtomValue(interpolationsAtom);
  const result = useMemo(() => {
    try {
      return {
        datasets: buildTypographyComparisons(document, modeSets, registry, {
          rules,
          scaleTypes,
          interpolations,
        }),
      };
    } catch (error) {
      if (!(error instanceof Error)) throw error;
      return { error: error.message };
    }
  }, [document, modeSets, registry, rules, scaleTypes, interpolations]);
  return (
    <div data-component="TypographyAnalyze" className={containerStyle}>
      <FoundationsElementsHeader title="Typography" />
      <TypographyComparisonView
        {...result}
        initialLineHeightId={`${document.previewLineHeightId}-lineHeight`}
      />
    </div>
  );
}
