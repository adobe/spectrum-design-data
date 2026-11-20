// Copyright 2026 Adobe. All rights reserved.
import type {
  PreviewRequest,
  PreviewReply,
} from "../../derived-work/PreviewWorker";
import {
  computeDataVisAnalysis,
  type DataVisAnalysisInput,
  type DataVisAnalysisOutput,
} from "./analysisWork";
import { MeasurementCache } from "./measurements";

const cache = new MeasurementCache();
self.onmessage = ({
  data,
}: MessageEvent<PreviewRequest<DataVisAnalysisInput>>) => {
  let response: PreviewReply<DataVisAnalysisOutput>;
  try {
    response = {
      id: data.id,
      reply: {
        type: "ready",
        value: computeDataVisAnalysis(data.input, cache),
      },
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
