// Copyright 2026 Adobe. All rights reserved.
import {
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
import { useState, type ReactNode } from "react";
import { ScaleTypeGraph } from "../../components/logic/ScaleTypeGraph";
import {
  comparisonSelection,
  comparisonSeries,
  defaultComparisonSelection,
  type ComparisonDataset,
  type ComparisonDatasets,
  type ComparisonView,
} from "../../features/typography/comparisons";
import { formatTypographyNumber } from "../../features/typography/units";
import {
  AnalyzeCardGrid,
  AnalyzeSettings,
  ChartCard,
  analyzeNoteStyles as noteStyle,
  analyzeTableCellStyles as cellStyle,
  analyzeTableHeaderStyles as headerStyle,
  analyzeTableScrollStyles as tableWrapperStyle,
  analyzeTableStyles as tableStyle,
} from "../analyze/AnalyzeLayout";
import "./TypographyComparisonView.css";

const viewStyle = style({
  display: "flex",
  flexDirection: "column",
  gap: 16,
  minWidth: 0,
});
const notesStyle = style({
  display: "flex",
  flexDirection: "column",
  gap: 4,
});

const ZOOM = "zoom";
const COUNT_WORDS = [
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
];

export interface TypographyComparisonViewProps {
  datasets?: ComparisonDatasets;
  error?: string;
  initialView?: ComparisonView;
  initialLineHeightId?: string;
  /** Name used in messages, such as `Typography` or an icon scale name. */
  subject?: string;
  /** Page settings placed first in the settings row, such as a scale picker. */
  leadingSettings?: ReactNode;
}

export function TypographyComparisonView({
  datasets,
  error,
  initialView = "settings",
  initialLineHeightId,
  subject = "Typography",
  leadingSettings,
}: TypographyComparisonViewProps) {
  const [view, setView] = useState<ComparisonView>(initialView);
  const [chosenSource, setChosenSource] = useState<string>();
  const [selections, setSelections] = useState<
    Partial<Record<string, string[]>>
  >({});
  const [lineHeightId, setLineHeightId] = useState(initialLineHeightId);
  if (!datasets)
    return (
      <>
        {leadingSettings && (
          <AnalyzeSettings>{leadingSettings}</AnalyzeSettings>
        )}
        <InlineAlert variant="negative">
          <Heading>{`Could not compare ${subject}`}</Heading>
          <Content>
            {error ??
              `Comparison data is unavailable. Check your ${subject} settings.`}
          </Content>
        </InlineAlert>
      </>
    );
  const modeSets = datasets.modes ?? [];
  const modeSet =
    modeSets.find((set) => set.id === chosenSource) ??
    (chosenSource === ZOOM
      ? undefined
      : modeSets.find((set) => set.data.settings.length > 1));
  const source = modeSet ? "modes" : "zoom";
  const dataset: ComparisonDataset = modeSet ? modeSet.data : datasets.zoom;
  const items = view === "settings" ? dataset.settings : dataset.steps;
  const selectionKey = `${modeSet?.id ?? ZOOM}:${view}`;
  const selected = comparisonSelection(
    items,
    selections[selectionKey] ?? defaultComparisonSelection(items, view),
  );
  const lineCount = COUNT_WORDS[selected.length] ?? String(selected.length);
  const shownNoun =
    view === "settings"
      ? selected.length === 1
        ? "setting"
        : "settings"
      : selected.length === 1
        ? "token"
        : "tokens";
  const lineHeights = dataset.metrics.filter((metric) =>
    metric.id.endsWith("-lineHeight"),
  );
  const lineHeight =
    lineHeights.find((metric) => metric.id === lineHeightId) ?? lineHeights[0];
  const metrics = dataset.metrics.filter(
    (metric) => !metric.id.endsWith("-lineHeight") || metric === lineHeight,
  );
  const axes = view === "settings" ? dataset.steps : dataset.settings;
  const reference = axes.find((item) => item.isRequired)!;
  const xLabel =
    view === "settings"
      ? "Token step"
      : (modeSet?.name ?? "Adaptive text scaling");
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

  const valuesFor = (metric: (typeof metrics)[number]) => (
    <div className={notesStyle}>
      <p className={noteStyle}>
        Values use your generated sizes. When rounding changes a formula value,
        its calculated value is also shown.
      </p>
      <div className={tableWrapperStyle}>
        <table className={tableStyle} aria-label={`${metric.label} values`}>
          <thead>
            <tr>
              <th scope="col" className={headerStyle}>
                {view === "settings" ? "Size setting" : "Token step"}
              </th>
              <th scope="col" className={headerStyle}>
                {view === "settings" ? "Token step" : "Size setting"}
              </th>
              <th scope="col" className={headerStyle}>
                {metric.label}
              </th>
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
                  data-default-setting={setting.isRequired}
                >
                  <th scope="row" className={cellStyle}>
                    {view === "settings" ? setting.label : step.label}
                  </th>
                  <td className={cellStyle}>
                    {view === "settings" ? step.label : setting.label}
                  </td>
                  <td
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
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div
      className={viewStyle}
      data-component="TypographyComparisonView"
      data-chart-view={view}
      data-comparison-source={source}
      data-comparison-mode-set={modeSet?.id}
    >
      <AnalyzeSettings>
        {leadingSettings}
        <SegmentedControl
          aria-label="Chart view"
          selectedKey={view}
          onSelectionChange={(key) => {
            if (key === "settings" || key === "tokens") setView(key);
          }}
        >
          <SegmentedControlItem id="settings">
            <Text>By setting</Text>
          </SegmentedControlItem>
          <SegmentedControlItem id="tokens">
            <Text>By token</Text>
          </SegmentedControlItem>
        </SegmentedControl>
        <Picker
          label="Compare"
          selectedKey={modeSet?.id ?? ZOOM}
          onSelectionChange={(key) => {
            if (key != null) setChosenSource(String(key));
          }}
        >
          {[
            ...modeSets.map((set) => (
              <PickerItem key={set.id} id={set.id}>
                {set.name}
              </PickerItem>
            )),
            <PickerItem key={ZOOM} id={ZOOM}>
              Adaptive settings
            </PickerItem>,
          ]}
        </Picker>
        <Picker
          label={view === "settings" ? "Settings shown" : "Tokens shown"}
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
            <PickerItem key={item.id} id={item.id} isDisabled={item.isRequired}>
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
      </AnalyzeSettings>
      <div className={notesStyle}>
        <p className={noteStyle}>{`${lineCount} ${shownNoun} shown. ${
          view === "settings"
            ? "Your default setting stays visible."
            : "The base token stays visible. The reference marks your default setting."
        }`}</p>
        {!modeSets.length && (
          <p role="status" className={noteStyle}>
            No mode set manages typography. You can compare adaptive settings.
          </p>
        )}
        {modeSet?.data.settings.length === 1 && (
          <p className={noteStyle}>
            {`${modeSet.name} has only its default mode. Compare adaptive settings to see other sizes.`}
          </p>
        )}
      </div>
      <AnalyzeCardGrid
        count={metrics.length}
        gridClassName="typographyComparisonGrid"
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
            <ChartCard
              key={metric.id}
              title={`${metric.label} (${metric.unit})`}
              label={`${metric.label} chart`}
              values={valuesFor(metric)}
            >
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
            </ChartCard>
          );
        })}
      </AnalyzeCardGrid>
    </div>
  );
}
