// Copyright 2026 Adobe. All rights reserved.
import {
  ActionButton,
  Content,
  Heading,
  InlineAlert,
  Picker,
  PickerItem,
  SegmentedControl,
  SegmentedControlItem,
  Text,
} from "@react-spectrum/s2";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { useId, useMemo, useState } from "react";
import { ScaleTypeGraph } from "../../components/logic/ScaleTypeGraph";
import { FOUNDATION_PARAMETERS } from "../../features/modes/parameters";
import {
  comparisonSelection,
  comparisonSeries,
  defaultComparisonSelection,
  type ComparisonView,
} from "../../features/scales/comparison";
import {
  buildDimensionComparisons,
  type DimensionComparisonInput,
  type DimensionComparisons,
} from "../../features/scales/dimensionComparisons";
import { formatAnalyzeNumber } from "./format";

const panelStyle = style({
  display: "flex",
  flexDirection: "column",
  gap: 12,
  backgroundColor: "layer-1",
  borderRadius: "xl",
  padding: 16,
  minWidth: 0,
});
const controlsStyle = style({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "end",
  gap: 12,
  minWidth: 0,
});
const headingStyle = style({ font: "title-sm", fontSize: "[14px]", margin: 0 });
const noteStyle = style({
  font: "body-sm",
  color: "neutral-subdued",
  margin: 0,
});
const tableStyle = style({
  width: "full",
  borderCollapse: "collapse",
  font: "code-sm",
});
const cellStyle = style({
  textAlign: "start",
  padding: 8,
  borderBottomWidth: 1,
  borderStyle: "solid",
  borderColor: "gray-200",
});
const tableScrollStyle = style({
  overflow: "auto",
  maxHeight: 420,
  minWidth: 0,
});

