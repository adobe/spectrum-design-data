// Copyright 2026 Adobe. All rights reserved.
/// <reference lib="webworker" />
import "./prismEnvironment";
import { highlightCode, type HighlightRequest } from "./highlight";
import type { WorkerReply } from "../derived-work/workerTask";

self.onmessage = (event: MessageEvent<HighlightRequest>) => {
  try {
    self.postMessage({
      type: "ready",
      value: highlightCode(event.data),
    } satisfies WorkerReply<string[]>);
  } catch (failure) {
    self.postMessage({
      type: "error",
      error: failure instanceof Error ? failure.message : String(failure),
    } satisfies WorkerReply<string[]>);
  }
};
