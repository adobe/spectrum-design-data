// Copyright 2026 Adobe. All rights reserved.
import { useEffect, useRef, useState } from "react";
import { isCurrentSuggestion } from "./requests";
import type {
  SuggestionWorkerInput,
  SuggestionWorkerOutput,
  WorkerTask,
} from "./workerRuntime";

export type PaletteWorkerState =
  | { status: "loading" }
  | {
      status: "ready";
      output: Exclude<SuggestionWorkerOutput, { kind: "error" }>;
    }
  | { status: "error"; error: string };

export function usePaletteWorker(
  task: WorkerTask | null,
  fingerprint: string,
): PaletteWorkerState {
  const worker = useRef<Worker | null>(null),
    current = useRef({ requestId: 0, fingerprint }),
    enabled = task !== null;
  const [state, setState] = useState<{
    fingerprint: string;
    value: PaletteWorkerState;
  }>({ fingerprint, value: { status: "loading" } });
  useEffect(() => {
    if (!enabled) return;
    let mounted = true;
    const fail = (error: string) => {
      if (mounted)
        setState({
          fingerprint: current.current.fingerprint,
          value: { status: "error", error },
        });
    };
    let instance: Worker;
    try {
      instance = new Worker(new URL("./suggestionWorker.ts", import.meta.url), {
        type: "module",
      });
    } catch (failure) {
      queueMicrotask(() =>
        fail(failure instanceof Error ? failure.message : String(failure)),
      );
      return () => {
        mounted = false;
      };
    }
    worker.current = instance;
    instance.onmessage = (event: MessageEvent<SuggestionWorkerOutput>) => {
      const message = event.data;
      if (!isCurrentSuggestion(message, current.current)) return;
      setState({
        fingerprint: message.fingerprint,
        value:
          message.kind === "error"
            ? { status: "error", error: message.error }
            : { status: "ready", output: message },
      });
    };
    instance.onerror = (event) => {
      event.preventDefault();
      fail(event.message || "The color-measurement worker could not run.");
    };
    return () => {
      mounted = false;
      instance.terminate();
      worker.current = null;
    };
  }, [enabled]);
  useEffect(() => {
    current.current.fingerprint = fingerprint;
    const instance = worker.current;
    if (!instance || !task) return;
    const requestId = ++current.current.requestId;
    const input: SuggestionWorkerInput = { ...task, requestId, fingerprint };
    instance.postMessage(input);
    return () => {
      if (worker.current === instance)
        instance.postMessage({
          kind: "cancel",
          requestId,
        } satisfies SuggestionWorkerInput);
    };
  }, [fingerprint, task]);
  return state.fingerprint === fingerprint
    ? state.value
    : { status: "loading" };
}
