// Copyright 2026 Adobe. All rights reserved.
/// <reference lib="webworker" />
import {
  computeDimensionWork,
  type DimensionWorkOutput,
  type DimensionWorkRequest,
} from "./dimensionWork";
import type { WorkerReply } from "../derived-work/workerTask";

self.onmessage = async (event: MessageEvent<DimensionWorkRequest>) => {
  try {
    self.postMessage({
      type: "ready",
      value: await computeDimensionWork(event.data),
    } satisfies WorkerReply<DimensionWorkOutput>);
  } catch (failure) {
    self.postMessage({
      type: "error",
      error: failure instanceof Error ? failure.message : String(failure),
    } satisfies WorkerReply<DimensionWorkOutput>);
  }
};
