// Copyright 2026 Adobe. All rights reserved.
import type { WorkExecutor } from "./LatestRequest";

export type WorkerReply<Value, Partial = never> =
  | { type: "partial"; value: Partial }
  | { type: "ready"; value: Value }
  | { type: "error"; error: string };

export interface TaskWorker<Input, Value, Partial = never> {
  onmessage:
    | ((event: MessageEvent<WorkerReply<Value, Partial>>) => void)
    | null;
  onerror: ((event: ErrorEvent) => void) | null;
  onmessageerror: ((event: MessageEvent) => void) | null;
  postMessage(input: Input): void;
  terminate(): void;
}

export function workerTask<Input, Value, Partial = never>(
  createWorker: () => TaskWorker<Input, Value, Partial>,
): WorkExecutor<Input, Value, Partial> {
  return (input, signal, progress) =>
    new Promise((resolve, reject) => {
      if (signal.aborted) {
        reject(new DOMException("Work was superseded.", "AbortError"));
        return;
      }
      const worker = createWorker();
      let settled = false;
      const dispose = () => {
        if (settled) return;
        settled = true;
        signal.removeEventListener("abort", abort);
        worker.onmessage = null;
        worker.onerror = null;
        worker.onmessageerror = null;
        worker.terminate();
      };
      const abort = () => {
        dispose();
        reject(new DOMException("Work was superseded.", "AbortError"));
      };
      signal.addEventListener("abort", abort, { once: true });
      worker.onmessage = (event: MessageEvent<WorkerReply<Value, Partial>>) => {
        if (settled) return;
        try {
          if (event.data.type === "partial") progress(event.data.value);
          else {
            dispose();
            if (event.data.type === "ready") resolve(event.data.value);
            else
              reject(
                new Error(
                  event.data.type === "error"
                    ? event.data.error
                    : "Unexpected worker response.",
                ),
              );
          }
        } catch (failure) {
          dispose();
          reject(failure);
        }
      };
      worker.onerror = (event) => {
        if (settled) return;
        dispose();
        reject(
          new Error(
            event.message || "The computation worker could not finish.",
          ),
        );
      };
      worker.onmessageerror = () => {
        if (settled) return;
        dispose();
        reject(new Error("The computation worker's result could not be read."));
      };
      try {
        worker.postMessage(input);
      } catch (failure) {
        dispose();
        reject(failure);
      }
    });
}
