// Copyright 2026 Adobe. All rights reserved.
import { useMemo } from "react";
import { inspectPalette } from "./categorical";
import { MeasurementCache } from "./measurements";
import { usePaletteWorker } from "./usePaletteWorker";
import type {
  PaletteInspection,
  PaletteInspectionRequest,
} from "./workerRuntime";

export type PaletteInspectionsState =
  | { status: "loading" }
  | { status: "error"; error: string }
  | { status: "ready"; reports: Record<string, PaletteInspection> };

export function usePaletteInspections(
  palettes: PaletteInspectionRequest[],
  fingerprint: string,
): PaletteInspectionsState {
  const context = JSON.stringify([
    fingerprint,
    palettes.map((palette) => [
      palette.id,
      palette.preferences,
      palette.background,
      palette.gamut,
      palette.members.map((member) => [member.id, member.value]),
    ]),
  ]);
  const cache = useMemo(() => new MeasurementCache(), []);
  const immediate = useMemo(() => {
    if (
      palettes.reduce(
        (count, palette) =>
          count +
          ((palette.members.length * (palette.members.length - 1)) / 2) *
            (1 + palette.preferences.cvdProfiles.length),
        0,
      ) > 2048
    )
      return null;
    const reports: Record<string, PaletteInspection> = {};
    for (const palette of palettes) {
      try {
        reports[palette.id] = {
          status: "ready",
          report: inspectPalette(
            palette.members,
            palette.preferences,
            palette.background,
            palette.gamut,
            cache,
          ),
        };
      } catch (failure) {
        reports[palette.id] = {
          status: "error",
          error: failure instanceof Error ? failure.message : String(failure),
        };
      }
    }
    return reports;
  }, [palettes, cache]);
  const task = useMemo(
    () => (immediate === null ? { kind: "inspect" as const, palettes } : null),
    [immediate, palettes],
  );
  const worker = usePaletteWorker(task, context);
  if (immediate !== null) return { status: "ready", reports: immediate };
  if (worker.status !== "ready") return worker;
  return worker.output.kind === "reports"
    ? { status: "ready", reports: worker.output.reports }
    : {
        status: "error",
        error: "The worker returned an unexpected palette inspection response.",
      };
}
