// Copyright 2026 Adobe. All rights reserved.
import { useAtomValue } from "jotai";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { elevationDocumentAtom } from "../../features/elevation/state";
import { modeSetsAtom } from "../../features/modes/state";
import { activeModesAtom } from "../../features/modes/selection";
import { previewOverridesAtom } from "../../features/modes/previewState";
import { opacitySourceAtom } from "../../features/opacity/state";
import { FoundationsElementsHeader } from "../FoundationsElementsHeader";
import { ElevationComparison } from "./ElevationComparison";

const container = style({
  display: "flex",
  flexDirection: "column",
  gap: 20,
  padding: 16,
  overflow: "auto",
  minWidth: 0,
  minHeight: "full",
});
export function ElevationAnalyze() {
  const document = useAtomValue(elevationDocumentAtom);
  const modeSets = useAtomValue(modeSetsAtom);
  const activeModes = useAtomValue(activeModesAtom);
  const preview = useAtomValue(previewOverridesAtom);
  const opacitySource = useAtomValue(opacitySourceAtom);
  return (
    <div
      className={`${container} chartComparisonContainer`}
      data-component="ElevationAnalyze"
    >
      <FoundationsElementsHeader title="Elevation" />
      <ElevationComparison
        document={document}
        modeSets={modeSets}
        activeModes={activeModes}
        preview={preview}
        opacitySource={opacitySource}
      />
    </div>
  );
}
