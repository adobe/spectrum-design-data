// Copyright 2026 Adobe. All rights reserved.
import { termLabel } from "../../../features/taxonomy/termPresentation";
import { ActionButton, PickerItem, Text } from "@react-spectrum/s2";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { useAtom, useAtomValue } from "jotai";
import { useMemo, useRef, useState } from "react";
import { Picker } from "../../../components/fields/Picker";
import { ScaleGraph } from "../../../components/charts/ScaleGraph";
import { dataVisInputDocumentAtom } from "../../../features/color-system/data-vis/state";
import { dataVisBackground } from "../../../features/color-system/data-vis/resolution";
import {
  dataVisComparisonPage,
  dataVisMetricPoints,
  type DataVisMetric,
  type DataVisReference,
} from "../../../features/color-system/data-vis/analysis";
import { MeasurementCache } from "../../../features/color-system/data-vis/measurements";
import {
  VISION_PROFILE_LABELS,
  type VisionProfile,
} from "../../../features/color-system/data-vis/model";
import { selectedDataVisScaleIdAtom } from "../../../state/view/dataVisView";
import { DataVisComparisonTable } from "./DataVisComparisonTable";
import { useDataVisDisplay, type DataVisDisplay } from "./useDataVisDisplay";

const layout = style({
  padding: 24,
  display: "flex",
  flexDirection: "column",
  gap: 16,
  overflow: "auto",
  minHeight: 0,
});
const row = style({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "end",
  gap: 16,
});
const notice = style({ font: "body-sm", color: "neutral-subdued", margin: 0 });
const negative = style({ color: "negative" });
const metricNames: Record<DataVisMetric, string> = {
  lightness: "Lightness",
  chroma: "Chroma",
  hue: "Hue",
  contrast: "Background contrast",
};

export function DataVisAnalyze() {
  const displays = useDataVisDisplay(),
    [selectedId, select] = useAtom(selectedDataVisScaleIdAtom);
  const document = useAtomValue(dataVisInputDocumentAtom),
    selected =
      displays.find((display) => display.definition.id === selectedId) ??
      displays[0];
  return (
    <div className={layout} data-component="DataVisAnalyze">
      <h1>Data vis analysis</h1>
      {!selected ? (
        <Text>Add a data vis scale to compare its colors.</Text>
      ) : (
        <>
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
          <Analysis
            key={selected.definition.id}
            display={selected}
            background={dataVisBackground(document)}
            gamut={renderGamutForOutput(document.settings.colorOutput)}
          />
        </>
      )}
    </div>
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
    [page, setPage] = useState(0),
    cache = useRef(new MeasurementCache());
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
  const result = useMemo(() => {
    if (display.status === "error")
      return {
        error: display.error,
        points: [],
        rows: [],
        total: 0,
        page: 0,
        pageCount: 1,
      };
    try {
      return {
        error: "",
        points: dataVisMetricPoints(
          display.observations,
          background,
          gamut,
          metric,
          cache.current,
        ),
        ...dataVisComparisonPage(
          display.observations,
          background,
          gamut,
          profile,
          reference,
          page,
          50,
          cache.current,
        ),
      };
    } catch (failure) {
      return {
        error: failure instanceof Error ? failure.message : String(failure),
        points: [],
        rows: [],
        total: 0,
        page: 0,
        pageCount: 1,
      };
    }
  }, [display, background, gamut, metric, profile, reference, page]);
  if (display.status === "error")
    return (
      <p className={negative} role="alert">
        {display.error}
      </p>
    );
  const continuous = !!display.continuous,
    target =
      display.definition.kind === "categorical" &&
      reference.kind !== "background" &&
      (profile === "normal" ||
        display.definition.preferences.cvdProfiles.includes(profile))
        ? display.definition.preferences.minimumDeltaE
        : undefined;
  const maximum =
    metric === "hue"
      ? 360
      : metric === "contrast"
        ? 21
        : metric === "chroma"
          ? result.points.reduce(
              (max, point) => Math.max(max, point.y ?? 0),
              0.4,
            )
          : 1;
  return (
    <>
      <div className={row}>
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
            <PickerItem id={`color:${observation.id}`} key={observation.id}>
              {observation.label}
            </PickerItem>
          ))}
        </Picker>
      </div>
      {result.error && (
        <p role="alert" className={negative}>
          {result.error}
        </p>
      )}
      <ScaleGraph
        kind="numeric"
        label={`${termLabel(display.definition.name)} ${metricNames[metric].toLowerCase()}`}
        series={[
          {
            id: display.definition.id,
            label: metricNames[metric],
            points: result.points,
          },
        ]}
        xDomain={
          continuous ? [0, 1] : [1, Math.max(2, display.observations.length)]
        }
        yDomain={[0, maximum]}
        xLabel={continuous ? "Normalized position" : "Saved color order"}
        yLabel={metricNames[metric]}
        connectPoints={continuous}
      />
      {continuous && (
        <p className={notice}>
          The plotted colors are function samples, not an authored swatch count.
          Neutral colors have no hue. Diverging arms share the exact center.
        </p>
      )}
      {!continuous && (
        <p className={notice}>
          Each marker is a saved categorical member; there is no continuous
          curve.
        </p>
      )}
      <p className={notice}>
        WCAG non-text checks use normal-vision rendered contrast, with a 3:1
        threshold. Pair checks are relevant to adjacent graphical objects, not a
        whole-chart certification. Delta E 2000 is a separate difference
        measure, not a WCAG pass rule.
      </p>
      {profile !== "normal" && (
        <p className={notice}>
          Simulated swatches, colors and background are measured together.
          Simulation contrast is not a WCAG result; grayscale is an
          approximation.
        </p>
      )}
      <DataVisComparisonTable rows={result.rows} deltaETarget={target} />
      <Text>
        {result.total} comparisons; page {result.page + 1} of {result.pageCount}
        .
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
      <p className={notice}>
        Finite samples cannot certify every function value or an entire chart.
        The chart must still provide labels, patterns, suitable adjacency and
        other non-color cues.
      </p>
      {display.continuous?.diagnostics.map((message) => (
        <Text key={message}>{message}</Text>
      ))}
    </>
  );
}
import {
  renderGamutForOutput,
  type RgbGamut,
} from "../../../features/color-system/colorMath";
