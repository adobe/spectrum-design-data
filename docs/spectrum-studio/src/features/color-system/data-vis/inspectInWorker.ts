// Copyright 2026 Adobe. All rights reserved.
import type { PaletteReport } from "./categorical";
import type {
  PaletteInspectionRequest,
  SuggestionWorkerInput,
  SuggestionWorkerOutput,
} from "./workerRuntime";

export function inspectInWorker(
  palette: PaletteInspectionRequest,
  signal?: AbortSignal,
): Promise<PaletteReport> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new Error("Applying the selection was cancelled."));
      return;
    }
    const worker = new Worker(
      new URL("./suggestionWorker.ts", import.meta.url),
      { type: "module" },
    );
    const cleanup = () => {
      worker.terminate();
      signal?.removeEventListener("abort", cancel);
    };
    const cancel = () => {
      cleanup();
      reject(new Error("Applying the selection was cancelled."));
    };
    signal?.addEventListener("abort", cancel, { once: true });
    worker.onerror = (event) => {
      event.preventDefault();
      cleanup();
      reject(new Error(event.message || "The selection could not be checked."));
    };
    worker.onmessage = (event: MessageEvent<SuggestionWorkerOutput>) => {
      const message = event.data;
      if (message.requestId !== 1) return;
      cleanup();
      if (message.kind === "error") reject(new Error(message.error));
      else if (message.kind !== "reports" || !message.reports[palette.id])
        reject(
          new Error("The worker returned an incomplete selection report."),
        );
      else {
        const result = message.reports[palette.id];
        if (result.status === "error") reject(new Error(result.error));
        else resolve(result.report);
      }
    };
    try {
      worker.postMessage({
        kind: "inspect",
        requestId: 1,
        fingerprint: "apply",
        palettes: [palette],
      } satisfies SuggestionWorkerInput);
    } catch (failure) {
      cleanup();
      reject(failure);
    }
  });
}
