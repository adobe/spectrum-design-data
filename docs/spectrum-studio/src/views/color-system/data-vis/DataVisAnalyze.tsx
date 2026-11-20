// Copyright 2026 Adobe. All rights reserved.
import { termLabel } from "../../../features/taxonomy/termPresentation";
import { ActionButton, PickerItem, Text } from "@react-spectrum/s2";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { useAtom } from "jotai";
import { useMemo, useState } from "react";
import { Picker } from "../../../components/fields/Picker";
import { ScaleGraph } from "../../../components/charts/ScaleGraph";
import { dataVisBackground } from "../../../features/color-system/data-vis/resolution";
import {
  type DataVisMetric,
  type DataVisReference,
} from "../../../features/color-system/data-vis/analysis";
import {
  VISION_PROFILE_LABELS,
  type VisionProfile,
} from "../../../features/color-system/data-vis/model";
import { selectedDataVisScaleIdAtom } from "../../../state/view/dataVisView";
import { DataVisComparisonTable } from "./DataVisComparisonTable";
import { useDataVisDisplay, type DataVisDisplay } from "./useDataVisDisplay";
import {
  AnalyzeCardGrid,
  AnalyzePage,
  AnalyzeSettings,
  AnalyzeValuesTable,
  ChartCard,
  analyzeNoteStyles,
  usePreviewData,
} from "../../analyze/AnalyzeLayout";
import { DerivedContentBoundary } from "../../../components/DerivedContentBoundary";
import { usePreviewWorker } from "../../../features/derived-work/usePreviewWorker";
import type {
  DataVisAnalysisInput,
  DataVisAnalysisOutput,
} from "../../../features/color-system/data-vis/analysisWork";

const createAnalysisWorker = () =>
  new Worker(
    new URL(
      "../../../features/color-system/data-vis/analysis.worker.ts",
      import.meta.url,
    ),
    { type: "module" },
  );
const emptyAnalysis: DataVisAnalysisOutput = {
  points: [],
  rows: [],
  total: 0,
  page: 0,
  pageCount: 1,
};

const DATA_VIS_DRIVERS = ["color.*"];
const row = style({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "end",
  gap: 16,
});
const notice = analyzeNoteStyles;
const negative = style({ color: "negative" });
const metricNames: Record<DataVisMetric, string> = {
  lightness: "Lightness",
  chroma: "Chroma",
  hue: "Hue",
  contrast: "Background contrast",
};

export function DataVisAnalyze() {
  const preview = useDataVisDisplay(),
    [selectedId, select] = useAtom(selectedDataVisScaleIdAtom);
  const document = preview.ready?.document,
    displays = preview.ready?.displays ?? [],
    selected =
      displays.find((display) => display.definition.id === selectedId) ??
      displays[0];
  const previewData = usePreviewData(DATA_VIS_DRIVERS);
  return (
    <AnalyzePage
      component="DataVisAnalyze"
      title="Data vis"
      previewData={previewData}
    >
      <DerivedContentBoundary
        state={preview.status}
        label="Updating data vis analysis"
        error={preview.error}
        onRetry={preview.retry}
      >
        {!selected && document ? (
          <Text>Add a data vis scale to compare its colors.</Text>
        ) : selected && document ? (
          <>
            <AnalyzeSettings>
              <Picker
                label="Data vis scale"
                selectedKey={selected.definition.id}
                onSelectionChange={(id) => select(String(id))}
              >
                {displays.map((display) => (
                  <PickerItem
                    id={display.definition.id}
                    key={display.definition.id}
                  >
                    {termLabel(display.definition.name)}
                  </PickerItem>
                ))}
              </Picker>
            </AnalyzeSettings>
            <Analysis
              key={selected.definition.id}
              display={selected}
              background={dataVisBackground(document)}
              gamut={renderGamutForOutput(document.settings.colorOutput)}
            />
          </>
        ) : null}
      </DerivedContentBoundary>
    </AnalyzePage>
  );
}

