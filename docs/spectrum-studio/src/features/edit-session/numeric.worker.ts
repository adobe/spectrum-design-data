// Copyright 2026 Adobe. All rights reserved.
/// <reference lib="webworker" />
import {
  prepareNumericWork,
  type NumericWorkInput,
  type NumericWorkOutput,
} from "./numericWork";
import type { WorkerReply } from "../derived-work/workerTask";

self.onmessage = ({ data }: MessageEvent<NumericWorkInput>) => {
  let reply: WorkerReply<NumericWorkOutput>;
  try {
    reply = { type: "ready", value: prepareNumericWork(data) };
  } catch (failure) {
    reply = {
      type: "error",
      error: failure instanceof Error ? failure.message : String(failure),
    };
  }
  self.postMessage(reply);
};
