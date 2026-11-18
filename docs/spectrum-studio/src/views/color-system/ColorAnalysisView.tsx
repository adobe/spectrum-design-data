// Copyright 2026 Adobe. All rights reserved.
import { termLabel } from "../../features/taxonomy/termPresentation";
import {
  Checkbox,
  Content,
  Heading,
  InlineAlert,
  PickerItem,
  Slider,
  Tab,
  TabList,
  TabPanel,
  Tabs,
} from "@react-spectrum/s2";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { useEffect, useId, useMemo, useState, type ReactNode } from "react";
import { Picker } from "../../components/fields/Picker";
import { NumberField } from "../../components/fields/NumberField";
import { ColorCanvas } from "../../components/color-picker/ColorCanvas";
import { getColorSpaceConfig } from "../../components/color-picker/colorUtils";
import {
  ScaleGraph,
  type NumericSeries,
} from "../../components/charts/ScaleGraph";
import {
  chartGutters,
  useChartViewport,
} from "../../components/charts/chartViewport";
import {
  analysisDomains,
  buildAnalysisScale,
  buildOutputProfile,
  findSlice,
  repairReference,
  splitHueSamples,
  trajectorySample,
  type AnalysisColor,
  type AnalysisScale,
  type OutputObservation,
} from "../../features/color-system/analysis";
import {
  planePosition,
  type PlaneDomains,
} from "../../features/color-system/colorPlane";
import {
  renderGamutForOutput,
  type RgbGamut,
} from "../../features/color-system/colorMath";
import { GAMUT_LABELS } from "../../features/color-system/outputSettings";
import type {
  ColorSystemDocument,
  ContrastToken,
} from "../../features/color-system/model";
import type { ColorAnalysisPreferences } from "../../state/view/colorSystemView";
import {
  AnalyzeCardGrid,
  AnalyzePage,
  AnalyzeSettings,
  AnalyzeValuesTable,
  ChartCard,
  analyzeNoteStyles,
} from "../analyze/AnalyzeLayout";
import { ContrastRamp } from "./ContrastRamp";
import "../chartLayout.css";
import "./ColorAnalyze.css";
import type { Rule } from "../../features/logic/model";

const columnStyles = style({
  display: "flex",
  flexDirection: "column",
  gap: 16,
  minWidth: 0,
});
const lightnessWrapperStyles = style({
  display: "flex",
  flexDirection: "column",
  gap: 16,
  paddingTop: 16,
  minWidth: 0,
});
const noteStyles = analyzeNoteStyles;
const config = getColorSpaceConfig("OKlch", "cartesian");
const channels = ["a", "b"] as const;
const number = (value: number) => Number(value.toFixed(2)).toString();
const percent = (value: number) => `${number(value * 100)}%`;

export interface ColorAnalysisViewProps {
  document: ColorSystemDocument;
  authoredContrasts: readonly ContrastToken[];
  authoredScaleContrasts?: Readonly<Record<string, readonly ContrastToken[]>>;
  rules?: readonly Rule[];
  preferences: ColorAnalysisPreferences;
  onPreferencesChange: (preferences: ColorAnalysisPreferences) => void;
  surfaceId: string | null;
  onSurfaceChange: (id: string | null) => void;
  selectedScaleId?: string | null;
  overrideCount?: number;
  isPreview?: boolean;
}

