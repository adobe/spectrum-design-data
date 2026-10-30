// Copyright 2026 Adobe. All rights reserved.
import { termLabel } from "../../features/taxonomy/termPresentation";
import { Text } from "@react-spectrum/s2";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { useAtomValue } from "jotai";
import { generatedRadiusAtom } from "../../features/radius/state";
import { FoundationsElementsHeader } from "../FoundationsElementsHeader";
import { RadiusSample } from "./RadiusSample";
import { elementsSurfaceStyleAtom } from "../../state/view/elementsSurface";
import { elementsSurfaceStyles } from "../elementsSurfaceStyles";
import "../chartLayout.css";

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
  const scales = useAtomValue(generatedRadiusAtom);
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
              className={style({ font: "title", margin: 0 })}
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
                  <div className="radiusElementDetails">
                    <Text>
                      {value.name}
                      {value.index === 0 ? " (base)" : ""}
                    </Text>
                    <Text>
                      {Number.isFinite(value.value) && value.value >= 0
                        ? `${value.value}px`
                        : "Unavailable radius"}
                    </Text>
                  </div>
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
