// Copyright 2026 Adobe. All rights reserved.
import { useAtom, useAtomValue } from "jotai";
import {
  colorPreviewSourceAtom,
  liveColorDocumentAtom,
  previewRulesAtom,
} from "../../features/edit-session/previewSources";
import { overriddenTokenCountAtom } from "../../features/tokens/state";
import { usePreviewData } from "../analyze/AnalyzeLayout";
import {
  colorAnalysisPreferencesAtom,
  rampSurfaceIdAtom,
  selectedColorScaleIdAtom,
} from "../../state/view/colorSystemView";
import { ColorAnalysisView } from "./ColorAnalysisView";
import { useMemo } from "react";

const COLOR_DRIVERS = ["color.*"];

export function ColorAnalyze() {
  const document = useAtomValue(liveColorDocumentAtom);
  const authored = useAtomValue(colorPreviewSourceAtom);
  const rules = useAtomValue(previewRulesAtom);
  const authoredScaleContrasts = useMemo(
    () =>
      Object.fromEntries(
        authored.scales.flatMap((scale) =>
          scale.customContrasts
            ? [[scale.id, scale.customContrasts.steps]]
            : [],
        ),
      ),
    [authored.scales],
  );
  const overrides = useAtomValue(overriddenTokenCountAtom);
  const isPreview = usePreviewData(COLOR_DRIVERS);
  const selectedScaleId = useAtomValue(selectedColorScaleIdAtom);
  const [preferences, setPreferences] = useAtom(colorAnalysisPreferencesAtom);
  const [surfaceId, setSurfaceId] = useAtom(rampSurfaceIdAtom);
  return (
    <ColorAnalysisView
      document={document}
      authoredContrasts={authored.contrasts}
      rules={rules}
      authoredScaleContrasts={authoredScaleContrasts}
      overrideCount={overrides}
      isPreview={isPreview}
      selectedScaleId={selectedScaleId}
      preferences={preferences}
      onPreferencesChange={setPreferences}
      surfaceId={surfaceId}
      onSurfaceChange={setSurfaceId}
    />
  );
}