export function ColorAnalysisView({
  document,
  authoredContrasts,
  authoredScaleContrasts,
  rules,
  preferences,
  onPreferencesChange,
  surfaceId,
  onSurfaceChange,
  selectedScaleId,
  overrideCount = 0,
  isPreview = false,
}: ColorAnalysisViewProps) {
  const change = (patch: Partial<ColorAnalysisPreferences>) =>
    onPreferencesChange({ ...preferences, ...patch });
  const reference = repairReference(
    document.scales,
    preferences.referenceScaleId,
    selectedScaleId,
  );
  const surface = repairReference(
    document.surfaces,
    surfaceId,
    document.surfaces.find((item) => item.base)?.id,
  );
  const valuesScale = repairReference(
    document.scales,
    preferences.valuesScaleId,
    reference?.id,
  );
  const [repairNotice, setRepairNotice] = useState("");
  useEffect(() => {
    const repairScale =
      reference && reference.id !== preferences.referenceScaleId;
    const repairSurface = surface && surface.id !== surfaceId;
    if (repairScale) {
      if (preferences.referenceScaleId)
        setRepairNotice(
          "The reference scale was removed. Analysis now uses an available scale.",
        );
      onPreferencesChange({ ...preferences, referenceScaleId: reference.id });
    }
    if (repairSurface) {
      if (surfaceId)
        setRepairNotice(
          "The reference surface was removed. Analysis now uses an available surface.",
        );
      onSurfaceChange(surface.id);
    }
  }, [reference?.id, surface?.id, preferences.referenceScaleId, surfaceId]); // eslint-disable-line react-hooks/exhaustive-deps
  const derived = useMemo(() => {
    try {
      return {
        scales: document.scales.map((scale) =>
          buildAnalysisScale(scale, document.settings.colorOutput),
        ),
      };
    } catch (failure) {
      return {
        error: failure instanceof Error ? failure.message : String(failure),
      };
    }
  }, [document.scales, document.settings.colorOutput]);
  const output = useMemo(() => {
    if (preferences.tab !== "lightness" || !reference || !surface) return {};
    try {
      return {
        profile: buildOutputProfile(
          document,
          reference,
          surface,
          authoredScaleContrasts?.[reference.id] ?? authoredContrasts,
          rules,
        ),
      };
    } catch (failure) {
      return {
        error: failure instanceof Error ? failure.message : String(failure),
      };
    }
  }, [
    document,
    reference,
    surface,
    authoredContrasts,
    authoredScaleContrasts,
    rules,
    preferences.tab,
  ]);
  const gamut = renderGamutForOutput(document.settings.colorOutput);
  return (
    <AnalyzePage component="ColorAnalyze" title="Color" previewData={isPreview}>
      {overrideCount > 0 && (
        <p role="status" className={noteStyles}>
          {overrideCount} related color tokens have edits. These charts show
          generated foundation colors, not manually edited token values.
        </p>
      )}
      {repairNotice && (
        <p role="status" className={noteStyles}>
          {repairNotice}
        </p>
      )}
      {derived.error && <AnalysisError message={derived.error} />}
      {!derived.error && (!reference || !surface) && (
        <p role="status">
          Add a color scale and a surface to analyze generated colors.
        </p>
      )}
      {derived.scales && reference && surface && (
        <Tabs
          aria-label="Color analysis views"
          selectedKey={preferences.tab}
          onSelectionChange={(key) => {
            if (key === "chromaticity" || key === "lightness")
              change({ tab: key });
          }}
        >
          <TabList>
            <Tab id="chromaticity">Chromaticity</Tab>
            <Tab id="lightness">Lightness</Tab>
          </TabList>
          <TabPanel id="chromaticity">
            <Chromaticity
              scales={derived.scales}
              gamut={gamut}
              preferences={preferences}
              change={change}
              valuesScaleId={valuesScale?.id}
            />
          </TabPanel>
          <TabPanel id="lightness">
            <div className={lightnessWrapperStyles}>
              <AnalyzeSettings>
                <div className="colorAnalysisField">
                  <Picker
                    label="Reference scale"
                    layout="flex"
                    selectedKey={reference.id}
                    onSelectionChange={(key) => {
                      if (key !== null)
                        change({ referenceScaleId: String(key) });
                    }}
                  >
                    {document.scales.map((scale) => (
                      <PickerItem key={scale.id} id={scale.id}>
                        {termLabel(scale.name)}
                      </PickerItem>
                    ))}
                  </Picker>
                </div>
                <div className="colorAnalysisField">
                  <Picker
                    label="Surface"
                    layout="flex"
                    selectedKey={surface.id}
                    onSelectionChange={(key) => {
                      if (key !== null) onSurfaceChange(String(key));
                    }}
                  >
                    {document.surfaces.map((item) => (
                      <PickerItem key={item.id} id={item.id}>
                        {termLabel(item.name)}
                      </PickerItem>
                    ))}
                  </Picker>
                </div>
                <div className="colorAnalysisField">
                  <Picker
                    label="Chart line type"
                    layout="flex"
                    selectedKey={preferences.lineType}
                    onSelectionChange={(key) => {
                      if (key === "steps" || key === "curve")
                        change({ lineType: key });
                    }}
                  >
                    <PickerItem id="steps">Steps</PickerItem>
                    <PickerItem id="curve">Curve</PickerItem>
                  </Picker>
                </div>
              </AnalyzeSettings>
              {output.error && <AnalysisError message={output.error} />}
              {output.profile && (
                <AnalyzeCardGrid count={1}>
                  <Lightness
                    profile={output.profile}
                    name={reference.name}
                    preferences={preferences}
                    values={
                      <AnalyzeValuesTable
                        label={`${termLabel(reference.name)} output values`}
                        headings={[
                          "Scale index",
                          "Authored target",
                          "Effective target",
                          "Achieved contrast",
                          "Calculated contrast",
                          "Lightness (OKLab)",
                          "Original color",
                        ]}
                        rows={output.profile.map((stop) => ({
                          id: stop.id,
                          values: [
                            String(stop.scaleIndex),
                            number(stop.authoredTarget),
                            number(stop.target),
                            number(stop.achieved),
                            number(stop.calculated),
                            percent(stop.lightness),
                            stop.css,
                          ],
                        }))}
                      />
                    }
                  />
                </AnalyzeCardGrid>
              )}
            </div>
          </TabPanel>
        </Tabs>
      )}
    </AnalyzePage>
  );
}

