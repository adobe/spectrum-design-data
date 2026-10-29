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
import { useId, useState } from "react";
import { ScaleTypeGraph } from "../../components/logic/ScaleTypeGraph";
import {
  comparisonSelection,
  comparisonSeries,
  defaultComparisonSelection,
  type ComparisonDatasets,
  type ComparisonSource,
  type ComparisonView,
} from "../../features/typography/comparisons";
import { formatTypographyNumber } from "../../features/typography/units";
import "../chartLayout.css";
import "./TypographyComparisonView.css";

const viewStyle = style({
  display: "flex",
  flexDirection: "column",
  gap: 16,
  minWidth: 0,
});
const controlsStyle = style({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "end",
  gap: 16,
});
const panelStyle = style({
  display: "flex",
  flexDirection: "column",
  gap: 12,
  backgroundColor: "layer-1",
  borderRadius: "xl",
  padding: 16,
  minWidth: 0,
});
const chartGridStyle = style({
  display: "grid",
  gap: 16,
  minWidth: 0,
  alignItems: "start",
});
const headingStyle = style({ font: "title-sm", fontSize: "[14px]", margin: 0 });
const noteStyle = style({
  font: "body-sm",
  color: "neutral-subdued",
  margin: 0,
});
const tableWrapperStyle = style({ overflow: "auto", maxHeight: 420 });
const tableStyle = style({
  width: "full",
  borderCollapse: "collapse",
  font: "code-sm",
});
const headerStyle = style({
  textAlign: "start",
  font: "detail",
  color: "neutral-subdued",
  paddingY: 8,
  paddingX: 8,
  position: "sticky",
  top: 0,
  backgroundColor: "layer-1",
});
const cellStyle = style({
  textAlign: "start",
  paddingY: 8,
  paddingX: 8,
  borderTopWidth: 1,
  borderStyle: "solid",
  borderColor: "gray-200",
});

export interface TypographyComparisonViewProps {
  datasets?: ComparisonDatasets;
  error?: string;
  initialView?: ComparisonView;
  initialLineHeightId?: string;
}

