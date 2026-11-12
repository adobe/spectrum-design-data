// Copyright 2026 Adobe. All rights reserved.
/// <reference lib="webworker" />
import { createComponentReferenceWitnesses } from "../components/contrastWitness";
import type { EditSessionSnapshot } from "./state";
import type { WorkerReply } from "../derived-work/workerTask";
import type { PreparedAuthoringResult } from "./recordPreparation";

type Witnesses = Pick<
  PreparedAuthoringResult,
  "componentContrastWitness" | "componentColorWitness"
>;
self.onmessage = (event: MessageEvent<EditSessionSnapshot>) => {
  try {
    self.postMessage({
      type: "ready",
      value: createComponentReferenceWitnesses(event.data),
    } satisfies WorkerReply<Witnesses>);
  } catch (failure) {
    self.postMessage({
      type: "error",
      error: failure instanceof Error ? failure.message : String(failure),
    } satisfies WorkerReply<Witnesses>);
  }
};
