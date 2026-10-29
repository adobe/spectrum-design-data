// Copyright 2026 Adobe. All rights reserved.
/// <reference lib="webworker" />
import { prepareAuthoringRecord } from "./recordPreparation";
import type { EditSessionSnapshot } from "./state";
import type { AuthoringRecord } from "./storage";
import type { WorkerReply } from "../derived-work/workerTask";
import type { PreparedAuthoringResult } from "./recordPreparation";
import { createComponentReferenceWitnesses } from "../components/contrastWitness";

self.onmessage = (
  event: MessageEvent<AuthoringRecord<EditSessionSnapshot>>,
) => {
  try {
    const record = prepareAuthoringRecord(event.data);
    self.postMessage({
      type: "ready",
      value: { record, ...createComponentReferenceWitnesses(record.working) },
    } satisfies WorkerReply<PreparedAuthoringResult>);
  } catch (failure) {
    self.postMessage({
      type: "error",
      error: failure instanceof Error ? failure.message : String(failure),
    } satisfies WorkerReply<PreparedAuthoringResult>);
  }
};
