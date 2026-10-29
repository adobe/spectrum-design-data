// Copyright 2026 Adobe. All rights reserved.
import { Checkbox, Text } from "@react-spectrum/s2";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { useAtomValue } from "jotai";
import { useState } from "react";
import {
  generatedElevationAtom,
  resolvedElevationAtom,
} from "../../features/elevation/state";
import { taxonomyDocumentAtom } from "../../features/taxonomy/state";
import { elevationTokenName } from "../../features/elevation/output";
import { FoundationsElementsHeader } from "../FoundationsElementsHeader";
import { ShadowSample } from "./ShadowSample";
import { elementsSurfaceStyleAtom } from "../../state/view/elementsSurface";
import { elementsSurfaceStyles } from "../elementsSurfaceStyles";

const container = style({
  display: "flex",
  flexDirection: "column",
  gap: 20,
  padding: 16,
  minWidth: 0,
  minHeight: "full",
  overflow: "auto",
});
const list = style({
  display: "flex",
  flexDirection: "column",
  gap: 40,
  padding: 32,
  margin: 0,
  listStyleType: "none",
});
const row = style({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: 32,
  minWidth: 0,
});
export function ElevationElements() {
  const surfaceStyle = useAtomValue(elementsSurfaceStyleAtom);
  const document = useAtomValue(resolvedElevationAtom);
  const levels = useAtomValue(generatedElevationAtom);
  const registry = useAtomValue(taxonomyDocumentAtom);
  const [showValues, setShowValues] = useState(true);
  return (
    <div className={container} data-component="ElevationElements">
      <FoundationsElementsHeader title="Elevation" />
      <Checkbox isSelected={showValues} onChange={setShowValues}>
        Show values
      </Checkbox>
      {!levels.length && (
        <Text>
          No shadows. Add a shadow in the Elevation panel to create a scale.
        </Text>
      )}
      <ul
        className={`${list} ${elementsSurfaceStyles}`}
        style={{
          ...surfaceStyle,
          colorScheme: surfaceStyle.color === "#000000" ? "light" : "dark",
        }}
        data-elements-surface
        aria-label="Elevation values"
      >
        {levels.map((level) => {
          const name = elevationTokenName(document, level, registry);
          return (
            <li key={level.id} className={row} data-elevation-id={level.id}>
              <ShadowSample shadows={level.shadows} label={`${name} shadow`} />
              <div>
                <Text>
                  {name}
                  {level.index === 0 ? " (base)" : ""}
                </Text>
                {showValues && (
                  <details>
                    <summary>Shadow values</summary>
                    {level.shadows.map((shadow) => (
                      <p key={shadow.layerId}>
                        {
                          document.layers.find(
                            (layer) => layer.id === shadow.layerId,
                          )?.label
                        }
                        : blur {shadow.blur}px, vertical offset {shadow.offsetY}
                        px, opacity {shadow.opacity * 100}%
                      </p>
                    ))}
                  </details>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
