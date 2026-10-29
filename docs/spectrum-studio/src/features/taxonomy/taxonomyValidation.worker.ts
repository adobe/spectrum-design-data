// Copyright 2026 Adobe. All rights reserved.
/// <reference lib="webworker" />
import {
  computeTaxonomyValidation,
  type TaxonomyValidationRequest,
  type TaxonomyValidationResult,
} from "./referenceValidation";
import type { WorkerReply } from "../derived-work/workerTask";

declare const self: DedicatedWorkerGlobalScope;
self.onmessage = (event: MessageEvent<TaxonomyValidationRequest>) => {
  const reply: WorkerReply<TaxonomyValidationResult> = {
    type: "ready",
    value: computeTaxonomyValidation(event.data),
  };
  self.postMessage(reply);
};