function AnalysisError({ message }: { message: string }) {
  return (
    <InlineAlert variant="negative">
      <Heading>Could not analyze these colors</Heading>
      <Content>{message}</Content>
    </InlineAlert>
  );
}

function Chromaticity({
  scales: allScales,
  gamut,
  preferences,
  change,
  valuesScaleId,
}: {
  scales: AnalysisScale[];
  gamut: RgbGamut;
  preferences: ColorAnalysisPreferences;
  change: (patch: Partial<ColorAnalysisPreferences>) => void;
  valuesScaleId?: string;
}) {
  const selectedScale = allScales.find(
    (scale) => scale.id === preferences.chromaticityScaleId,
  );
  const scales = useMemo(
    () => (selectedScale ? [selectedScale] : allScales),
    [selectedScale, allScales],
  );
  const domains = useMemo(() => analysisDomains(scales), [scales]);
  const slices = useMemo(
    () =>
      scales.map((scale) => ({
        scale,
        slice: findSlice(scale.samples, preferences.slice, (position) =>
          trajectorySample(scale.data, position),
        ),
      })),
    [scales, preferences.slice],
  );
  const markers =
    preferences.markerMode === "keys"
      ? scales.flatMap((scale) =>
          scale.keys.map((color, index) => ({
            id: `${scale.id}:${color.id}`,
            label: `${termLabel(scale.name)}, key ${index + 1}`,
            color,
          })),
        )
      : slices.flatMap(({ scale, slice }) =>
          slice.kind === "available"
            ? [
                {
                  id: scale.id,
                  label: `${termLabel(scale.name)}, cross-section`,
                  color: slice.color,
                },
              ]
            : [],
        );
  const missing = slices.filter((item) => item.slice.kind === "unavailable");
  const seriesFor = (channel: "hue" | "chroma"): NumericSeries[] =>
    scales.map((scale) => ({
      id: scale.id,
      label: termLabel(scale.name),
      points:
        channel === "hue"
          ? splitHueSamples(scale.samples)
          : scale.samples.map((sample) => ({
              x: sample.position,
              y: sample[channel],
            })),
    }));
  const valuesScale =
    selectedScale ??
    allScales.find((scale) => scale.id === valuesScaleId) ??
    allScales[0];
  const valuesPicker = !selectedScale && allScales.length > 1 && (
    <div className="colorAnalysisField">
      <Picker
        label="Values for scale"
        selectedKey={valuesScale?.id}
        onSelectionChange={(key) => {
          if (key !== null) change({ valuesScaleId: String(key) });
        }}
      >
        {allScales.map((scale) => (
          <PickerItem key={scale.id} id={scale.id}>
            {termLabel(scale.name)}
          </PickerItem>
        ))}
      </Picker>
    </div>
  );
  const valuesName = termLabel(valuesScale?.name ?? "");
  const trajectoryTable = (
    <AnalyzeValuesTable
      label={`${valuesName} trajectory values`}
      headings={[
        "Position (relative luminance)",
        "Hue",
        "Chroma",
        "Lightness (OKLab)",
      ]}
      rows={(valuesScale?.samples ?? []).map((sample) => ({
        id: String(sample.position),
        values: [
          number(sample.position),
          sample.hue === null
            ? "Undefined (neutral)"
            : `${number(sample.hue)} deg`,
          number(sample.chroma),
          percent(sample.lightness),
        ],
      }))}
    />
  );
  return (
    <div className={lightnessWrapperStyles}>
      <AnalyzeSettings>
        <div className="colorAnalysisField">
          <Picker
            label="Color scale"
            layout="flex"
            selectedKey={selectedScale?.id ?? "all"}
            onSelectionChange={(key) => {
              if (key !== null)
                change({
                  chromaticityScaleId: key === "all" ? null : String(key),
                });
            }}
          >
            <PickerItem id="all">All scales</PickerItem>
            {allScales.map((scale) => (
              <PickerItem key={scale.id} id={scale.id}>
                {termLabel(scale.name)}
              </PickerItem>
            ))}
          </Picker>
        </div>
      </AnalyzeSettings>
      <div className="colorAnalysisGrid">
        <ChartCard
          title="Hue and chroma"
          settings={
            <>
              <Picker
                label="Markers"
                selectedKey={preferences.markerMode}
                onSelectionChange={(key) => {
                  if (key === "slices" || key === "keys")
                    change({ markerMode: key });
                }}
              >
                <PickerItem id="slices">Scale cross-sections</PickerItem>
                <PickerItem id="keys">All key colors</PickerItem>
              </Picker>
              <Checkbox
                isSelected={preferences.paths}
                onChange={(paths) => change({ paths })}
              >
                Show scale paths
              </Checkbox>
              <Checkbox
                isSelected={preferences.guides}
                onChange={(guides) => change({ guides })}
              >
                Show radial guides
              </Checkbox>
            </>
          }
          values={
            <div className={columnStyles}>
              {valuesPicker}
              {trajectoryTable}
              <AnalyzeValuesTable
                label={`${valuesName} scale key values`}
                headings={[
                  "Key",
                  "Hue",
                  "Chroma",
                  "Lightness (OKLab)",
                  "Gamut",
                ]}
                rows={(valuesScale?.keys ?? []).map((key, index) => ({
                  id: key.id,
                  values: [
                    String(index + 1),
                    key.hue === null
                      ? "Undefined (neutral)"
                      : `${number(key.hue)} deg`,
                    number(key.chroma),
                    percent(key.lightness),
                    key.inGamut ? "In gamut" : "Outside output gamut",
                  ],
                }))}
              />
            </div>
          }
        >
          <p className={noteStyles}>
            OKLCh, {GAMUT_LABELS[gamut]} gamut. Distance is actual chroma, not
            relative saturation.
          </p>
          <GamutPlot
            scales={scales}
            domains={domains}
            gamut={gamut}
            preferences={preferences}
            markers={markers}
          />
          <div className="colorAnalysisSlice">
            <Slider
              label="Slice lightness"
              value={preferences.slice * 100}
              minValue={0}
              maxValue={100}
              step={1}
              onChange={(value) => change({ slice: value / 100 })}
            />
            <NumberField
              aria-label="Slice lightness value"
              value={preferences.slice * 100}
              minValue={0}
              maxValue={100}
              step={1}
              onChange={(value) => {
                if (Number.isFinite(value)) change({ slice: value / 100 });
              }}
            />
          </div>
          <p className={noteStyles}>
            Keys and complete paths project colors at other lightness levels.
            Their true positions can lie outside this slice's colored shape.
          </p>
          {(preferences.slice === 0 || preferences.slice === 1) && (
            <p role="status" className={noteStyles}>
              At this lightness, the gamut collapses to a neutral point.
            </p>
          )}
          {missing.length > 0 && preferences.markerMode === "slices" && (
            <p role="status">
              No slice is available for{" "}
              {missing.map((item) => item.scale.name).join(", ")}.
            </p>
          )}
        </ChartCard>
        <div className={columnStyles}>
          {(["hue", "chroma"] as const).map((channel) => (
            <ChartCard
              key={channel}
              title={channel === "hue" ? "Hue" : "Chroma"}
              values={
                <div className={columnStyles}>
                  {valuesPicker}
                  <AnalyzeValuesTable
                    label={`${valuesName} ${channel} values`}
                    headings={[
                      "Position (relative luminance)",
                      channel === "hue" ? "Hue" : "Chroma",
                    ]}
                    rows={(valuesScale?.samples ?? []).map((sample) => ({
                      id: String(sample.position),
                      values: [
                        number(sample.position),
                        channel === "chroma"
                          ? number(sample.chroma)
                          : sample.hue === null
                            ? "Undefined (neutral)"
                            : `${number(sample.hue)} deg`,
                      ],
                    }))}
                  />
                </div>
              }
            >
              <ScaleGraph
                kind="numeric"
                label={`${channel} along generated scales`}
                series={seriesFor(channel)}
                xDomain={[0, 1]}
                yDomain={
                  channel === "hue"
                    ? [0, 360]
                    : [
                        0,
                        Math.max(
                          0.05,
                          ...scales.flatMap((scale) =>
                            scale.samples.map((sample) => sample.chroma),
                          ),
                        ),
                      ]
                }
                xLabel="Scale position (relative luminance)"
                yLabel={channel === "hue" ? "Degrees" : "OKLCh chroma"}
                markers={false}
              />
            </ChartCard>
          ))}
        </div>
      </div>
    </div>
  );
}

