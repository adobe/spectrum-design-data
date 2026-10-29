// Copyright 2026 Adobe. All rights reserved.
// Prism's optional string-message protocol must not listen to our typed worker messages.
if (
  typeof WorkerGlobalScope !== "undefined" &&
  globalThis instanceof WorkerGlobalScope
) {
  Object.defineProperty(globalThis, "Prism", {
    value: { disableWorkerMessageHandler: true },
    configurable: true,
    writable: true,
  });
}
