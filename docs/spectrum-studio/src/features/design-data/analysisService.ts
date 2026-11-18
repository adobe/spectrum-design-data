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
/** Wire form: large inputs the worker already holds are replaced by keys. */
export type AnalysisWireJob =
  | AnalysisComparisonRequest
  | (Omit<AnalysisGapRequest, "comparison"> & {
      comparison?: AnalysisComparisonResult;
    })
  | { type: "reference"; url: string; packaged: boolean };
export interface AnalysisMessage {
  id: number;
  referenceKey?: number;
  /** Message id of an earlier comparison whose app input the worker kept. */
  appKey?: number;
  /** Message id of an earlier comparison the worker kept. */
  comparisonKey?: number;
  input: AnalysisWireJob;
}
/** The worker keeps this many recent comparisons for key lookups. */
export const ANALYSIS_KEPT_RESULTS = 3;
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
  // Keys are only valid for the worker instance that produced them.
  let generation = 0;
  const kept = new WeakMap<object, { id: number; generation: number }>();
  const keptId = (value: object | undefined) => {
    const entry = value && kept.get(value);
    return entry && entry.generation === generation ? entry.id : undefined;
  };
  const reset = () => {
    worker?.terminate();
    worker = undefined;
    referenceKey = undefined;
    generation++;
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
                else if (reply.value.type === "compare") {
                  kept.set(reply.value.result, { id, generation });
                  kept.set(reply.value.result.app, { id, generation });
                }
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
            const sameReference = key !== undefined && key === referenceKey;
            let appKey: number | undefined;
            let comparisonKey: number | undefined;
            let wire: AnalysisWireJob = input;
            if (input.type === "compare") {
              appKey = keptId(input.cachedApp);
              wire = {
                ...input,
                ...(sameReference && { reference: undefined }),
                ...(appKey !== undefined && { cachedApp: undefined }),
              };
            } else if (input.type === "gaps") {
              comparisonKey = keptId(input.comparison);
              wire = {
                ...input,
                ...(sameReference && { reference: undefined }),
                ...(comparisonKey !== undefined && { comparison: undefined }),
              };
            }
            const message: AnalysisMessage = {
              id,
              ...(key !== undefined && { referenceKey: key }),
              ...(appKey !== undefined && { appKey }),
              ...(comparisonKey !== undefined && { comparisonKey }),
              input: wire,
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

/**
 * Shares one running load between callers with the same key. A caller that
 * cancels and is immediately replaced (React's development double-mount, for
 * example) keeps the load running; it stops only when nobody is waiting.
 */
export function createSharedLoad<A, T>(
  start: (args: A, signal: AbortSignal) => Promise<T>,
) {
  let shared:
    | {
        key: string;
        controller: AbortController;
        users: number;
        result: Promise<T>;
      }
    | undefined;
  return (args: A, signal: AbortSignal): Promise<T> => {
    if (signal.aborted)
      return Promise.reject(
        new DOMException("Analysis work was superseded.", "AbortError"),
      );
    const key = JSON.stringify(args);
    if (!shared || shared.key !== key || shared.controller.signal.aborted) {
      const controller = new AbortController();
      const entry = {
        key,
        controller,
        users: 0,
        result: start(args, controller.signal),
      };
      const forget = () => {
        if (shared === entry) shared = undefined;
      };
      entry.result.then(forget, forget);
      shared = entry;
    }
    const entry = shared;
    entry.users++;
    return new Promise<T>((resolve, reject) => {
      const leave = () => {
        entry.users--;
        queueMicrotask(() => {
          if (!entry.users) entry.controller.abort();
        });
        reject(new DOMException("Analysis work was superseded.", "AbortError"));
      };
      signal.addEventListener("abort", leave, { once: true });
      entry.result.then(
        (value) => {
          signal.removeEventListener("abort", leave);
          resolve(value);
        },
        (failure: unknown) => {
          signal.removeEventListener("abort", leave);
          reject(failure);
        },
      );
    });
  };
}

const sharedReferenceLoad = createSharedLoad(
  async (
    { url, packaged }: { url: string; packaged: boolean; generation: number },
    signal,
  ) => {
    const value = await analysisService.execute(
      { type: "reference", url, packaged },
      signal,
      () => {},
    );
    if (value.type !== "reference")
      throw new Error("Unexpected Analysis reference response.");
    return value.result;
  },
);

/** `generation` changes when a fresh load is required (a manual refresh). */
export function loadAnalysisReference(
  url: string,
  packaged: boolean,
  signal: AbortSignal,
  generation = 0,
) {
  return sharedReferenceLoad({ url, packaged, generation }, signal);
}