function GamutPlot({
  scales,
  domains,
  gamut,
  preferences,
  markers,
}: {
  scales: AnalysisScale[];
  domains: PlaneDomains;
  gamut: RgbGamut;
  preferences: ColorAnalysisPreferences;
  markers: { id: string; label: string; color: AnalysisColor }[];
}) {
  const { width, ref } = useChartViewport(320);
  const size = Math.max(1, Math.round(width));
  const project = (color: AnalysisColor) =>
    planePosition(color.lab[1], color.lab[2], size, domains);
  const center = planePosition(0, 0, size, domains);
  const clipId = useId();
  const [ratio, setRatio] = useState(() =>
    Math.min(2, window.devicePixelRatio || 1),
  );
  const [p3Supported, setP3Supported] = useState(true);
  useEffect(() => {
    const media = window.matchMedia("(color-gamut: p3)");
    const update = () => setP3Supported(media.matches);
    const updateRatio = () =>
      setRatio(Math.min(2, window.devicePixelRatio || 1));
    update();
    media.addEventListener("change", update);
    window.addEventListener("resize", updateRatio);
    return () => {
      media.removeEventListener("change", update);
      window.removeEventListener("resize", updateRatio);
    };
  }, []);
  return (
    <>
      <div ref={ref} className="colorAnalysisPlot">
        <ColorCanvas
          config={config}
          channels={channels}
          thirdChannelValue={preferences.slice}
          domains={domains}
          gamut={
            gamut === "srgb"
              ? "sRGB"
              : gamut === "display-p3"
                ? "Display-P3"
                : "Rec2020"
          }
          colorScheme="light"
          outside="transparent"
          size={size}
          pixelRatio={ratio}
        />
        <svg
          viewBox={`0 0 ${size} ${size}`}
          className="colorAnalysisOverlay"
          role="img"
          aria-label="Hue and chroma projections"
        >
          <desc>
            Hue zero is at the right and hue 90 at the top. Keys and paths
            preserve their true chroma. Use Show values for exact numbers.
          </desc>
          <defs>
            <clipPath id={clipId}>
              <rect width={size} height={size} />
            </clipPath>
          </defs>
          <g className="colorAnalysisAxes" aria-hidden="true">
            {[0.1, 0.2, 0.3, 0.4]
              .filter((c) => c <= domains[0][1])
              .map((c) => (
                <g key={c}>
                  <circle
                    cx={center.x}
                    cy={center.y}
                    r={(c / (domains[0][1] - domains[0][0])) * size}
                    fill="none"
                    stroke="currentColor"
                    strokeOpacity={0.3}
                  />
                  <text
                    x={
                      center.x +
                      (c / (domains[0][1] - domains[0][0])) * size -
                      3
                    }
                    y={center.y - 4}
                    textAnchor="end"
                    fontSize={10}
                    fill="currentColor"
                  >
                    {c}
                  </text>
                </g>
              ))}
            <text
              x={size - 3}
              y={center.y + 14}
              textAnchor="end"
              fontSize={10}
              fill="currentColor"
            >
              0 deg
            </text>
            <text
              x={center.x}
              y={12}
              textAnchor="middle"
              fontSize={10}
              fill="currentColor"
            >
              90 deg
            </text>
            <text x={3} y={center.y + 14} fontSize={10} fill="currentColor">
              180 deg
            </text>
            <text
              x={center.x}
              y={size - 3}
              textAnchor="middle"
              fontSize={10}
              fill="currentColor"
            >
              270 deg
            </text>
          </g>
          <g clipPath={`url(#${clipId})`}>
            {preferences.paths &&
              scales.map((scale) => (
                <polyline
                  key={scale.id}
                  data-scale-path={scale.id}
                  points={scale.samples
                    .map((sample) => {
                      const p = project(sample);
                      return `${p.x},${p.y}`;
                    })
                    .join(" ")}
                  fill="none"
                  stroke="white"
                  strokeWidth={2}
                  className="colorAnalysisPath"
                />
              ))}
            {preferences.guides &&
              markers.map((marker) => {
                const p = project(marker.color);
                return (
                  <line
                    key={marker.id}
                    x1={center.x}
                    y1={center.y}
                    x2={p.x}
                    y2={p.y}
                    data-guide-id={marker.id}
                    stroke="white"
                    strokeWidth={2}
                    strokeDasharray="4 6"
                    className="colorAnalysisPath"
                  />
                );
              })}
            {markers.map((marker) => {
              const p = project(marker.color);
              return (
                <circle
                  key={marker.id}
                  cx={p.x}
                  cy={p.y}
                  r={7}
                  fill={marker.color.css}
                  stroke="white"
                  strokeWidth={2}
                  data-marker-id={marker.id}
                  className="colorAnalysisPath"
                >
                  <title>{`${marker.label}, ${percent(marker.color.lightness)} lightness, ${number(marker.color.chroma)} chroma`}</title>
                </circle>
              );
            })}
          </g>
        </svg>
      </div>
      {gamut === "display-p3" && !p3Supported && (
        <p role="status" className={noteStyles}>
          Display P3 geometry is shown, but this screen has a limited color
          preview.
        </p>
      )}
    </>
  );
}

