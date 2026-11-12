// Copyright 2026 Adobe. All rights reserved.
import type { WorkExecutor } from "../derived-work/LatestRequest";
import type { TaskWorker, WorkerReply } from "../derived-work/workerTask";
import type { AnalysisInput } from "./comparison";
import type {
  AnalysisComparisonRequest,
  AnalysisComparisonResult,
  AnalysisGapRequest,
  AnalysisGapResult,
} from "./analysisWork";

export type AnalysisJob =
  | AnalysisComparisonRequest
  | AnalysisGapRequest
  | { type: "reference"; url: string; packaged: boolean };
export type AnalysisValue =
  | { type: "compare"; result: AnalysisComparisonResult }
  | { type: "gaps"; result: AnalysisGapResult }
  | { type: "reference"; result: AnalysisInput };
export interface AnalysisMessage {
  id: number;
  referenceKey?: number;
  input: AnalysisJob;
}
export type AnalysisReply = WorkerReply<AnalysisValue> & { id: number };
type AnalysisWorker = Omit<
  TaskWorker<AnalysisMessage, AnalysisValue>,
  "onmessage"
> & {
  onmessage: ((event: MessageEvent<AnalysisReply>) => void) | null;
};

export function createAnalysisService(createWorker: () => AnalysisWorker) {
  let worker: AnalysisWorker | undefined;
  let sequence = 0;
  let referenceKey: number | undefined;
  let referenceSequence = 0;
  const keys = new WeakMap<AnalysisInput, number>();
  const keyFor = (input: AnalysisInput) => {
    let key = keys.get(input);
    if (key === undefined) {
      key = ++referenceSequence;
      keys.set(input, key);
    }
    return key;
  };
  type Job = {
    start: () => void;
    cancel: () => void;
  };
  let active: Job | undefined;
  let pending: Job | undefined;
  const reset = () => {
    worker?.terminate();
    worker = undefined;
    referenceKey = undefined;
  };
  const execute: WorkExecutor<AnalysisJob, AnalysisValue> = (input, signal) =>
    new Promise((resolve, reject) => {
      let settled = false;
      let timer: ReturnType<typeof setTimeout> | undefined;
      const finish = (failure?: unknown, value?: AnalysisValue) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        signal.removeEventListener("abort", job.cancel);
        if (active === job) {
          if (worker) {
            worker.onmessage = null;
            worker.onerror = null;
            worker.onmessageerror = null;
          }
          active = undefined;
        }
        if (pending === job) pending = undefined;
        if (failure !== undefined) reject(failure);
        else if (value) resolve(value);
        if (!active && pending) {
          const next = pending;
          pending = undefined;
          next.start();
        }
      };
      const job: Job = {
        cancel() {
          if (settled) return;
          if (active === job) reset();
          finish(
            new DOMException("Analysis work was superseded.", "AbortError"),
          );
        },
        start() {
          if (signal.aborted) {
            job.cancel();
            return;
          }
          active = job;
          const id = ++sequence;
          try {
            worker ??= createWorker();
            const currentWorker = worker;
            const fail = (failure: unknown) => {
              if (settled || worker !== currentWorker) return;
              reset();
              finish(failure);
            };
            worker.onmessage = (event) => {
              const reply = event.data;
              if (settled || worker !== currentWorker || reply.id !== id)
                return;
              if (reply.type === "ready") {
                if (reply.value.type === "reference")
                  referenceKey = keyFor(reply.value.result);
                finish(undefined, reply.value);
              } else if (reply.type === "error") {
                fail(new Error(reply.error));
              } else {
                fail(new Error("Unexpected Analysis worker response."));
              }
            };
            worker.onerror = (event) =>
              fail(new Error(event.message || "Analysis worker failed."));
            worker.onmessageerror = () =>
              fail(new Error("Analysis worker response could not be read."));
            timer = setTimeout(
              () =>
                fail(
                  new Error(
                    "Analysis work exceeded its 45-second limit. Retry to restart the worker.",
                  ),
                ),
              45_000,
            );
            const reference =
              "reference" in input ? input.reference : undefined;
            const key = reference && keyFor(reference);
            const message = {
              id,
              ...(key !== undefined && { referenceKey: key }),
              input:
                key !== undefined && key === referenceKey
                  ? { ...input, reference: undefined }
                  : input,
            };
            if (key !== undefined) referenceKey = key;
            worker.postMessage(message);
          } catch (failure) {
            reset();
            finish(failure);
          }
        },
      };
      if (signal.aborted) {
        job.cancel();
        return;
      }
      signal.addEventListener("abort", job.cancel, { once: true });
      if (!active) job.start();
      else {
        const previous = pending;
        pending = job;
        previous?.cancel();
      }
    });
  return {
    execute,
    dispose() {
      const queued = pending;
      pending = undefined;
      queued?.cancel();
      active?.cancel();
      reset();
    },
  };
}

export const analysisService = createAnalysisService(
  () =>
    new Worker(new URL("./analysis.worker.ts", import.meta.url), {
      type: "module",
    }),
);

export const compareAnalysis: WorkExecutor<
  AnalysisComparisonRequest,
  AnalysisComparisonResult
> = async (input, signal, progress) => {
  const value = await analysisService.execute(input, signal, progress);
  if (value.type !== "compare")
    throw new Error("Unexpected Analysis comparison response.");
  return value.result;
};
export const assessAnalysisGaps: WorkExecutor<
  AnalysisGapRequest,
  AnalysisGapResult
> = async (input, signal, progress) => {
  const value = await analysisService.execute(input, signal, progress);
  if (value.type !== "gaps")
    throw new Error("Unexpected Analysis gap response.");
  return value.result;
};

export async function loadAnalysisReference(
  url: string,
  packaged: boolean,
  signal: AbortSignal,
) {
  const value = await analysisService.execute(
    { type: "reference", url, packaged },
    signal,
    () => {},
  );
  if (value.type !== "reference")
    throw new Error("Unexpected Analysis reference response.");
  return value.result;
}
