// Copyright 2026 Adobe. All rights reserved.
import { useAtomValue, type Atom } from "jotai";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import type {
  DimensionDocument,
  DimensionScale,
  GeneratedDimensionValue,
} from "../../features/scales/foundation";
import { rulesAtom } from "../../features/logic/library";
import { scaleTypesAtom } from "../../features/logic/scaleTypeLibrary";
import { foundationDocumentsAtom } from "../../features/modes/foundationDocuments";
import { modeParameterValuesAtom } from "../../features/modes/parameterValues";
import { modeSetsAtom } from "../../features/modes/state";
import { FoundationsElementsHeader } from "../FoundationsElementsHeader";
import { DimensionScaleComparison } from "./DimensionScaleComparison";
import "../chartLayout.css";
import type { DimensionValuePolicy } from "../../features/scales/issues";

const containerStyle = style({
  display: "flex",
  flexDirection: "column",
  gap: 20,
  padding: 16,
  minHeight: "full",
  overflow: "auto",
  minWidth: 0,
});
const gridStyle = style({
  display: "grid",
  gap: 16,
  minWidth: 0,
  alignItems: "start",
});

export interface DimensionAnalyzeProps {
  /** Heading and lowercase noun, such as `Spacing` and `spacing`. */
  title: string;
  noun: "spacing" | "size" | "radius";
  generatedAtom: Atom<
    { scale: DimensionScale; values: GeneratedDimensionValue[] }[]
  >;
  documentAtom: Atom<DimensionDocument>;
  valuePolicy?: DimensionValuePolicy;
}

export function DimensionAnalyze({
  title,
  noun,
  generatedAtom,
  documentAtom,
  valuePolicy,
}: DimensionAnalyzeProps) {
  const scales = useAtomValue(generatedAtom);
  const document = useAtomValue(documentAtom);
  const libraryRules = useAtomValue(rulesAtom);
  const rules = document.pendingRules
    ? [...libraryRules, ...document.pendingRules]
    : libraryRules;
  const scaleTypes = useAtomValue(scaleTypesAtom);
  const documents = useAtomValue(foundationDocumentsAtom);
  const current = useAtomValue(modeParameterValuesAtom);
  const modeSets = useAtomValue(modeSetsAtom);
  return (
    <div
      className={`${containerStyle} chartComparisonContainer`}
      data-component={`${title}Analyze`}
    >
      <FoundationsElementsHeader title={title} />
      <div
        className={`${gridStyle} ${scales.length > 1 ? "chartComparisonGrid" : "chartSingleGrid"}`}
        data-chart-grid
      >
        {scales.map(({ scale, values }) => (
          <DimensionScaleComparison
            key={scale.id}
            noun={noun}
            input={{
              valueType: noun,
              scale,
              values,
              rules,
              scaleTypes,
              documents,
              current,
              modeSets,
              valuePolicy,
            }}
          />
        ))}
      </div>
    </div>
  );
}