function Lightness({
  profile,
  name,
  preferences,
  values,
}: {
  profile: OutputObservation[];
  name: string;
  preferences: ColorAnalysisPreferences;
  values: ReactNode;
}) {
  const points = (metric: "achieved" | "target" | "lightness") =>
    profile.map((stop, x) => ({
      x,
      y: stop[metric],
      label: `${name}, ${stop.scaleIndex}: ${metric === "lightness" ? percent(stop.lightness) : `${number(stop[metric])}:1`}`,
    }));
  const xDomain = [-0.5, Math.max(0.5, profile.length - 0.5)] as const;
  const ticks = profile.map((stop, index) => ({
    index,
    label: String(stop.scaleIndex),
  }));
  return (
    <ChartCard
      title={`${termLabel(name)} generated output`}
      label={`${name} output analysis`}
      values={values}
      defaultShowValues={preferences.showValues}
    >
      <p className={noteStyles}>
        Output stops are ordered by effective target contrast, ascending.
        Grayscale preserves original OKLab lightness.
      </p>
      {profile.some(
        (stop) => Math.abs(stop.calculated - stop.target) > 0.02,
      ) && (
        <p role="status">
          Some targets are not attained. The achieved line shows returned
          colors, not capped targets.
        </p>
      )}
      <div
        className="colorAnalysisOutputScroll"
        role="region"
        aria-label="Output profile charts"
        // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- Strip and charts share a keyboard-scrollable region.
        tabIndex={0}
      >
        <div
          style={{
            minWidth: Math.max(
              360,
              profile.length * 36 + chartGutters.left + chartGutters.right,
            ),
          }}
        >
          <div
            style={{
              paddingLeft: chartGutters.left,
              paddingRight: chartGutters.right,
            }}
          >
            <ContrastRamp
              kind="samples"
              samples={profile.map((stop) => ({
                id: stop.id,
                css: stop.grayscale,
                description: `${name}, ${stop.scaleIndex}. Grayscale surrogate of ${stop.css}. OKLab lightness ${percent(stop.lightness)}. Effective target ${number(stop.target)}:1; achieved ${number(stop.achieved)}:1.`,
              }))}
            />
          </div>
          <ScaleGraph
            kind="numeric"
            label="Contrast (WCAG 2)"
            series={[
              {
                id: "achieved",
                label: "Achieved contrast",
                isBaseline: true,
                points: points("achieved"),
              },
              {
                id: "target",
                label: "Effective target",
                dashed: true,
                points: points("target"),
              },
            ]}
            xDomain={xDomain}
            yDomain={[
              1,
              Math.max(
                21,
                ...profile.map((stop) => stop.target),
                ...profile.map((stop) => stop.achieved),
              ),
            ]}
            ticks={ticks}
            xLabel="Output stops (target order)"
            yLabel="WCAG 2 ratio"
            lineType={preferences.lineType}
          />
          <ScaleGraph
            kind="numeric"
            label="Lightness (OKLab)"
            series={[
              {
                id: "lightness",
                label: name,
                isBaseline: true,
                points: points("lightness"),
              },
            ]}
            xDomain={xDomain}
            yDomain={[0, 1]}
            ticks={ticks}
            xLabel="Output stops (target order)"
            yLabel="OKLab lightness"
            percent
            lineType={preferences.lineType}
          />
        </div>
      </div>
      <p className={noteStyles}>
        Achieved contrast measures serialized output against the selected
        serialized surface, before device-specific gamut mapping. Curves change
        presentation only; markers are actual observations.
      </p>
    </ChartCard>
  );
}
