// Copyright 2026 Adobe. All rights reserved.
import type { createStore } from "jotai";
import {
  PreviewWorker,
  type PreviewWorkerPort,
} from "../../derived-work/PreviewWorker";
import { numericPreviewSnapshotAtom } from "../../edit-session/numericState";
import { modeSelectionAtom } from "../../modes/selection";
import { previewOverridesAtom } from "../../modes/previewState";
import type { DataVisPreviewInput } from "./previewWork";
import {
  restoreDataVisPreview,
  type BrowserDataVisPreview,
  type DataVisPreview,
} from "./preview";

export interface DataVisPreviewState {
  status: "pending" | "ready" | "unavailable";
  ready?: BrowserDataVisPreview;
  error?: string;
}

export function createDataVisPreviewRuntime(
  store: ReturnType<typeof createStore>,
  createWorker: () => PreviewWorkerPort<DataVisPreviewInput, DataVisPreview>,
) {
  const listeners = new Set<() => void>();
  const initial: DataVisPreviewState = { status: "pending" };
  let state = initial;
  let work: PreviewWorker<DataVisPreviewInput, DataVisPreview> | undefined;
  let stops: (() => void)[] = [];
  const start = () => {
    work = new PreviewWorker(createWorker, (publication) => {
      state = {
        status: publication.status,
        ready:
          publication.status === "ready"
            ? restoreDataVisPreview(publication.value)
            : state.ready,
        error:
          publication.status === "unavailable" ? publication.error : undefined,
      };
      for (const listener of [...listeners]) listener();
    });
    let requested: DataVisPreviewInput | undefined;
    const request = () => {
      const input: DataVisPreviewInput = {
        source: store.get(numericPreviewSnapshotAtom),
        selection: store.get(modeSelectionAtom),
        overrides: store.get(previewOverridesAtom),
      };
      const previous = requested;
      if (
        previous &&
        input.selection === previous.selection &&
        input.overrides === previous.overrides &&
        Object.keys(input.source).length ===
          Object.keys(previous.source).length &&
        Object.keys(input.source).every((key) => {
          const field = key as keyof DataVisPreviewInput["source"];
          return input.source[field] === previous.source[field];
        })
      )
        return;
      requested = input;
      work?.request(input);
    };
    stops = [
      store.sub(numericPreviewSnapshotAtom, request),
      store.sub(modeSelectionAtom, request),
      store.sub(previewOverridesAtom, request),
    ];
    request();
  };
  return {
    getSnapshot: () => state,
    retry: () => work?.retry(),
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      if (listeners.size === 1) start();
      return () => {
        listeners.delete(listener);
        if (listeners.size) return;
        for (const stop of stops) stop();
        stops = [];
        work?.dispose();
        work = undefined;
        state = initial;
      };
    },
  };
}
