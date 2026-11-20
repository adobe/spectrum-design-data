// Copyright 2026 Adobe. All rights reserved.
/// <reference lib="webworker" />
import {
  computeElevationComparison,
  type ElevationComparisonInput,
} from "./comparisonWork";
import type {
  PreviewReply,
  PreviewRequest,
} from "../derived-work/PreviewWorker";

self.onmessage = ({
  data,
}: MessageEvent<PreviewRequest<ElevationComparisonInput>>) => {
  let reply: PreviewReply<
    ReturnType<typeof computeElevationComparison>
  >["reply"];
  try {
    reply = { type: "ready", value: computeElevationComparison(data.input) };
  } catch (failure) {
    reply = {
      type: "error",
      error: failure instanceof Error ? failure.message : String(failure),
    };
  }
  self.postMessage({ id: data.id, reply } satisfies PreviewReply<
    ReturnType<typeof computeElevationComparison>
  >);
};
