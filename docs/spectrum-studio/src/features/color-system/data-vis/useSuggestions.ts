// Copyright 2026 Adobe. All rights reserved.
import { useMemo } from "react";
import type { SuggestionRequest, SuggestionResult } from "./categorical";
import { usePaletteWorker } from "./usePaletteWorker";

export type SuggestionState =
  | { status: "loading" }
  | { status: "ready"; result: SuggestionResult }
  | { status: "error"; error: string };

export function useSuggestions(
  request: SuggestionRequest,
  contextFingerprint: string,
  enabled = true,
): SuggestionState {
  const fingerprint = JSON.stringify([
    contextFingerprint,
    request.preferences,
    request.background,
    request.gamut,
  ]);
  const task = useMemo(
    () => (enabled ? { kind: "search" as const, request } : null),
    [enabled, request],
  );
  const state = usePaletteWorker(task, fingerprint);
  if (state.status !== "ready") return state;
  return state.output.kind === "result"
    ? { status: "ready", result: state.output.result }
    : {
        status: "error",
        error: "The worker returned an unexpected suggestion response.",
      };
}
