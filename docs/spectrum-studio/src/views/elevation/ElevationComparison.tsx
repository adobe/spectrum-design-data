// Copyright 2026 Adobe. All rights reserved.
import { Checkbox, Picker, PickerItem, Text } from "@react-spectrum/s2";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { useMemo, useState } from "react";
import { ScaleTypeGraph } from "../../components/logic/ScaleTypeGraph";
import {
  elevationComparisonOwner,
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
import {
  type ElevationComparisonInput,
  computeElevationComparison,
} from "../../features/elevation/comparisonWork";
import { usePreviewWorker } from "../../features/derived-work/usePreviewWorker";
import { DerivedContentBoundary } from "../../components/DerivedContentBoundary";

const createComparisonWorker = () =>
  new Worker(
    new URL("../../features/elevation/comparison.worker.ts", import.meta.url),
    { type: "module" },
  );

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
  const input = useMemo(
    (): ElevationComparisonInput => [
      document,
      modeSets,
      activeModes,
      metric,
      document.layers.map((layer) => layer.id),
      compare,
      modeIds,
      preview,
      opacitySource,
    ],
    [
      document,
      modeSets,
      activeModes,
      metric,
      compare,
      modeIds,
      preview,
      opacitySource,
    ],
  );
  const result = usePreviewWorker<
    ElevationComparisonInput,
    ReturnType<typeof computeElevationComparison>
  >(input, createComparisonWorker);
  const series = result.ready?.value ?? [];
  const chartMetric = result.ready?.input[3] ?? metric;
  const points = series.flatMap((series) => series.points);
  const unit = chartMetric === "opacity" ? "%" : "px";
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
      <DerivedContentBoundary
        state={result.status}
        label="Updating Elevation comparison"
        error={result.error}
        onRetry={result.retry}
      >
        <AnalyzeCardGrid count={1}>
          <ChartCard
            title={`Elevation ${METRIC_LABELS[chartMetric]} (${unit})`}
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
            {points.length ? (
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
      </DerivedContentBoundary>
    </div>
  );
}
