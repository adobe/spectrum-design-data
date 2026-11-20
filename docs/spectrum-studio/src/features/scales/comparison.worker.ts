// Copyright 2026 Adobe. All rights reserved.
/// <reference lib="webworker" />
import {
  buildDimensionComparisons,
  type DimensionComparisonInput,
  type DimensionComparisons,
} from "./dimensionComparisons";
import type {
  PreviewReply,
  PreviewRequest,
} from "../derived-work/PreviewWorker";

self.onmessage = ({
  data,
}: MessageEvent<
  PreviewRequest<{
    input: DimensionComparisonInput;
    parameter?: string;
  }>
>) => {
  let reply: PreviewReply<DimensionComparisons>["reply"];
  try {
    reply = {
      type: "ready",
      value: buildDimensionComparisons(data.input.input, data.input.parameter),
    };
  } catch (failure) {
    reply = {
      type: "error",
      error: failure instanceof Error ? failure.message : String(failure),
    };
  }
  self.postMessage({
    id: data.id,
    reply,
  } satisfies PreviewReply<DimensionComparisons>);
};
