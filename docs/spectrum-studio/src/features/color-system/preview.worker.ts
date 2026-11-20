// Copyright 2026 Adobe. All rights reserved.
/// <reference lib="webworker" />
import {
  computeColorPreview,
  type ColorPreviewInput,
  type ColorPreviewOutput,
} from "./previewWork";
import type {
  PreviewReply,
  PreviewRequest,
} from "../derived-work/PreviewWorker";

self.onmessage = ({
  data,
}: MessageEvent<PreviewRequest<ColorPreviewInput>>) => {
  let reply: PreviewReply<ColorPreviewOutput>["reply"];
  try {
    reply = { type: "ready", value: computeColorPreview(data.input) };
  } catch (failure) {
    reply = {
      type: "error",
      error: failure instanceof Error ? failure.message : String(failure),
    };
  }
  self.postMessage({
    id: data.id,
    reply,
  } satisfies PreviewReply<ColorPreviewOutput>);
};