export function DimensionScaleComparison({
  input,
  noun,
}: {
  input: DimensionComparisonInput;
  noun: string;
}) {
  const [parameter, setParameter] = useState<string>();
  const [view, setView] = useState<ComparisonView>("settings");
  const [source, setSource] = useState<"modes" | "range">();
  const [selections, setSelections] = useState<Record<string, string[]>>({});
  const [showValues, setShowValues] = useState(false);
  const valuesId = useId();
  const result = useMemo<{
    data?: DimensionComparisons;
    error?: string;
  }>(() => {
    try {
      return { data: buildDimensionComparisons(input, parameter) };
    } catch (failure) {
      return {
        error: failure instanceof Error ? failure.message : String(failure),
      };
    }
  }, [input, parameter]);
  if (!result.data)
    return (
      <section className={panelStyle} aria-label={`${input.scale.name} chart`}>
        <InlineAlert variant="negative">
          <Heading>Could not compare {input.scale.name}</Heading>
          <Content>{result.error}</Content>
        </InlineAlert>
      </section>
    );
  const data = result.data;
  const adaptive = data.parameterId !== undefined;
  const chosenSource =
    source === "modes" && !data.modes
      ? "range"
      : (source ?? (data.modes ? "modes" : "range"));
  const dataset = chosenSource === "modes" ? data.modes! : data.range;
  const chartView = adaptive ? view : "settings";
  const selectionKey = `${data.parameterId ?? "static"}:${chosenSource}:${chartView}`;
  const items = chartView === "settings" ? dataset.settings : dataset.steps;
  const selected = comparisonSelection(
    items,
    selections[selectionKey] ?? defaultComparisonSelection(items, chartView),
  );
  const metric = dataset.metrics[0];
  const axes = chartView === "settings" ? dataset.steps : dataset.settings;
  const reference = axes.find((item) => item.isRequired)!;
  const definition = FOUNDATION_PARAMETERS.find(
    (item) => item.id === data.parameterId,
  );
  const series = comparisonSeries(dataset, metric, chartView, selected);
  const rows = dataset.settings.flatMap((setting, row) =>
    dataset.steps.flatMap((step, column) =>
      (
        chartView === "settings"
          ? selected.includes(setting.id)
          : selected.includes(step.id)
      )
        ? [{ setting, step, row, column }]
        : [],
    ),
  );
  return (
    <section
      className={panelStyle}
      aria-label={`${input.scale.name} chart`}
      data-component="DimensionScaleComparison"
      data-scale-chart={input.scale.id}
      data-chart-view={chartView}
      data-comparison-source={chosenSource}
      data-adaptive={adaptive}
    >
      <h3 className={headingStyle}>{`${input.scale.name} (px)`}</h3>
      {adaptive && (
        <div
          className={controlsStyle}
          role="group"
          aria-label={`${input.scale.name} chart controls`}
        >
          <SegmentedControl
            aria-label="Chart view"
            selectedKey={chartView}
            onSelectionChange={(key) => {
              if (key === "settings" || key === "tokens") setView(key);
            }}
          >
            <SegmentedControlItem id="settings">
              <Text>By scale</Text>
            </SegmentedControlItem>
            <SegmentedControlItem id="tokens">
              <Text>By token</Text>
            </SegmentedControlItem>
          </SegmentedControl>
          {data.parameterIds.length > 1 && (
            <Picker
              label="Connected variable"
              selectedKey={data.parameterId}
              onSelectionChange={(key) => {
                if (key != null) setParameter(String(key));
              }}
            >
              {data.parameterIds.map((id) => (
                <PickerItem key={id} id={id}>
                  {FOUNDATION_PARAMETERS.find((item) => item.id === id)
                    ?.label ?? id}
                </PickerItem>
              ))}
            </Picker>
          )}
          <Picker
            label="Compare"
            selectedKey={chosenSource}
            onSelectionChange={(key) => {
              if (key === "modes" || key === "range") setSource(key);
            }}
          >
            <PickerItem id="modes" isDisabled={!data.modes}>
              Named modes
            </PickerItem>
            <PickerItem id="range">Adaptive settings</PickerItem>
          </Picker>
          <Picker
            label="Lines"
            selectionMode="multiple"
            value={selected}
            onChange={(keys) =>
              setSelections((previous) => ({
                ...previous,
                [selectionKey]: comparisonSelection(items, keys.map(String)),
              }))
            }
          >
            {items.map((item) => (
              <PickerItem
                key={item.id}
                id={item.id}
                isDisabled={item.isRequired}
              >
                {`${item.label}${item.isRequired ? " - always visible" : ""}`}
              </PickerItem>
            ))}
          </Picker>
        </div>
      )}
      {adaptive && (
        <p className={noteStyle}>
          {chartView === "settings"
            ? "The default setting stays visible. Other connected variables keep their current settings."
            : "The base token stays visible. The reference marks the default setting."}
        </p>
      )}
      {adaptive && !data.modes && (
        <p role="status" className={noteStyle}>
          No mode set manages {definition?.label}. Compare adaptive settings
          instead.
        </p>
      )}
      {adaptive && data.modes?.settings.length === 1 && (
        <p className={noteStyle}>
          Only the default mode is available. Compare adaptive settings to see
          other values.
        </p>
      )}
      <ScaleTypeGraph
        label={`${input.scale.name} ${noun} ${chartView === "settings" ? "by scale" : "by token"}`}
        series={series}
        domain={metric.rows.flatMap((points, row) =>
          points.map((point, column) => ({
            index:
              chartView === "settings"
                ? dataset.steps[column].position
                : dataset.settings[row].position,
            step: Number(dataset.steps[column].id),
            ...point,
          })),
        )}
        ticks={axes.map((item) => ({
          index: item.position,
          label: item.label,
        }))}
        reference={{
          index: reference.position,
          label:
            chartView === "settings"
              ? `Base token (${reference.id})`
              : reference.label,
        }}
        xLabel={chartView === "settings" ? "Token step" : definition!.label}
        yLabel="px"
      />
      <p className={noteStyle}>
        Lines show calculated values. Open circles show values after rounding.
      </p>
      <div>
        <ActionButton
          aria-expanded={showValues}
          aria-controls={valuesId}
          onPress={() => setShowValues((value) => !value)}
        >
          <Text>{showValues ? "Hide values" : "Show values"}</Text>
        </ActionButton>
      </div>
      {showValues && (
        <div id={valuesId} className={tableScrollStyle}>
          <table
            className={tableStyle}
            aria-label={`${input.scale.name} comparison values`}
          >
            <thead>
              <tr>
                {["Setting", "Token", "Calculated", "Rounded"].map((label) => (
                  <th key={label} scope="col" className={cellStyle}>
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(({ setting, step, row, column }) => {
                const point = metric.rows[row][column];
                return (
                  <tr
                    key={`${setting.id}:${step.id}`}
                    data-setting-id={setting.id}
                    data-step-id={step.id}
                  >
                    <th scope="row" className={cellStyle}>
                      {setting.label}
                    </th>
                    <td className={cellStyle}>{metric.tokenNames[column]}</td>
                    <td
                      className={cellStyle}
                    >{`${formatAnalyzeNumber(point.raw)}px`}</td>
                    <td
                      className={cellStyle}
                      data-value={point.value}
                    >{`${formatAnalyzeNumber(point.value)}px`}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
