// Copyright 2026 Adobe. All rights reserved.
import { Text } from "@react-spectrum/s2";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { useAtomValue } from "jotai";
import type { ReactNode } from "react";
import { ScaleGraph } from "../../components/charts/ScaleGraph";
import { chartGutters } from "../../components/charts/chartViewport";
import {
  opacityResultAtom,
  opacitySourceAtom,
} from "../../features/opacity/state";
import {
  AnalyzeCardGrid,
  AnalyzePage,
  AnalyzeValuesTable,
  ChartCard,
  analyzeNoteStyles,
  usePreviewData,
} from "../analyze/AnalyzeLayout";
import { ContrastRamp } from "../color-system/ContrastRamp";
import {
  formatOpacityPercent,
  opacityEditDescription,
  opacityObservations,
} from "./opacityPresentation";
import { useNumericRuntime } from "../../features/edit-session/numericContext";
import { useEditorPreview } from "../../features/edit-session/useEditorPreview";
import type { EditorPreviewOutput } from "../../features/edit-session/editorPreviewWork";
import { DerivedContentBoundary } from "../../components/DerivedContentBoundary";

const chartScrollStyles = style({ overflow: "auto", minWidth: 0 });
const PREVIEW_DRIVERS = ["color.*", "opacity.*"];

export function OpacityAnalyze() {
  return useNumericRuntime() ? (
    <LiveOpacityAnalyze />
  ) : (
    <AcceptedOpacityAnalyze />
  );
}
function LiveOpacityAnalyze() {
  const result = useEditorPreview("opacity", null);
  return (
    <DerivedContentBoundary
      state={result.status}
      label="Updating opacity analysis"
      error={result.error}
      onRetry={result.retry}
    >
      {result.ready?.value.kind === "opacity" && (
        <OpacityAnalyzeContent data={result.ready.value} />
      )}
    </DerivedContentBoundary>
  );
}
function AcceptedOpacityAnalyze() {
  const source = useAtomValue(opacitySourceAtom);
  const result = useAtomValue(opacityResultAtom);
  let profile: ReturnType<typeof opacityObservations> | undefined;
  let error: string | undefined;
  try {
    profile = opacityObservations(
      result,
      source.colorSystem.settings.colorOutput,
    );
  } catch (failure) {
    error = failure instanceof Error ? failure.message : String(failure);
  }
  return (
    <OpacityAnalyzeContent
      data={{ kind: "opacity", source, result, profile, error }}
    />
  );
}
function OpacityAnalyzeContent({
  data,
}: {
  data: Extract<EditorPreviewOutput, { kind: "opacity" }>;
}) {
  const { result, profile, error } = data;
  const previewData = usePreviewData(PREVIEW_DRIVERS);
  const observations = profile?.levels ?? [];
  const ticks = observations.map((level, index) => ({
    index,
    label: String(level.scaleIndex),
  }));
  const xDomain = [-0.5, Math.max(0.5, observations.length - 0.5)] as const;
  const contrastPoints = observations.map((level, index) => ({
    x: index,
    y: level.contrast,
    label: `${level.name}: ${formatOpacityPercent(level.value)} opacity, ${level.contrast}:1 WCAG 2 contrast. ${opacityEditDescription(level)}.`,
  }));
  const opacityPoints = observations.map((level, index) => ({
    x: index,
    y: level.value,
    label: `${level.name}: ${formatOpacityPercent(level.value)}. ${opacityEditDescription(level)}.`,
  }));

  const minWidth = Math.max(
    360,
    observations.length * 36 + chartGutters.left + chartGutters.right,
  );
  const scroll = (label: string, children: ReactNode) => (
    <div
      className={chartScrollStyles}
      role="region"
      aria-label={label}
      // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- Wide charts scroll by keyboard.
      tabIndex={0}
    >
      <div style={{ minWidth }}>{children}</div>
    </div>
  );
  const backdrop = profile?.dark ? "black" : "white";
  const note = profile && (
    <p className={analyzeNoteStyles}>
      Contrast uses serialized output over {backdrop}; the checkerboard and app
      appearance do not affect measurements.
    </p>
  );

  return (
    <AnalyzePage
      component="OpacityAnalyze"
      title="Opacity"
      previewData={previewData}
    >
      {result.issues.map((issue) => (
        <div key={issue} role="status">
          <Text>{issue}</Text>
        </div>
      ))}
      {error && (
        <div role="alert">
          <Text>{`Opacity analysis is unavailable: ${error}`}</Text>
        </div>
      )}
      {profile && (
        <div
          className={chartScrollStyles}
          role="region"
          aria-label="Opacity scale"
          // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- Wide scales scroll by keyboard.
          tabIndex={0}
        >
          <div style={{ minWidth: observations.length * 36 }}>
            <ContrastRamp
              kind="samples"
              label="Opacity step progression"
              background={profile.background}
              samples={observations.map((level) => ({
                id: level.id,
                css: level.css,
                description: `${level.name}, ${formatOpacityPercent(level.value)} opacity. ${opacityEditDescription(level)}. ${level.css}, measured against ${backdrop}.`,
              }))}
            />
          </div>
        </div>
      )}
      {profile && (
        <AnalyzeCardGrid count={2}>
          <ChartCard
            title="Contrast (WCAG 2)"
            label="Opacity contrast chart"
            values={
              <AnalyzeValuesTable
                label="Opacity contrast values"
                headings={["Scale index", "Opacity", "Contrast"]}
                rows={observations.map((level) => ({
                  id: level.id,
                  values: [
                    level.scaleIndex,
                    formatOpacityPercent(level.value),
                    `${level.contrast}:1`,
                  ],
                }))}
              />
            }
          >
            {scroll(
              "Opacity contrast chart area",
              <ScaleGraph
                kind="numeric"
                label="Contrast (WCAG 2)"
                series={[
                  {
                    id: "opacity-contrast",
                    label: "Measured contrast",
                    points: contrastPoints,
                  },
                ]}
                xDomain={xDomain}
                yDomain={[1, 21]}
                ticks={ticks}
                xLabel="Opacity scale index"
                yLabel="WCAG 2 ratio"
              />,
            )}
            {note}
          </ChartCard>
          <ChartCard
            title="Opacity percentage"
            label="Opacity percentage chart"
            values={
              <AnalyzeValuesTable
                label="Opacity percentage values"
                headings={["Scale index", "Opacity"]}
                rows={observations.map((level) => ({
                  id: level.id,
                  values: [level.scaleIndex, formatOpacityPercent(level.value)],
                }))}
              />
            }
          >
            {scroll(
              "Opacity percentage chart area",
              <ScaleGraph
                kind="numeric"
                label="Opacity percentage"
                series={[
                  {
                    id: "opacity-percent",
                    label: "Effective opacity",
                    points: opacityPoints,
                  },
                ]}
                xDomain={xDomain}
                yDomain={[0, 1]}
                ticks={ticks}
                xLabel="Opacity scale index"
                yLabel="Opacity"
                percent
              />,
            )}
          </ChartCard>
        </AnalyzeCardGrid>
      )}
    </AnalyzePage>
  );
}
