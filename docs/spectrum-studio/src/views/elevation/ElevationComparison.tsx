// Copyright 2026 Adobe. All rights reserved.
import {
  Checkbox,
  Content,
  Heading,
  InlineAlert,
  Picker,
  PickerItem,
  Text,
} from "@react-spectrum/s2";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { useState } from "react";
import { ScaleTypeGraph } from "../../components/logic/ScaleTypeGraph";
import {
  elevationComparisonOwner,
  elevationComparisonSeries,
  type ElevationMetric,
} from "../../features/elevation/comparisons";
import type { ElevationDocument } from "../../features/elevation/model";
import type { Mode, ModeSet } from "../../features/modes/model";
import type { PreviewOverrides } from "../../features/modes/previewState";
import type { OpacitySource } from "../../features/opacity/generation";
import {
  AnalyzeCardGrid,
  AnalyzeSettings,
  AnalyzeValuesTable,
  ChartCard,
  analyzeNoteStyles,
} from "../analyze/AnalyzeLayout";
import "../chartLayout.css";

const column = style({
  display: "flex",
  flexDirection: "column",
  gap: 16,
  minWidth: 0,
});
const METRIC_LABELS: Record<ElevationMetric, string> = {
  blur: "blur",
  offsetY: "vertical offset",
  opacity: "opacity",
};

/** Elevation settings row and its one chart card. */
export function ElevationComparison({
  document,
  modeSets,
  activeModes,
  preview = {},
  opacitySource,
}: {
  document: ElevationDocument;
  modeSets: ModeSet[];
  activeModes: Mode[];
  preview?: PreviewOverrides;
  opacitySource?: OpacitySource;
}) {
  const [metric, setMetric] = useState<ElevationMetric>("blur");
  const [compare, setCompare] = useState(false);
  const [modeIds, setModeIds] = useState<string[]>([]);
  const owner = elevationComparisonOwner(metric, modeSets, opacitySource);
  const layerIds = document.layers.map((layer) => layer.id);
  let error = "";
  let series: ReturnType<typeof elevationComparisonSeries> = [];
  try {
    series = elevationComparisonSeries(
      document,
      modeSets,
      activeModes,
      metric,
      layerIds,
      compare,
      modeIds,
      preview,
      opacitySource,
    );
  } catch (failure) {
    error = failure instanceof Error ? failure.message : String(failure);
  }
  const points = series.flatMap((series) => series.points);
  const unit = metric === "opacity" ? "%" : "px";
  return (
    <div className={column} data-component="ElevationComparison">
      <AnalyzeSettings>
        <Picker
          label="Metric"
          selectedKey={metric}
          onSelectionChange={(key) => {
            if (key === "blur" || key === "offsetY" || key === "opacity") {
              setMetric(key);
              setCompare(false);
              setModeIds([]);
            }
          }}
        >
          <PickerItem id="blur">Blur</PickerItem>
          <PickerItem id="offsetY">Vertical offset</PickerItem>
          <PickerItem id="opacity">Opacity</PickerItem>
        </Picker>
        {owner && (
          <Checkbox isSelected={compare} onChange={setCompare}>
            Compare named modes
          </Checkbox>
        )}
        {owner && compare && (
          <Picker
            label="Modes"
            selectionMode="multiple"
            value={[...new Set([owner.defaultModeId, ...modeIds])]}
            onChange={(keys) => setModeIds(keys.map(String))}
          >
            {owner.modes.map((mode) => (
              <PickerItem
                key={mode.id}
                id={mode.id}
                isDisabled={mode.id === owner.defaultModeId}
              >
                {mode.name}
                {mode.id === owner.defaultModeId ? " - always visible" : ""}
              </PickerItem>
            ))}
          </Picker>
        )}
      </AnalyzeSettings>
      <AnalyzeCardGrid count={1}>
        <ChartCard
          title={`Elevation ${METRIC_LABELS[metric]} (${unit})`}
          label="Elevation chart"
          values={
            <AnalyzeValuesTable
              label="Elevation comparison values"
              headings={["Shadow and mode", "Token step", "Value"]}
              rows={series.flatMap((line) =>
                line.points.map((point) => ({
                  id: `${line.id}:${point.index}`,
                  values: [line.label, point.step, `${point.value}${unit}`],
                })),
              )}
            />
          }
        >
          {error ? (
            <InlineAlert variant="negative">
              <Heading>Could not compare Elevation</Heading>
              <Content>{error}</Content>
            </InlineAlert>
          ) : points.length ? (
            <ScaleTypeGraph
              label="Elevation comparison"
              series={series}
              domain={points}
              ticks={series[0].points.map((point) => ({
                index: point.index,
                label: String(point.step),
              }))}
              reference={{ index: 0, label: "Base level" }}
              xLabel="Token step"
              yLabel={unit}
            />
          ) : (
            <Text>No shadows to compare.</Text>
          )}
          <p className={analyzeNoteStyles}>
            All shadows are shown. Lengths are calculated without intermediate
            rounding. Mode comparisons hold other settings fixed.
          </p>
        </ChartCard>
      </AnalyzeCardGrid>
    </div>
  );
}
