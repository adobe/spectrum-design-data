// Copyright 2026 Adobe. All rights reserved.
import { useCallback, useEffect, useRef, useState } from "react";
import type { DerivedState } from "./LatestRequest";
import { PreviewWorker, type PreviewWorkerPort } from "./PreviewWorker";

export function usePreviewWorker<Input extends object, Value>(
  input: Input,
  createWorker: () => PreviewWorkerPort<Input, Value>,
) {
  const current = useRef<PreviewWorker<Input, Value> | undefined>(undefined);
  const [publication, publish] = useState<DerivedState<Input, Value>>();
  const [ready, keepReady] = useState<{ input: Input; value: Value }>();
  useEffect(() => {
    const work = new PreviewWorker(createWorker, (state) => {
      publish(state);
      if (state.status === "ready")
        keepReady({ input: state.input, value: state.value });
    });
    current.current = work;
    return () => {
      work.dispose();
      current.current = undefined;
    };
  }, [createWorker]);
  useEffect(() => {
    current.current?.request(input);
  }, [input, createWorker]);
  const retry = useCallback(() => current.current?.retry(), []);
  const state = publication?.input === input ? publication : undefined;
  return {
    status: state?.status ?? "pending",
    error: state?.status === "unavailable" ? state.error : undefined,
    ready,
    retry,
  };
}
