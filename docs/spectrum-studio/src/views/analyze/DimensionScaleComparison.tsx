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
import { useMemo, useState, type ReactNode } from "react";
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
import {
  AnalyzeCardGrid,
  AnalyzeSettings,
  ChartCard,
  analyzeNoteStyles as noteStyle,
  analyzeTableCellStyles as cellStyle,
  analyzeTableHeaderStyles as headerStyle,
  analyzeTableScrollStyles as tableScrollStyle,
  analyzeTableStyles as tableStyle,
} from "./AnalyzeLayout";
import { formatAnalyzeNumber } from "./format";

const notesStyle = style({
  display: "flex",
  flexDirection: "column",
  gap: 4,
});

/**
 * One dimension scale's chart. Overview shows the card with default settings; `detail`
 * adds the page settings row (By setting or By token, Compare, Settings shown).
 */
export function DimensionScaleComparison({
  input,
  noun,
  detail = false,
  leadingSettings,
}: {
  input: DimensionComparisonInput;
  noun: string;
  detail?: boolean;
  /** Page settings placed first in the settings row, such as the Scale picker. */
  leadingSettings?: ReactNode;
}) {
  const [parameter, setParameter] = useState<string>();
  const [view, setView] = useState<ComparisonView>("settings");
  const [source, setSource] = useState<"modes" | "range">();
  const [selections, setSelections] = useState<Record<string, string[]>>({});
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
  const withSettings = (
    card: ReactNode,
    settings?: ReactNode,
    notes?: ReactNode,
  ) =>
    detail ? (
      <>
        {(leadingSettings || settings) && (
          <AnalyzeSettings>
            {leadingSettings}
            {settings}
          </AnalyzeSettings>
        )}
        {notes}
        <AnalyzeCardGrid count={1}>{card}</AnalyzeCardGrid>
      </>
    ) : (
      card
    );
  if (!result.data)
    return withSettings(
      <ChartCard title={input.scale.name} label={`${input.scale.name} chart`}>
        <InlineAlert variant="negative">
          <Heading>Could not compare {input.scale.name}</Heading>
          <Content>{result.error}</Content>
        </InlineAlert>
      </ChartCard>,
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
  const settings = adaptive && (
    <>
      <SegmentedControl
        aria-label="Chart view"
        selectedKey={chartView}
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
              {FOUNDATION_PARAMETERS.find((item) => item.id === id)?.label ??
                id}
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
        label={chartView === "settings" ? "Settings shown" : "Tokens shown"}
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
          <PickerItem key={item.id} id={item.id} isDisabled={item.isRequired}>
            {`${item.label}${item.isRequired ? " - always visible" : ""}`}
          </PickerItem>
        ))}
      </Picker>
    </>
  );
  const notes = adaptive && (
    <div className={notesStyle}>
      <p className={noteStyle}>
        {chartView === "settings"
          ? "The default setting stays visible. Other connected variables keep their current settings."
          : "The base token stays visible. The reference marks the default setting."}
      </p>
      {!data.modes && (
        <p role="status" className={noteStyle}>
          No mode set manages {definition?.label}. Compare adaptive settings
          instead.
        </p>
      )}
      {data.modes?.settings.length === 1 && (
        <p className={noteStyle}>
          Only the default mode is available. Compare adaptive settings to see
          other values.
        </p>
      )}
    </div>
  );
  const values = (
    <div className={tableScrollStyle}>
      <table
        className={tableStyle}
        aria-label={`${input.scale.name} comparison values`}
      >
        <thead>
          <tr>
            {["Setting", "Token", "Calculated", "Rounded"].map((label) => (
              <th key={label} scope="col" className={headerStyle}>
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
  );
  const card = (
    <ChartCard
      title={`${input.scale.name} (px)`}
      label={`${input.scale.name} chart`}
      component="DimensionScaleComparison"
      data-scale-chart={input.scale.id}
      data-chart-view={chartView}
      data-comparison-source={chosenSource}
      data-adaptive={adaptive}
      values={values}
    >
      <ScaleTypeGraph
        label={`${input.scale.name} ${noun} ${chartView === "settings" ? "by setting" : "by token"}`}
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
    </ChartCard>
  );
  return withSettings(card, settings || undefined, notes || undefined);
}
