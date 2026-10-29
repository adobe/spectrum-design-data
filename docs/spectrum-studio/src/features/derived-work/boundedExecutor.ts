// Copyright 2026 Adobe. All rights reserved.
import type { WorkExecutor } from "./LatestRequest";

export function boundedExecutor<Input, Value, Partial = never>(
  execute: WorkExecutor<Input, Value, Partial>,
  concurrency = 1,
): WorkExecutor<Input, Value, Partial> {
  if (!Number.isInteger(concurrency) || concurrency < 1)
    throw new Error("Work concurrency must be a positive integer.");
  let active = 0;
  const queued: { start: () => void }[] = [];
  const advance = () => {
    while (active < concurrency && queued.length) queued.shift()!.start();
  };
  return (input, signal, progress) =>
    new Promise((resolve, reject) => {
      if (signal.aborted) {
        reject(signal.reason);
        return;
      }
      let started = false;
      const abort = () => {
        if (started) return;
        const index = queued.indexOf(job);
        if (index !== -1) queued.splice(index, 1);
        reject(signal.reason);
      };
      const finish = () => {
        signal.removeEventListener("abort", abort);
        active -= 1;
        advance();
      };
      const job = {
        start: () => {
          started = true;
          active += 1;
          void Promise.resolve()
            .then(() => {
              signal.throwIfAborted();
              return execute(input, signal, progress);
            })
            .then(
              (value) => {
                finish();
                resolve(value);
              },
              (failure: unknown) => {
                finish();
                reject(failure);
              },
            );
        },
      };
      signal.addEventListener("abort", abort, { once: true });
      queued.push(job);
      advance();
    });
}
