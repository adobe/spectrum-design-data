// Copyright 2026 Adobe. All rights reserved.
/// <reference lib="webworker" />
import {
  computeTypographyPreview,
  type TypographyPreviewInput,
  type TypographyPreviewOutput,
} from "./previewWork";
import type {
  PreviewReply,
  PreviewRequest,
} from "../derived-work/PreviewWorker";

self.onmessage = ({
  data,
}: MessageEvent<PreviewRequest<TypographyPreviewInput>>) => {
  let reply: PreviewReply<TypographyPreviewOutput>["reply"];
  try {
    reply = { type: "ready", value: computeTypographyPreview(data.input) };
  } catch (failure) {
    reply = {
      type: "error",
      error: failure instanceof Error ? failure.message : String(failure),
    };
  }
  self.postMessage({
    id: data.id,
    reply,
  } satisfies PreviewReply<TypographyPreviewOutput>);
};
