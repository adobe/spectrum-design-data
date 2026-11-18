// Copyright 2026 Adobe. All rights reserved.
import { termLabel } from "../../features/taxonomy/termPresentation";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { previewScaleNameStyles } from "../previewLabelStyles";
import { useAtomValue, type Atom } from "jotai";
import { generatedSpacingAtom } from "../../features/spacing/state";
import type {
  DimensionScale,
  GeneratedDimensionValue,
} from "../../features/scales/foundation";
import { FoundationsElementsHeader } from "../FoundationsElementsHeader";
import { SpacingBar } from "./SpacingBar";
import { elementsSurfaceStyleAtom } from "../../state/view/elementsSurface";
import { elementsSurfaceStyles } from "../elementsSurfaceStyles";
import "./SpacingElements.css";
import "../chartLayout.css";

const containerStyle = style({
  display: "flex",
  flexDirection: "column",
  gap: 20,
  padding: 16,
  minHeight: "full",
  overflow: "auto",
});
const sectionStyle = style({
  display: "flex",
  flexDirection: "column",
  gap: 8,
  flexGrow: 0,
  minWidth: 0,
});
const gridStyle = style({
  display: "grid",
  gap: 20,
  padding: 16,
  minWidth: 0,
  alignItems: "start",
});

export interface DimensionElementsProps {
  /** Heading and lowercase noun, such as `Spacing` and `spacing`. */
  title: string;
  noun: string;
  generatedAtom: Atom<
    { scale: DimensionScale; values: GeneratedDimensionValue[] }[]
  >;
}

/** Every scale of a dimension foundation as a horizontal row of samples with their values. */
export function DimensionElements({
  title,
  noun,
  generatedAtom,
}: DimensionElementsProps) {
  const scales = useAtomValue(generatedAtom);
  const surfaceStyle = useAtomValue(elementsSurfaceStyleAtom);
  return (
    <div
      data-component={`${title}Elements`}
      className={`${containerStyle} chartComparisonContainer`}
    >
      <FoundationsElementsHeader title={title} />
      <div
        className={`${gridStyle} ${elementsSurfaceStyles} chartComparisonGrid`}
        style={surfaceStyle}
        data-scale-grid
        data-elements-surface
      >
        {scales.map(({ scale, values }) => (
          <section
            key={scale.id}
            aria-labelledby={`${noun}-${scale.id}-heading`}
            className={sectionStyle}
          >
            <h3
              id={`${noun}-${scale.id}-heading`}
              className={previewScaleNameStyles}
            >
              {termLabel(scale.name)}
            </h3>
            <div
              className="spacingScaleList"
              role="list"
              // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- Physical sample lengths may require keyboard scrolling.
              tabIndex={0}
              aria-label={`${termLabel(scale.name)} ${noun} values`}
            >
              {values.map((value) => (
                <SpacingBar
                  key={value.step}
                  step={value.step}
                  value={value.value}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

export function SpacingElements() {
  return (
    <DimensionElements
      title="Spacing"
      noun="spacing"
      generatedAtom={generatedSpacingAtom}
    />
  );
}
