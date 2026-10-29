// Copyright 2026 Adobe. All rights reserved.
import {
  createDataVisWorkerHandler,
  type SuggestionWorkerInput,
} from "./workerRuntime";

const handle = createDataVisWorkerHandler((output) => self.postMessage(output));
self.addEventListener(
  "message",
  (event: MessageEvent<SuggestionWorkerInput>) => {
    void handle(event.data);
  },
);