function Analysis({
  display,
  background,
  gamut,
}: {
  display: DataVisDisplay;
  background: string;
  gamut: RgbGamut;
}) {
  const [metric, setMetric] = useState<DataVisMetric>("lightness"),
    [profile, setProfile] = useState<VisionProfile>("normal");
  const [referenceKey, setReferenceKey] = useState("background"),
    [page, setPage] = useState(0);
  const reference = useMemo(
    (): DataVisReference =>
      referenceKey === "background"
        ? { kind: "background" }
        : referenceKey === "adjacent"
          ? { kind: "adjacent" }
          : referenceKey === "all"
            ? { kind: "all" }
            : { kind: "color", id: referenceKey.slice(6) },
    [referenceKey],
  );
  const target =
    display.definition.kind === "categorical" &&
    reference.kind !== "background" &&
    (profile === "normal" ||
      display.definition.preferences.cvdProfiles.includes(profile))
      ? display.definition.preferences.minimumDeltaE
      : undefined;
  const input = useMemo(
    (): DataVisAnalysisInput => ({
      observations: display.status === "ready" ? display.observations : [],
      background,
      gamut,
      metric,
      profile,
      reference,
      page,
      target,
    }),
    [display, background, gamut, metric, profile, reference, page, target],
  );
  const work = usePreviewWorker<DataVisAnalysisInput, DataVisAnalysisOutput>(
    input,
    createAnalysisWorker,
  );
  const result = work.ready?.value ?? emptyAnalysis;
  const shown = work.ready?.input ?? input;
  if (display.status === "error")
    return (
      <p className={negative} role="alert">
        {display.error}
      </p>
    );
  const continuous = !!display.continuous;
  const maximum =
    shown.metric === "hue"
      ? 360
      : shown.metric === "contrast"
        ? 21
        : shown.metric === "chroma"
          ? result.points.reduce(
              (max, point) => Math.max(max, point.y ?? 0),
              0.4,
            )
          : 1;
  const measurementPicker = (
    <Picker
      label="Chart measurement"
      selectedKey={metric}
      onSelectionChange={(key) => {
        if (
          key === "lightness" ||
          key === "chroma" ||
          key === "hue" ||
          key === "contrast"
        )
          setMetric(key);
      }}
    >
      {Object.entries(metricNames).map(([id, label]) => (
        <PickerItem id={id} key={id}>
          {label}
        </PickerItem>
      ))}
    </Picker>
  );
  return (
    <DerivedContentBoundary
      state={work.status}
      label="Updating data vis measurements"
      error={work.error}
      onRetry={work.retry}
    >
      <AnalyzeCardGrid count={2}>
        <ChartCard
          title={metricNames[shown.metric]}
          label="Data vis measurement chart"
          settings={measurementPicker}
          values={
            <AnalyzeValuesTable
              label={`${termLabel(display.definition.name)} ${metricNames[shown.metric].toLowerCase()} values`}
              headings={[
                continuous ? "Normalized position" : "Saved color order",
                "Color",
                metricNames[shown.metric],
              ]}
              rows={result.points.map((point, index) => ({
                id: String(index),
                values: [
                  String(Number(point.x.toFixed(3))),
                  shown.observations[index]?.label ?? "",
                  point.y === null
                    ? "No chromatic hue"
                    : String(Number(point.y.toFixed(2))),
                ],
              }))}
            />
          }
        >
          <ScaleGraph
            kind="numeric"
            label={`${termLabel(display.definition.name)} ${metricNames[shown.metric].toLowerCase()}`}
            series={[
              {
                id: display.definition.id,
                label: metricNames[shown.metric],
                points: result.points,
              },
            ]}
            xDomain={
              continuous ? [0, 1] : [1, Math.max(2, shown.observations.length)]
            }
            yDomain={[0, maximum]}
            xLabel={continuous ? "Normalized position" : "Saved color order"}
            yLabel={metricNames[shown.metric]}
            connectPoints={continuous}
          />
          {continuous && (
            <p className={notice}>
              The plotted colors are function samples, not an authored swatch
              count. Neutral colors have no hue. Diverging arms share the exact
              center.
            </p>
          )}
          {!continuous && (
            <p className={notice}>
              Each marker is a saved categorical member; there is no continuous
              curve.
            </p>
          )}
        </ChartCard>
        <ChartCard
          title="Comparisons"
          label="Data vis comparisons"
          settings={
            <>
              <Picker
                label="Vision profile"
                selectedKey={profile}
                onSelectionChange={(key) => {
                  if (
                    key === "normal" ||
                    key === "protanopia" ||
                    key === "deuteranopia" ||
                    key === "tritanopia" ||
                    key === "achromatopsia"
                  )
                    setProfile(key);
                }}
              >
                {Object.entries(VISION_PROFILE_LABELS).map(([id, label]) => (
                  <PickerItem id={id} key={id}>
                    {label}
                  </PickerItem>
                ))}
              </Picker>
              <Picker
                label="Compare against"
                selectedKey={referenceKey}
                onSelectionChange={(key) => {
                  setReferenceKey(String(key));
                  setPage(0);
                }}
              >
                <PickerItem id="background">UI background</PickerItem>
                <PickerItem id="adjacent">Adjacent colors</PickerItem>
                <PickerItem id="all">All color pairs</PickerItem>
                {display.observations.map((observation) => (
                  <PickerItem
                    id={`color:${observation.id}`}
                    key={observation.id}
                  >
                    {observation.label}
                  </PickerItem>
                ))}
              </Picker>
            </>
          }
        >
          <p className={notice}>
            WCAG non-text checks use normal-vision rendered contrast, with a 3:1
            threshold. Pair checks are relevant to adjacent graphical objects,
            not a whole-chart certification. Delta E 2000 is a separate
            difference measure, not a WCAG pass rule.
          </p>
          {shown.profile !== "normal" && (
            <p className={notice}>
              Simulated swatches, colors and background are measured together.
              Simulation contrast is not a WCAG result; grayscale is an
              approximation.
            </p>
          )}
          <DataVisComparisonTable
            rows={result.rows}
            deltaETarget={shown.target}
          />
          <Text>
            {result.total} comparisons; page {result.page + 1} of{" "}
            {result.pageCount}.
          </Text>
          {result.pageCount > 1 && (
            <div className={row}>
              <ActionButton
                isDisabled={result.page === 0}
                onPress={() => setPage(result.page - 1)}
              >
                Previous comparisons
              </ActionButton>
              <ActionButton
                isDisabled={result.page + 1 === result.pageCount}
                onPress={() => setPage(result.page + 1)}
              >
                Next comparisons
              </ActionButton>
            </div>
          )}
        </ChartCard>
      </AnalyzeCardGrid>
      <p className={notice}>
        Finite samples cannot certify every function value or an entire chart.
        The chart must still provide labels, patterns, suitable adjacency and
        other non-color cues.
      </p>
      {display.continuous?.diagnostics.map((message) => (
        <Text key={message}>{message}</Text>
      ))}
    </DerivedContentBoundary>
  );
}
import {
  renderGamutForOutput,
  type RgbGamut,
} from "../../../features/color-system/colorMath";
