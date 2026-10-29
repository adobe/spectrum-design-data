// Copyright 2026 Adobe. All rights reserved.
/// <reference lib="webworker" />
import {
  buildTshirtArtifacts,
  type TshirtAuthoringSource,
  type TshirtArtifactBundle,
} from "./tshirtArtifacts";
import type { WorkerReply } from "../derived-work/workerTask";

self.onmessage = (event: MessageEvent<TshirtAuthoringSource>) => {
  try {
    self.postMessage({
      type: "ready",
      value: buildTshirtArtifacts(event.data, "working"),
    } satisfies WorkerReply<TshirtArtifactBundle>);
  } catch (failure) {
    self.postMessage({
      type: "error",
      error: failure instanceof Error ? failure.message : String(failure),
    } satisfies WorkerReply<TshirtArtifactBundle>);
  }
};
