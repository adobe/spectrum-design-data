// Copyright 2026 Adobe. All rights reserved.
import { boundedExecutor } from "../derived-work/boundedExecutor";
import { workerTask } from "../derived-work/workerTask";
import type { HighlightRequest } from "./highlight";

export const executeHighlight = boundedExecutor(
  workerTask<HighlightRequest, string[]>(
    () =>
      new Worker(new URL("./highlight.worker.ts", import.meta.url), {
        type: "module",
      }),
  ),
);
