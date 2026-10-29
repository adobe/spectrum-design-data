// Copyright 2026 Adobe. All rights reserved.
import { Text } from "@react-spectrum/s2";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { useAtomValue } from "jotai";
import { ScaleGraph } from "../../components/charts/ScaleGraph";
import { chartGutters } from "../../components/charts/chartViewport";
import {
  opacityResultAtom,
  opacitySourceAtom,
} from "../../features/opacity/state";
import { ContrastRamp } from "../color-system/ContrastRamp";
import { FoundationsElementsHeader } from "../FoundationsElementsHeader";
import {
  formatOpacityPercent,
  opacityEditDescription,
  opacityObservations,
} from "./opacityPresentation";

const layoutStyles = style({
  display: "flex",
  flexDirection: "column",
  gap: 20,
  minWidth: 0,
  minHeight: "full",
  overflow: "auto",
  padding: 16,
});
const chartStyles = style({
  display: "flex",
  flexDirection: "column",
  gap: 16,
});
const chartScrollStyles = style({ overflow: "auto", minWidth: 0 });

export function OpacityAnalyze() {
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

  return (
    <div className={layoutStyles} data-component="OpacityAnalyze">
      <FoundationsElementsHeader title="Opacity analysis" />
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
        <section className={chartStyles} aria-label="Opacity output analysis">
          <div
            className={chartScrollStyles}
            role="region"
            aria-label="Opacity analysis charts"
            // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- The strip and charts share a keyboard-scrollable region.
            tabIndex={0}
          >
            <div
              style={{
                minWidth: Math.max(
                  360,
                  observations.length * 36 +
                    chartGutters.left +
                    chartGutters.right,
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
                  label="Opacity step progression"
                  background={profile.background}
                  samples={observations.map((level) => ({
                    id: level.id,
                    css: level.css,
                    description: `${level.name}, ${formatOpacityPercent(level.value)} opacity. ${opacityEditDescription(level)}. ${level.css}, measured against ${profile.dark ? "black" : "white"}.`,
                  }))}
                />
              </div>
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
              />
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
              />
            </div>
          </div>
        </section>
      )}
      {profile && (
        <Text>
          Contrast uses serialized output over{" "}
          {profile.dark ? "black" : "white"}; the checkerboard and app
          appearance do not affect measurements.
        </Text>
      )}
    </div>
  );
}
