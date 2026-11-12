// Copyright 2026 Adobe. All rights reserved.
/// <reference lib="webworker" />
import { prepareAuthoringResult } from "./recordPreparation";
import type { EditSessionSnapshot } from "./state";
import type { AuthoringRecord } from "./storage";
import type { WorkerReply } from "../derived-work/workerTask";
import type { PreparedAuthoringResult } from "./recordPreparation";

self.onmessage = (
  event: MessageEvent<AuthoringRecord<EditSessionSnapshot>>,
) => {
  try {
    self.postMessage({
      type: "ready",
      value: prepareAuthoringResult(event.data),
    } satisfies WorkerReply<PreparedAuthoringResult>);
  } catch (failure) {
    self.postMessage({
      type: "error",
      error: failure instanceof Error ? failure.message : String(failure),
    } satisfies WorkerReply<PreparedAuthoringResult>);
  }
};
