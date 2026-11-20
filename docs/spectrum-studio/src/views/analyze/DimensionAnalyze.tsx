// Copyright 2026 Adobe. All rights reserved.
import { Picker, PickerItem } from "@react-spectrum/s2";
import { useAtomValue, type Atom } from "jotai";
import { useMemo, useState } from "react";
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
import { dimensionComparisonParameters } from "../../features/scales/dimensionComparisons";
import {
  AnalyzeCardGrid,
  AnalyzePage,
  AnalyzeSettings,
  usePreviewData,
} from "./AnalyzeLayout";
import { DimensionScaleComparison } from "./DimensionScaleComparison";
import type { DimensionValuePolicy } from "../../features/scales/issues";
import { useNumericRuntime } from "../../features/edit-session/numericContext";
import { useEditorPreview } from "../../features/edit-session/useEditorPreview";
import type { EditorPreviewOutput } from "../../features/edit-session/editorPreviewWork";
import { DerivedContentBoundary } from "../../components/DerivedContentBoundary";

/** Scale picker key that shows every scale's overview chart. */
export const ALL_DIMENSION_SCALES = "all";

export interface DimensionAnalyzeProps {
  /** Heading and lowercase noun, such as `Spacing` and `spacing`. */
  title: string;
  noun: "spacing" | "size" | "radius";
  generatedAtom: Atom<
    { scale: DimensionScale; values: GeneratedDimensionValue[] }[]
  >;
  documentAtom: Atom<DimensionDocument>;
  valuePolicy?: DimensionValuePolicy;
  /** A scale id, or `all` for every scale's overview chart. */
  initialScaleId?: string;
}

type DimensionData = Extract<EditorPreviewOutput, { kind: "dimension" }>;

export function DimensionAnalyze(props: DimensionAnalyzeProps) {
  return useNumericRuntime() ? (
    <LiveDimensionAnalyze {...props} />
  ) : (
    <AcceptedDimensionAnalyze {...props} />
  );
}

function LiveDimensionAnalyze(props: DimensionAnalyzeProps) {
  const result = useEditorPreview(props.noun, null);
  return (
    <DerivedContentBoundary
      state={result.status}
      label={`Updating ${props.noun} analysis`}
      error={result.error}
      onRetry={result.retry}
    >
      {result.ready?.value.kind === "dimension" && (
        <DimensionAnalyzeContent {...props} data={result.ready.value} />
      )}
    </DerivedContentBoundary>
  );
}

function AcceptedDimensionAnalyze(props: DimensionAnalyzeProps) {
  const scales = useAtomValue(props.generatedAtom);
  const document = useAtomValue(props.documentAtom);
  const rules = useAtomValue(rulesAtom);
  const scaleTypes = useAtomValue(scaleTypesAtom);
  const documents = useAtomValue(foundationDocumentsAtom);
  const current = useAtomValue(modeParameterValuesAtom);
  const modeSets = useAtomValue(modeSetsAtom);
  return (
    <DimensionAnalyzeContent
      {...props}
      data={{
        kind: "dimension",
        scales,
        document,
        rules,
        scaleTypes,
        documents,
        current,
        modeSets,
      }}
    />
  );
}

function DimensionAnalyzeContent({
  title,
  noun,
  data,
  valuePolicy,
  initialScaleId = ALL_DIMENSION_SCALES,
}: DimensionAnalyzeProps & { data: DimensionData }) {
  const {
    scales,
    document,
    rules: libraryRules,
    scaleTypes,
    documents,
    current,
    modeSets,
  } = data;
  const rules = document.pendingRules
    ? [...libraryRules, ...document.pendingRules]
    : libraryRules;
  const [chosenScaleId, setChosenScaleId] = useState(initialScaleId);
  const drivers = useMemo(
    () =>
      scales.flatMap(({ scale }) => {
        try {
          return dimensionComparisonParameters(scale, scaleTypes);
        } catch {
          return [];
        }
      }),
    [scales, scaleTypes],
  );
  const previewData = usePreviewData(drivers);
  const detail = scales.find(({ scale }) => scale.id === chosenScaleId);
  const inputFor = ({
    scale,
    values,
  }: {
    scale: DimensionScale;
    values: GeneratedDimensionValue[];
  }) => ({
    valueType: noun,
    scale,
    values,
    rules,
    scaleTypes,
    documents,
    current,
    modeSets,
    valuePolicy,
  });
  const scalePicker = scales.length > 1 && (
    <Picker
      label="Scale"
      selectedKey={detail ? detail.scale.id : ALL_DIMENSION_SCALES}
      onSelectionChange={(key) => {
        if (key != null) setChosenScaleId(String(key));
      }}
    >
      {[
        <PickerItem key={ALL_DIMENSION_SCALES} id={ALL_DIMENSION_SCALES}>
          All scales
        </PickerItem>,
        ...scales.map(({ scale }) => (
          <PickerItem key={scale.id} id={scale.id}>
            {scale.name}
          </PickerItem>
        )),
      ]}
    </Picker>
  );
  const single = scales.length === 1 ? scales[0] : undefined;
  const shown = detail ?? single;
  return (
    <AnalyzePage
      component={`${title}Analyze`}
      title={title}
      previewData={previewData}
    >
      {shown ? (
        <DimensionScaleComparison
          key={shown.scale.id}
          noun={noun}
          input={inputFor(shown)}
          detail
          leadingSettings={scalePicker || undefined}
        />
      ) : (
        <>
          {scalePicker && <AnalyzeSettings>{scalePicker}</AnalyzeSettings>}
          <AnalyzeCardGrid count={scales.length}>
            {scales.map((entry) => (
              <DimensionScaleComparison
                key={entry.scale.id}
                noun={noun}
                input={inputFor(entry)}
              />
            ))}
          </AnalyzeCardGrid>
        </>
      )}
    </AnalyzePage>
  );
}
