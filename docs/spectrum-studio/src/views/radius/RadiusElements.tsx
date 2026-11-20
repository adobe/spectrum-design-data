// Copyright 2026 Adobe. All rights reserved.
import { termLabel } from "../../features/taxonomy/termPresentation";
import { Text } from "@react-spectrum/s2";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { useAtomValue, type ExtractAtomValue } from "jotai";
import { generatedRadiusAtom } from "../../features/radius/state";
import { FoundationsElementsHeader } from "../FoundationsElementsHeader";
import { RadiusSample } from "./RadiusSample";
import { elementsSurfaceStyleAtom } from "../../state/view/elementsSurface";
import { elementsSurfaceStyles } from "../elementsSurfaceStyles";
import {
  previewLabelStyles,
  previewScaleNameStyles,
} from "../previewLabelStyles";
import "../chartLayout.css";
import { useNumericRuntime } from "../../features/edit-session/numericContext";
import { useEditorPreview } from "../../features/edit-session/useEditorPreview";
import { DerivedContentBoundary } from "../../components/DerivedContentBoundary";

const container = style({
  display: "flex",
  flexDirection: "column",
  gap: 20,
  padding: 16,
  minWidth: 0,
  minHeight: "full",
  overflow: "auto",
});
const grid = style({
  display: "grid",
  gap: 20,
  padding: 16,
  minWidth: 0,
  alignItems: "start",
});
const section = style({
  display: "flex",
  flexDirection: "column",
  gap: 12,
  minWidth: 0,
});

export function RadiusElements() {
  return useNumericRuntime() ? (
    <LiveRadiusElements />
  ) : (
    <AcceptedRadiusElements />
  );
}
function LiveRadiusElements() {
  const result = useEditorPreview("radius", null);
  return (
    <DerivedContentBoundary
      state={result.status}
      label="Updating radius preview"
      error={result.error}
      onRetry={result.retry}
    >
      {result.ready?.value.kind === "dimension" && (
        <RadiusElementsContent scales={result.ready.value.scales} />
      )}
    </DerivedContentBoundary>
  );
}
function AcceptedRadiusElements() {
  const scales = useAtomValue(generatedRadiusAtom);
  return <RadiusElementsContent scales={scales} />;
}
function RadiusElementsContent({
  scales,
}: {
  scales: ExtractAtomValue<typeof generatedRadiusAtom>;
}) {
  const surfaceStyle = useAtomValue(elementsSurfaceStyleAtom);
  return (
    <div
      className={`${container} chartComparisonContainer`}
      data-component="RadiusElements"
    >
      <FoundationsElementsHeader title="Corner radius" />
      <div
        className={`${grid} ${elementsSurfaceStyles} chartComparisonGrid`}
        style={surfaceStyle}
        data-scale-grid
        data-elements-surface
      >
        {scales.map(({ scale, values }) => (
          <section
            key={scale.id}
            className={section}
            aria-labelledby={`${scale.id}-radius-heading`}
          >
            <h3
              id={`${scale.id}-radius-heading`}
              className={previewScaleNameStyles}
            >
              {termLabel(scale.name)}
            </h3>
            <ul
              className="radiusScaleList"
              aria-label={`${termLabel(scale.name)} radius values`}
            >
              {values.map((value) => (
                <li key={value.step} className="radiusElement">
                  <RadiusSample radius={value.value} label={value.name} />
                  <p className={`${previewLabelStyles} radiusElementDetails`}>
                    <span>
                      {value.name}
                      {value.index === 0 ? " (base)" : ""}
                    </span>
                    <span>
                      {Number.isFinite(value.value) && value.value >= 0
                        ? `${value.value}px`
                        : "Unavailable radius"}
                    </span>
                  </p>
                </li>
              ))}
            </ul>
            {values.some((value) => value.value > 56) && (
              <Text>
                Large radii are limited visually by the 56 px sample; token
                values are unchanged.
              </Text>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
