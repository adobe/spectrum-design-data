// Copyright 2026 Adobe. All rights reserved.
import {
  inspectPaletteAsync,
  suggestCategorical,
  type PaletteReport,
  type SuggestionRequest,
  type SuggestionResult,
} from "./categorical";
import { MeasurementCache } from "./measurements";
import type { UiSwatch } from "./resolution";
import type { CategoricalPreferences } from "./model";
import type { RgbGamut } from "../colorMath";

export interface PaletteInspectionRequest {
  id: string;
  members: UiSwatch[];
  preferences: CategoricalPreferences;
  background: string;
  gamut: RgbGamut;
}
export type PaletteInspection =
  | { status: "ready"; report: PaletteReport }
  | { status: "error"; error: string };
export type WorkerTask =
  | { kind: "search"; request: SuggestionRequest }
  | { kind: "inspect"; palettes: PaletteInspectionRequest[] };
export type SuggestionWorkerInput =
  | (WorkerTask & { requestId: number; fingerprint: string })
  | { kind: "cancel"; requestId: number };
export type SuggestionWorkerOutput =
  | {
      kind: "result";
      requestId: number;
      fingerprint: string;
      result: SuggestionResult;
    }
  | {
      kind: "reports";
      requestId: number;
      fingerprint: string;
      reports: Record<string, PaletteInspection>;
    }
  | { kind: "error"; requestId: number; fingerprint: string; error: string };

export function createDataVisWorkerHandler(
  send: (output: SuggestionWorkerOutput) => void,
) {
  const cache = new MeasurementCache();
  const active = new Map<
    WorkerTask["kind"],
    { requestId: number; controller: AbortController }
  >();
  return async (input: SuggestionWorkerInput) => {
    if (input.kind === "cancel") {
      for (const task of active.values())
        if (task.requestId === input.requestId) task.controller.abort();
      return;
    }
    active.get(input.kind)?.controller.abort();
    const controller = new AbortController();
    active.set(input.kind, { requestId: input.requestId, controller });
    const current = () =>
      !controller.signal.aborted &&
      active.get(input.kind)?.controller === controller;
    const context = {
      requestId: input.requestId,
      fingerprint: input.fingerprint,
    };
    try {
      if (input.kind === "search") {
        const result = await suggestCategorical(input.request, {
          cache,
          signal: controller.signal,
        });
        if (current()) send({ kind: "result", ...context, result });
      } else {
        const reports: Record<string, PaletteInspection> = {};
        for (const palette of input.palettes) {
          if (!current()) return;
          try {
            reports[palette.id] = {
              status: "ready",
              report: await inspectPaletteAsync(
                palette.members,
                palette.preferences,
                palette.background,
                palette.gamut,
                { cache, signal: controller.signal },
              ),
            };
          } catch (failure) {
            reports[palette.id] = {
              status: "error",
              error:
                failure instanceof Error ? failure.message : String(failure),
            };
          }
        }
        if (current()) send({ kind: "reports", ...context, reports });
      }
    } catch (failure) {
      if (current())
        send({
          kind: "error",
          ...context,
          error: failure instanceof Error ? failure.message : String(failure),
        });
    }
  };
}
