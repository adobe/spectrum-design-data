// Copyright 2026 Adobe. All rights reserved.
import { useDataVisPreview } from "../../../features/color-system/data-vis/useDataVisPreview";
import { usePaletteInspections } from "../../../features/color-system/data-vis/usePaletteInspections";
import type { PaletteInspectionRequest } from "../../../features/color-system/data-vis/workerRuntime";
import { useNumericRuntime } from "../../../features/edit-session/numericContext";

const empty: PaletteInspectionRequest[] = [];
export function useCategoricalChecks() {
  const preview = useDataVisPreview();
  const numeric = useNumericRuntime();
  const state = usePaletteInspections(
    preview.ready?.palettes ?? empty,
    preview.ready?.fingerprint ?? "",
    !!numeric,
  );
  if (preview.status === "unavailable")
    return {
      status: "error" as const,
      error: preview.error ?? "Data vis preview is unavailable.",
    };
  if (!preview.ready) return { status: "loading" as const };
  return state.status === "ready"
    ? { ...state, reports: { ...preview.ready.unavailable, ...state.reports } }
    : state;
}
