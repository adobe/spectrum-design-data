// Copyright 2026 Adobe. All rights reserved.
import { useAtomValue } from "jotai";
import { elevationDocumentAtom } from "../../features/elevation/state";
import { modeSetsAtom } from "../../features/modes/state";
import { activeModesAtom } from "../../features/modes/selection";
import { previewOverridesAtom } from "../../features/modes/previewState";
import { opacitySourceAtom } from "../../features/opacity/state";
import { AnalyzePage, usePreviewData } from "../analyze/AnalyzeLayout";
import { ElevationComparison } from "./ElevationComparison";

const PREVIEW_DRIVERS = ["elevation.*"];

export function ElevationAnalyze() {
  const document = useAtomValue(elevationDocumentAtom);
  const modeSets = useAtomValue(modeSetsAtom);
  const activeModes = useAtomValue(activeModesAtom);
  const preview = useAtomValue(previewOverridesAtom);
  const opacitySource = useAtomValue(opacitySourceAtom);
  const previewData = usePreviewData(PREVIEW_DRIVERS);
  return (
    <AnalyzePage
      component="ElevationAnalyze"
      title="Elevation"
      previewData={previewData}
    >
      <ElevationComparison
        document={document}
        modeSets={modeSets}
        activeModes={activeModes}
        preview={preview}
        opacitySource={opacitySource}
      />
    </AnalyzePage>
  );
}
