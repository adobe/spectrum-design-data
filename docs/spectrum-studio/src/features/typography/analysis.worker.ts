// Copyright 2026 Adobe. All rights reserved.
/// <reference lib="webworker" />
import {
  computeTypographyAnalysis,
  type TypographyAnalysisInput,
  type TypographyAnalysisOutput,
} from "./analysisWork";
import type {
  PreviewReply,
  PreviewRequest,
} from "../derived-work/PreviewWorker";

self.onmessage = ({
  data,
}: MessageEvent<PreviewRequest<TypographyAnalysisInput>>) => {
  let reply: PreviewReply<TypographyAnalysisOutput>["reply"];
  try {
    reply = { type: "ready", value: computeTypographyAnalysis(data.input) };
  } catch (failure) {
    reply = {
      type: "error",
      error: failure instanceof Error ? failure.message : String(failure),
    };
  }
  self.postMessage({
    id: data.id,
    reply,
  } satisfies PreviewReply<TypographyAnalysisOutput>);
};