export function TypographyComparisonView({
  datasets,
  error,
  initialView = "settings",
  initialLineHeightId,
}: TypographyComparisonViewProps) {
  const [view, setView] = useState<ComparisonView>(initialView);
  const [chosenSource, setChosenSource] = useState<ComparisonSource>();
  const [selections, setSelections] = useState<
    Partial<Record<`${ComparisonSource}:${ComparisonView}`, string[]>>
  >({});
  const [lineHeightId, setLineHeightId] = useState(initialLineHeightId);
  const [showValues, setShowValues] = useState(false);
  const valuesId = useId();
  if (!datasets)
    return (
      <InlineAlert variant="negative">
        <Heading>Could not compare Typography</Heading>
        <Content>
          {error ??
            "Comparison data is unavailable. Check your Typography settings."}
        </Content>
      </InlineAlert>
    );
  const source =
    chosenSource === "modes" && !datasets.modes
      ? "zoom"
      : (chosenSource ??
        (datasets.modes && datasets.modes.settings.length > 1
          ? "modes"
          : "zoom"));
  const dataset = source === "modes" ? datasets.modes! : datasets.zoom;
  const items = view === "settings" ? dataset.settings : dataset.steps;
  const selectionKey = `${source}:${view}` as const;
  const selected = comparisonSelection(
    items,
    selections[selectionKey] ?? defaultComparisonSelection(items, view),
  );
  const lineCount =
    [
      "No",
      "One",
      "Two",
      "Three",
      "Four",
      "Five",
      "Six",
      "Seven",
      "Eight",
      "Nine",
    ][selected.length] ?? String(selected.length);
  const lineHeights = dataset.metrics.filter((metric) =>
    metric.id.endsWith("-lineHeight"),
  );
  const lineHeight =
    lineHeights.find((metric) => metric.id === lineHeightId) ?? lineHeights[0];
  const metrics = dataset.metrics.filter(
    (metric) =>
      metric.id === "font-size" ||
      metric.id === "workflow-icon-size" ||
      metric === lineHeight,
  );
  const axes = view === "settings" ? dataset.steps : dataset.settings;
  const reference = axes.find((item) => item.isRequired)!;
  const xLabel = view === "settings" ? "Token step" : "Text size setting";
  const rows =
    view === "settings"
      ? dataset.settings.flatMap((setting, row) =>
          !selected.includes(setting.id)
            ? []
            : dataset.steps.map((step, column) => ({
                setting,
                step,
                row,
                column,
              })),
        )
      : dataset.steps.flatMap((step, column) =>
          !selected.includes(step.id)
            ? []
            : dataset.settings.map((setting, row) => ({
                setting,
                step,
                row,
                column,
              })),
        );

  return (
    <div
      className={`${viewStyle} chartComparisonContainer`}
      data-component="TypographyComparisonView"
      data-chart-view={view}
      data-comparison-source={source}
    >
      <section className={panelStyle} aria-label="Chart controls">
        <div className={controlsStyle}>
          <SegmentedControl
            aria-label="Chart view"
            selectedKey={view}
            onSelectionChange={(key) => {
              if (key === "settings" || key === "tokens") setView(key);
            }}
          >
            <SegmentedControlItem id="settings">
              <Text>By size setting</Text>
            </SegmentedControlItem>
            <SegmentedControlItem id="tokens">
              <Text>By token</Text>
            </SegmentedControlItem>
          </SegmentedControl>
          <Picker
            label="Compare"
            selectedKey={source}
            onSelectionChange={(key) => {
              if (key === "modes" || key === "zoom") setChosenSource(key);
            }}
          >
            <PickerItem id="modes" isDisabled={!datasets.modes}>
              Named modes
            </PickerItem>
            <PickerItem id="zoom">Zoom steps</PickerItem>
          </Picker>
          <Picker
            label="Lines"
            selectionMode="multiple"
            value={selected}
            onChange={(keys) =>
              setSelections((current) => ({
                ...current,
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
          {lineHeights.length > 1 && (
            <Picker
              label="Line height"
              selectedKey={lineHeight.id}
              onSelectionChange={(key) => {
                if (key != null) setLineHeightId(String(key));
              }}
            >
              {lineHeights.map((metric) => (
                <PickerItem key={metric.id} id={metric.id}>
                  {metric.label}
                </PickerItem>
              ))}
            </Picker>
          )}
        </div>
        <p
          className={noteStyle}
        >{`${lineCount} ${selected.length === 1 ? "line" : "lines"} shown. ${
          view === "settings"
            ? "Your default text size stays visible."
            : "The base token stays visible. The reference marks your default text size."
        }`}</p>
        {!datasets.modes && (
          <p role="status" className={noteStyle}>
            No mode set manages Text size. You can compare zoom steps.
          </p>
        )}
        {datasets.modes?.settings.length === 1 && (
          <p className={noteStyle}>
            Only the default mode is available. Compare zoom steps to see other
            sizes.
          </p>
        )}
      </section>
      <div
        className={`${chartGridStyle} ${metrics.length > 1 ? "typographyComparisonGrid" : "chartSingleGrid"}`}
        data-chart-grid
      >
        {metrics.map((metric) => {
          const series = comparisonSeries(dataset, metric, view, selected);
          const domain = metric.rows.flatMap((points, row) =>
            points.map((point, column) => ({
              index:
                view === "settings"
                  ? dataset.steps[column].position
                  : dataset.settings[row].position,
              step: Number(dataset.steps[column].id),
              ...point,
            })),
          );
          return (
            <section
              key={metric.id}
              className={panelStyle}
              aria-label={`${metric.label} chart`}
            >
              <h3
                className={headingStyle}
              >{`${metric.label} (${metric.unit})`}</h3>
              <ScaleTypeGraph
                label={`${metric.label} ${view === "settings" ? "by size setting" : "by token"}`}
                series={series}
                domain={domain}
                ticks={axes.map((item) => ({
                  index: item.position,
                  label: item.label,
                }))}
                reference={{
                  index: reference.position,
                  label:
                    view === "settings"
                      ? `Base token (${reference.id})`
                      : reference.label,
                }}
                xLabel={xLabel}
                yLabel={metric.unit}
              />
            </section>
          );
        })}
      </div>
      <div>
        <ActionButton
          aria-expanded={showValues}
          aria-controls={valuesId}
          onPress={() => setShowValues((shown) => !shown)}
        >
          <Text>{showValues ? "Hide values" : "Show values"}</Text>
        </ActionButton>
      </div>
      {showValues && (
        <section
          id={valuesId}
          className={panelStyle}
          aria-label="Comparison values"
        >
          <p className={noteStyle}>
            Values use your generated sizes. When rounding changes a formula
            value, its calculated value is also shown.
          </p>
          <div className={tableWrapperStyle}>
            <table className={tableStyle} aria-label="Type scale values">
              <thead>
                <tr>
                  <th scope="col" className={headerStyle}>
                    {view === "settings" ? "Size setting" : "Token step"}
                  </th>
                  <th scope="col" className={headerStyle}>
                    {view === "settings" ? "Token step" : "Size setting"}
                  </th>
                  {metrics.map((metric) => (
                    <th key={metric.id} scope="col" className={headerStyle}>
                      {metric.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map(({ setting, step, row, column }) => (
                  <tr
                    key={`${setting.id}:${step.id}`}
                    data-setting-id={setting.id}
                    data-step-id={step.id}
                    data-default-setting={setting.isRequired}
                  >
                    <th scope="row" className={cellStyle}>
                      {view === "settings" ? setting.label : step.label}
                    </th>
                    <td className={cellStyle}>
                      {view === "settings" ? step.label : setting.label}
                    </td>
                    {metrics.map((metric) => {
                      const point = metric.rows[row][column];
                      return (
                        <td
                          key={metric.id}
                          className={cellStyle}
                          data-metric={metric.id}
                          data-value={point.value}
                        >
                          <div>{`${formatTypographyNumber(point.value)}${metric.unit}`}</div>
                          {point.raw !== point.value && (
                            <div
                              className={noteStyle}
                            >{`${formatTypographyNumber(point.raw)}${metric.unit} calculated`}</div>
                          )}
                          {point.detail && (
                            <div className={noteStyle}>{point.detail}</div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
