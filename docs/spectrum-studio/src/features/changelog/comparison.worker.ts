// Copyright 2026 Adobe. All rights reserved.
import type {
  ComparisonOutput,
  ComparisonProgress,
  ComparisonRequest,
} from "./comparisonWork";
import type { WorkerReply } from "../derived-work/workerTask";
import { computeComparison } from "./computeComparison";

self.onmessage = (event: MessageEvent<ComparisonRequest>) => {
  const publish = (
    message: WorkerReply<ComparisonOutput, ComparisonProgress>,
  ) => self.postMessage(message);
  try {
    const value = computeComparison(event.data, (partial) =>
      publish({ type: "partial", value: partial }),
    );
    publish({ type: "ready", value });
  } catch (failure) {
    publish({
      type: "error",
      error: failure instanceof Error ? failure.message : String(failure),
    });
  }
};
