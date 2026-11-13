// Copyright 2026 Adobe. All rights reserved.
import { termLabel } from "../../../features/taxonomy/termPresentation";
import { Text } from "@react-spectrum/s2";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { useMemo, type ReactNode } from "react";
import { useAtomValue } from "jotai";
import { dataVisInputDocumentAtom } from "../../../features/color-system/data-vis/state";
import { dataVisBackground } from "../../../features/color-system/data-vis/resolution";
import { DataVisExamples } from "./DataVisExamples";
import { DataVisScaleHeader } from "./DataVisScaleHeader";
import { useDataVisDisplay, type DataVisDisplay } from "./useDataVisDisplay";
import { useCategoricalChecks } from "./useCategoricalChecks";
import { elementsSurfaceStyleAtom } from "../../../state/view/elementsSurface";
import { elementsSurfaceStyles } from "../../elementsSurfaceStyles";

const layout = style({
  padding: 24,
  display: "flex",
  flexDirection: "column",
  gap: 40,
  flexGrow: 1,
  overflow: "auto",
  minHeight: 0,
  minWidth: 0,
});
const error = style({ color: "negative" });

export function DataVisElements() {
  const displays = useDataVisDisplay();
  const document = useAtomValue(dataVisInputDocumentAtom);
  const checks = useCategoricalChecks();
  const surface = useAtomValue(elementsSurfaceStyleAtom);
  return (
    <div
      className={`${layout} ${elementsSurfaceStyles}`}
      style={surface}
      data-elements-surface
      data-component="DataVisElements"
    >
      <h1>Data vis scales</h1>
      {!displays.length && (
        <Text>
          Add a sequential, diverging or categorical scale in the Data vis
          panel.
        </Text>
      )}
      {displays.map((display) => {
        const check =
          checks.status === "ready"
            ? checks.reports[display.definition.id]
            : undefined;
        return (
          <ScalePreview
            key={display.definition.id}
            display={display}
            background={dataVisBackground(document)}
            colorScheme={surface.color === "#000000" ? "light" : "dark"}
          >
            {display.definition.kind === "categorical" &&
              (checks.status === "loading" ? (
                <Text>Checking saved selection targets</Text>
              ) : checks.status === "error" ? (
                <p role="alert" className={error}>
                  {checks.error}
                </p>
              ) : check?.status === "error" ? (
                <p role="alert" className={error}>
                  {check.error}
                </p>
              ) : check?.status === "ready" && check.report.failureCount > 0 ? (
                <p role="status" className={error}>
                  {check.report.failureCount} saved selection targets are unmet
                  in this mode. Review the colors in Analyze; the saved links
                  and order have not changed.
                </p>
              ) : null)}
          </ScalePreview>
        );
      })}
    </div>
  );
}

function ScalePreview({
  display,
  background,
  colorScheme,
  children,
}: {
  display: DataVisDisplay;
  background: string;
  colorScheme: "light" | "dark";
  children: ReactNode;
}) {
  const colors = useMemo(
    () =>
      display.status === "ready"
        ? display.observations.map((observation) => observation.value)
        : [],
    [display],
  );
  const name = termLabel(display.definition.name);
  const kind = display.definition.kind;
  return (
    <section className="dataVisScale">
      <DataVisScaleHeader
        name={name}
        kind={kind}
        colors={colors}
        background={background}
        positions={
          display.status === "ready" && display.continuous
            ? display.observations.map((observation) => observation.position)
            : undefined
        }
      />
      {children}
      {display.status === "error" ? (
        <p role="alert" className={error}>
          {display.error}
        </p>
      ) : (
        <>
          {kind === "categorical" ? (
            <DataVisExamples
              name={name}
              kind={kind}
              colors={colors}
              background={background}
              colorScheme={colorScheme}
            />
          ) : (
            display.continuous && (
              <DataVisExamples
                name={name}
                kind={kind}
                evaluate={display.continuous.evaluate}
                background={background}
                colorScheme={colorScheme}
              />
            )
          )}
          {display.continuous?.diagnostics.map((message) => (
            <Text key={message}>{message}</Text>
          ))}
        </>
      )}
    </section>
  );
}
