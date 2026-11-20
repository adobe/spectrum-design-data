// Copyright 2026 Adobe. All rights reserved.
import { useAtomValue } from "jotai";
import { elevationDocumentAtom } from "../../features/elevation/state";
import { modeSetsAtom } from "../../features/modes/state";
import { activeModesAtom } from "../../features/modes/selection";
import { previewOverridesAtom } from "../../features/modes/previewState";
import { opacitySourceAtom } from "../../features/opacity/state";
import { AnalyzePage, usePreviewData } from "../analyze/AnalyzeLayout";
import { ElevationComparison } from "./ElevationComparison";
import { useNumericRuntime } from "../../features/edit-session/numericContext";
import { useEditorPreview } from "../../features/edit-session/useEditorPreview";
import { DerivedContentBoundary } from "../../components/DerivedContentBoundary";

const PREVIEW_DRIVERS = ["elevation.*"];

export function ElevationAnalyze() {
  const runtime = useNumericRuntime();
  return runtime ? <LiveElevationAnalyze /> : <AcceptedElevationAnalyze />;
}

function LiveElevationAnalyze() {
  const result = useEditorPreview("elevation-analysis", null);
  const ready = result.ready?.value;
  const previewData = usePreviewData(PREVIEW_DRIVERS);
  return (
    <AnalyzePage
      component="ElevationAnalyze"
      title="Elevation"
      previewData={previewData}
    >
      <DerivedContentBoundary
        state={result.status}
        label="Updating Elevation analysis"
        error={result.error}
        onRetry={result.retry}
      >
        {ready?.kind === "elevation-analysis" && (
          <ElevationComparison {...ready} />
        )}
      </DerivedContentBoundary>
    </AnalyzePage>
  );
}

function AcceptedElevationAnalyze() {
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
