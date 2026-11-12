// Copyright 2026 Adobe. All rights reserved.
/// <reference lib="webworker" />
import {
  buildTshirtArtifacts,
  type TshirtAuthoringSource,
} from "./tshirtArtifacts";
import { prepareTshirtWorkResult, type TshirtWorkResult } from "./tshirtCache";
import type { WorkerReply } from "../derived-work/workerTask";

self.onmessage = async (event: MessageEvent<TshirtAuthoringSource>) => {
  try {
    const bundle = buildTshirtArtifacts(event.data, "working");
    self.postMessage({
      type: "ready",
      value: await prepareTshirtWorkResult(event.data, bundle),
    } satisfies WorkerReply<TshirtWorkResult>);
  } catch (failure) {
    self.postMessage({
      type: "error",
      error: failure instanceof Error ? failure.message : String(failure),
    } satisfies WorkerReply<TshirtWorkResult>);
  }
};
