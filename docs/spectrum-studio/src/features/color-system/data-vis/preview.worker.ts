// Copyright 2026 Adobe. All rights reserved.
import type {
  PreviewRequest,
  PreviewReply,
} from "../../derived-work/PreviewWorker";
import { computeDataVisPreview, type DataVisPreviewInput } from "./previewWork";
import type { DataVisPreview } from "./preview";

self.onmessage = ({
  data,
}: MessageEvent<PreviewRequest<DataVisPreviewInput>>) => {
  let response: PreviewReply<DataVisPreview>;
  try {
    response = {
      id: data.id,
      reply: { type: "ready", value: computeDataVisPreview(data.input) },
    };
  } catch (failure) {
    response = {
      id: data.id,
      reply: {
        type: "error",
        error: failure instanceof Error ? failure.message : String(failure),
      },
    };
  }
  self.postMessage(response);
};
