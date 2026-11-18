// Copyright 2026 Adobe. All rights reserved.
import { useAtom, useAtomValue } from "jotai";
import {
  colorSystemDocumentAtom,
  resolvedColorSystemDocumentAtom,
} from "../../features/color-system/state";
import { overriddenTokenCountAtom } from "../../features/tokens/state";
import { usePreviewData } from "../analyze/AnalyzeLayout";
import {
  colorAnalysisPreferencesAtom,
  rampSurfaceIdAtom,
  selectedColorScaleIdAtom,
} from "../../state/view/colorSystemView";
import { ColorAnalysisView } from "./ColorAnalysisView";
import { rulesAtom } from "../../features/logic/library";

const COLOR_DRIVERS = ["color.*"];

export function ColorAnalyze() {
  const document = useAtomValue(resolvedColorSystemDocumentAtom);
  const authored = useAtomValue(colorSystemDocumentAtom);
  const rules = useAtomValue(rulesAtom);
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
      authoredScaleContrasts={Object.fromEntries(
        authored.scales.flatMap((scale) =>
          scale.customContrasts
            ? [[scale.id, scale.customContrasts.steps]]
            : [],
        ),
      )}
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
