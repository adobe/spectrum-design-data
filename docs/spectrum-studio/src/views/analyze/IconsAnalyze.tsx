// Copyright 2026 Adobe. All rights reserved.
import {
  Content,
  Heading,
  InlineAlert,
  Picker,
  PickerItem,
} from "@react-spectrum/s2";
import { atom, useAtomValue } from "jotai";
import { useState } from "react";
import { ScaleTypeGraph } from "../../components/logic/ScaleTypeGraph";
import { buildIconScaleComparisons } from "../../features/icons/comparisons";
import { iconsDocumentAtom } from "../../features/icons/documentState";
import type { IconScale } from "../../features/icons/model";
import { rulesAtom } from "../../features/logic/library";
import {
  interpolationsAtom,
  scaleTypesAtom,
} from "../../features/logic/scaleTypeLibrary";
import { modeSetsAtom } from "../../features/modes/state";
import {
  comparisonSeries,
  defaultComparisonSelection,
  type ComparisonDatasets,
} from "../../features/typography/comparisons";
import { typographyDocumentAtom } from "../../features/typography/state";
import { TypographyComparisonView } from "../typography/TypographyComparisonView";
import {
  AnalyzeCardGrid,
  AnalyzePage,
  AnalyzeSettings,
  AnalyzeValuesTable,
  ChartCard,
  analyzeNoteStyles as noteStyle,
} from "./AnalyzeLayout";

/** Icon scale picker key that shows every scale's overview chart. */
export const ALL_ICON_SCALES = "all";

export interface IconScaleComparison {
  scale: IconScale;
  datasets?: ComparisonDatasets;
  error?: string;
}

const iconComparisonsAtom = atom((get): IconScaleComparison[] => {
  const icons = get(iconsDocumentAtom);
  const typography = get(typographyDocumentAtom);
  const modeSets = get(modeSetsAtom);
  const library = {
    rules: get(rulesAtom),
    scaleTypes: get(scaleTypesAtom),
    interpolations: get(interpolationsAtom),
  };
  return icons.scales.map((scale) => {
    try {
      return {
        scale,
        datasets: buildIconScaleComparisons(
          icons,
          scale,
          typography,
          modeSets,
          library,
        ),
      };
    } catch (failure) {
      return {
        scale,
        error: failure instanceof Error ? failure.message : String(failure),
      };
    }
  });
});

/** One small chart per icon scale: the default setting and its nearest neighbors. */
function IconScaleOverviewChart({
  scale,
  datasets,
  error,
}: IconScaleComparison) {
  if (!datasets)
    return (
      <ChartCard title={scale.name} label={`${scale.name} chart`}>
        <InlineAlert variant="negative">
          <Heading>{`Could not compare ${scale.name}`}</Heading>
          <Content>{error}</Content>
        </InlineAlert>
      </ChartCard>
    );
  const dataset =
    datasets.modes?.find((set) => set.data.settings.length > 1)?.data ??
    datasets.zoom;
  const metric = dataset.metrics[0];
  const reference = dataset.steps.find((step) => step.isRequired)!;
  const defaultRow = Math.max(
    0,
    dataset.settings.findIndex((setting) => setting.isRequired),
  );
  return (
    <ChartCard
      title={`${scale.name} (px)`}
      label={`${scale.name} chart`}
      data-scale-chart={scale.id}
      values={
        <AnalyzeValuesTable
          label={`${scale.name} values`}
          headings={["Token step", "Size"]}
          rows={dataset.steps.map((step, column) => ({
            id: step.id,
            values: [step.label, `${metric.rows[defaultRow][column].value}px`],
          }))}
        />
      }
    >
      <ScaleTypeGraph
        label={`${scale.name} icon sizes by scale`}
        series={comparisonSeries(
          dataset,
          metric,
          "settings",
          defaultComparisonSelection(dataset.settings),
        )}
        domain={metric.rows.flatMap((points) =>
          points.map((point, column) => ({
            index: dataset.steps[column].position,
            step: Number(dataset.steps[column].id),
            ...point,
          })),
        )}
        ticks={dataset.steps.map((step) => ({
          index: step.position,
          label: step.label,
        }))}
        reference={{
          index: reference.position,
          label: `Base token (${reference.id})`,
        }}
        xLabel="Token step"
        yLabel="px"
      />
    </ChartCard>
  );
}

export function IconsAnalyzeContent({
  comparisons,
  initialScaleId = ALL_ICON_SCALES,
}: {
  comparisons: readonly IconScaleComparison[];
  /** A scale id, or `all` for every scale's overview chart. */
  initialScaleId?: string;
}) {
  const [chosenScaleId, setChosenScaleId] = useState(initialScaleId);
  const detail = comparisons.find(({ scale }) => scale.id === chosenScaleId);
  const scalePicker = (
    <Picker
      label="Icon scale"
      selectedKey={detail ? detail.scale.id : ALL_ICON_SCALES}
      onSelectionChange={(key) => {
        if (key != null) setChosenScaleId(String(key));
      }}
    >
      {[
        <PickerItem key={ALL_ICON_SCALES} id={ALL_ICON_SCALES}>
          All scales
        </PickerItem>,
        ...comparisons.map(({ scale }) => (
          <PickerItem key={scale.id} id={scale.id}>
            {scale.name}
          </PickerItem>
        )),
      ]}
    </Picker>
  );
  return (
    <AnalyzePage component="IconsAnalyze" title="Icons">
      {detail ? (
        <TypographyComparisonView
          key={detail.scale.id}
          datasets={detail.datasets}
          error={detail.error}
          subject={detail.scale.name}
          leadingSettings={scalePicker}
        />
      ) : (
        <>
          <AnalyzeSettings>{scalePicker}</AnalyzeSettings>
          <p className={noteStyle}>
            Each chart shows icon sizes at your default setting and the nearest
            other settings. Choose an icon scale to compare it in depth.
          </p>
          <AnalyzeCardGrid count={comparisons.length}>
            {comparisons.map((comparison) => (
              <IconScaleOverviewChart
                key={comparison.scale.id}
                {...comparison}
              />
            ))}
          </AnalyzeCardGrid>
        </>
      )}
    </AnalyzePage>
  );
}

export function IconsAnalyze() {
  return (
    <IconsAnalyzeContent comparisons={useAtomValue(iconComparisonsAtom)} />
  );
}
