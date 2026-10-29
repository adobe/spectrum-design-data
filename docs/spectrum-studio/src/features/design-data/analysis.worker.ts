// Copyright 2026 Adobe. All rights reserved.
/// <reference lib="webworker" />
import {
  computeAnalysisComparison,
  computeAnalysisGaps,
  type AnalysisComparisonRequest,
  type AnalysisComparisonResult,
  type AnalysisGapRequest,
  type AnalysisGapResult,
} from "./analysisWork";
import type { WorkerReply } from "../derived-work/workerTask";

self.onmessage = async (
  event: MessageEvent<AnalysisComparisonRequest | AnalysisGapRequest>,
) => {
  try {
    const value =
      event.data.type === "compare"
        ? await computeAnalysisComparison(event.data)
        : computeAnalysisGaps(event.data);
    self.postMessage({ type: "ready", value } satisfies WorkerReply<
      AnalysisComparisonResult | AnalysisGapResult
    >);
  } catch (failure) {
    self.postMessage({
      type: "error",
      error: failure instanceof Error ? failure.message : String(failure),
    } satisfies WorkerReply<never>);
  }
};
