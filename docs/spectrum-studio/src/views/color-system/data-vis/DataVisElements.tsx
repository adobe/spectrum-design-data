// Copyright 2026 Adobe. All rights reserved.
import { termLabel } from "../../../features/taxonomy/termPresentation";
import { Badge, Text } from "@react-spectrum/s2";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { useAtomValue } from "jotai";
import { dataVisInputDocumentAtom } from "../../../features/color-system/data-vis/state";
import { dataVisBackground } from "../../../features/color-system/data-vis/resolution";
import { ScaleColorPreview } from "../ScaleColorPreview";
import { DataVisExamples } from "./DataVisExamples";
import { useDataVisDisplay } from "./useDataVisDisplay";
import { useCategoricalChecks } from "./useCategoricalChecks";
import { elementsSurfaceStyleAtom } from "../../../state/view/elementsSurface";
import { elementsSurfaceStyles } from "../../elementsSurfaceStyles";

const layout = style({
  padding: 24,
  display: "flex",
  flexDirection: "column",
  gap: 24,
  flexGrow: 1,
  overflow: "auto",
  minHeight: 0,
  minWidth: 0,
});
const section = style({ display: "flex", flexDirection: "column", gap: 12 });
const values = style({ display: "flex", flexWrap: "wrap", gap: 8 });
const color = style({
  width: 36,
  height: 36,
  borderRadius: "sm",
  borderStyle: "solid",
  borderWidth: 1,
  borderColor: "gray-200",
});
const error = style({ color: "negative" });

export function DataVisElements() {
  const displays = useDataVisDisplay(),
    document = useAtomValue(dataVisInputDocumentAtom),
    checks = useCategoricalChecks();
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
          <section className={section} key={display.definition.id}>
            <h2>{termLabel(display.definition.name)}</h2>
            <Badge variant="neutral">{display.definition.kind}</Badge>
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
            {display.status === "error" ? (
              <p role="alert" className={error}>
                {display.error}
              </p>
            ) : (
              <>
                <ScaleColorPreview
                  colors={display.observations.map(
                    (observation) => observation.value,
                  )}
                  interpolation={
                    display.definition.kind === "sequential"
                      ? "oklch"
                      : undefined
                  }
                  positions={
                    display.continuous
                      ? display.observations.map(
                          (observation) => observation.position,
                        )
                      : undefined
                  }
                  continuous={!!display.continuous}
                  label={`${termLabel(display.definition.name)} colors`}
                />
                <div
                  className={values}
                  style={{
                    background: dataVisBackground(document),
                    padding: 12,
                  }}
                  aria-label={`${termLabel(display.definition.name)} swatches`}
                >
                  {display.observations.map((observation) => (
                    <span
                      key={observation.id}
                      role="img"
                      aria-label={`${observation.label}: ${observation.value}`}
                      className={color}
                      style={{ background: observation.value }}
                      title={`${observation.label}: ${observation.value}`}
                    />
                  ))}
                </div>
                <DataVisExamples
                  name={termLabel(display.definition.name)}
                  colors={display.observations.map(
                    (observation) => observation.value,
                  )}
                  evaluate={display.continuous?.evaluate}
                  diverging={display.definition.kind === "diverging"}
                />
                {display.continuous && (
                  <Text>
                    Swatches are display samples, not the function's authored
                    color count.
                  </Text>
                )}
                {display.continuous?.diagnostics.map((message) => (
                  <Text key={message}>{message}</Text>
                ))}
              </>
            )}
          </section>
        );
      })}
    </div>
  );
}
