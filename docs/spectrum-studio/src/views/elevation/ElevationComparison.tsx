// Copyright 2026 Adobe. All rights reserved.
import {
  ActionButton,
  Checkbox,
  Content,
  Heading,
  InlineAlert,
  Picker,
  PickerItem,
  Text,
} from "@react-spectrum/s2";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { useId, useState } from "react";
import { ScaleTypeGraph } from "../../components/logic/ScaleTypeGraph";
import {
  elevationComparisonOwner,
  elevationComparisonSeries,
  type ElevationMetric,
} from "../../features/elevation/comparisons";
import type { ElevationDocument } from "../../features/elevation/model";
import type { Mode, ModeSet } from "../../features/modes/model";
import type { PreviewOverrides } from "../../features/modes/previewState";
import "../chartLayout.css";

const panel = style({
  display: "flex",
  flexDirection: "column",
  gap: 12,
  padding: 16,
  backgroundColor: "layer-1",
  color: "neutral",
  font: "body-sm",
  borderRadius: "xl",
  minWidth: 0,
});
const controls = style({
  display: "flex",
  flexWrap: "wrap",
  gap: 12,
  alignItems: "end",
});
export function ElevationComparison({
  document,
  modeSets,
  activeModes,
  preview = {},
}: {
  document: ElevationDocument;
  modeSets: ModeSet[];
  activeModes: Mode[];
  preview?: PreviewOverrides;
}) {
  const [metric, setMetric] = useState<ElevationMetric>("blur");
  const [compare, setCompare] = useState(false);
  const [modeIds, setModeIds] = useState<string[]>([]);
  const [showValues, setShowValues] = useState(false);
  const valuesId = useId();
  const owner = elevationComparisonOwner(metric, modeSets);
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
    );
  } catch (failure) {
    error = failure instanceof Error ? failure.message : String(failure);
  }
  const points = series.flatMap((series) => series.points);
  return (
    <section
      className={`${panel} chartSingleGrid`}
      data-component="ElevationComparison"
      aria-label="Elevation chart"
    >
      <Heading level={3} UNSAFE_style={{ fontSize: 14 }}>
        Elevation{" "}
        {metric === "blur"
          ? "blur"
          : metric === "offsetY"
            ? "vertical offset"
            : "opacity"}
      </Heading>
      <div className={controls}>
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
      </div>
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
          yLabel={metric === "opacity" ? "%" : "px"}
        />
      ) : (
        <Text>No shadows to compare.</Text>
      )}
      <Text>
        All shadows are shown. Lengths are calculated without intermediate
        rounding. Mode comparisons hold other settings fixed.
      </Text>
      <ActionButton
        aria-expanded={showValues}
        aria-controls={valuesId}
        onPress={() => setShowValues((value) => !value)}
      >
        {showValues ? "Hide values" : "Show values"}
      </ActionButton>
      {showValues && (
        <div id={valuesId} style={{ overflow: "auto" }}>
          <table aria-label="Elevation comparison values">
            <thead>
              <tr>
                <th scope="col">Shadow and mode</th>
                <th scope="col">Token step</th>
                <th scope="col">Value</th>
              </tr>
            </thead>
            <tbody>
              {series.flatMap((line) =>
                line.points.map((point) => (
                  <tr key={`${line.id}:${point.index}`}>
                    <th scope="row">{line.label}</th>
                    <td>{point.step}</td>
                    <td>
                      {point.value}
                      {metric === "opacity" ? "%" : "px"}
                    </td>
                  </tr>
                )),
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
