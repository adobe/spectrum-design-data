// Copyright 2026 Adobe. All rights reserved.
/// <reference lib="webworker" />
import {
  computeColorAnalysis,
  type ColorAnalysisInput,
  type ColorAnalysisOutput,
} from "./analysisWork";
import type {
  PreviewReply,
  PreviewRequest,
} from "../derived-work/PreviewWorker";

self.onmessage = ({
  data,
}: MessageEvent<PreviewRequest<ColorAnalysisInput>>) => {
  let reply: PreviewReply<ColorAnalysisOutput>["reply"];
  try {
    reply = { type: "ready", value: computeColorAnalysis(data.input) };
  } catch (failure) {
    reply = {
      type: "error",
      error: failure instanceof Error ? failure.message : String(failure),
    };
  }
  self.postMessage({
    id: data.id,
    reply,
  } satisfies PreviewReply<ColorAnalysisOutput>);
};
