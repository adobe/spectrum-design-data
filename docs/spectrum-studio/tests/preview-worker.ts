// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import type { DerivedState } from "../src/features/derived-work/LatestRequest";
import {
  PreviewWorker,
  type PreviewReply,
  type PreviewRequest,
  type PreviewWorkerPort,
} from "../src/features/derived-work/PreviewWorker";

type Input = { value: number };
function fakeWorker() {
  const requests: PreviewRequest<Input>[] = [];
  let terminations = 0;
  const port: PreviewWorkerPort<Input, string> = {
    onmessage: null,
    onerror: null,
    onmessageerror: null,
    postMessage: (request) => requests.push(request),
    terminate: () => terminations++,
  };
  const reply = (id: number, reply: PreviewReply<string>["reply"]) =>
    port.onmessage?.(new MessageEvent("message", { data: { id, reply } }));
  return { port, requests, reply, terminations: () => terminations };
}
const ports: ReturnType<typeof fakeWorker>[] = [];
const states: DerivedState<Input, string>[] = [];
const work = new PreviewWorker<Input, string>(
  () => {
    const next = fakeWorker();
    ports.push(next);
    return next.port;
  },
  (state) => states.push(state),
);
const first = { value: 1 };
work.request(first);
const second = { value: 2 };
work.request(second);
const newest = { value: 3 };
work.request(newest);
assert.equal(ports.length, 1, "Rapid edits share one warm worker.");
assert.equal(ports[0].requests.length, 1);
ports[0].reply(1, { type: "ready", value: "obsolete" });
assert.deepEqual(
  ports[0].requests.map((request) => request.input),
  [first, newest],
  "Only the newest queued edit is computed.",
);
assert.equal(states.at(-1)?.status, "pending");
ports[0].reply(1, { type: "ready", value: "late duplicate" });
assert.equal(states.at(-1)?.status, "pending");
ports[0].reply(3, { type: "ready", value: "current" });
assert.deepEqual(states.at(-1), {
  status: "ready",
  input: newest,
  value: "current",
});
work.request(newest);
assert.equal(ports[0].requests.length, 2, "Unchanged input reuses its result.");

work.request({ value: 4 });
ports[0].reply(4, { type: "error", error: "Explicit generation failure" });
assert.equal(states.at(-1)?.status, "unavailable");
work.retry();
ports[0].reply(5, { type: "ready", value: "recovered" });
assert.equal(states.at(-1)?.status, "ready");
assert.equal(ports.length, 1);

work.request({ value: 5 });
const last = { value: 6 };
work.request(last);
const staleHandler = ports[0].port.onmessage!;
ports[0].port.onmessageerror?.(new MessageEvent("messageerror"));
assert.deepEqual(states.at(-1), {
  status: "unavailable",
  input: last,
  error: "The preview worker result could not be read.",
});
assert.equal(ports[0].terminations(), 1);
assert.equal(ports[0].port.onmessage, null);
work.retry();
assert.equal(ports.length, 2);
const count = states.length;
staleHandler(
  new MessageEvent("message", {
    data: { id: 8, reply: { type: "ready", value: "dead worker" } },
  }),
);
assert.equal(states.length, count);
ports[1].reply(8, { type: "ready", value: "replacement worker" });
assert.equal(states.at(-1)?.status, "ready");
work.request({ value: 7 });
work.request({ value: 8 });
const beforeDispose = states.length;
work.dispose();
work.retry();
work.request({ value: 9 });
assert.equal(ports[1].terminations(), 1);
assert.equal(states.length, beforeDispose);
assert.equal(ports[1].requests.length, 2);

const failures: DerivedState<Input, string>[] = [];
const broken = new PreviewWorker<Input, string>(
  () => {
    throw new Error("Worker creation failed");
  },
  (state) => failures.push(state),
);
broken.request(first);
assert.deepEqual(failures.at(-1), {
  status: "unavailable",
  input: first,
  error: "Worker creation failed",
});
broken.dispose();
const posting = fakeWorker();
posting.port.postMessage = () => {
  throw new Error("The preview input could not be cloned.");
};
const postWork = new PreviewWorker<Input, string>(
  () => posting.port,
  (state) => failures.push(state),
);
postWork.request(first);
assert.deepEqual(failures.at(-1), {
  status: "unavailable",
  input: first,
  error: "The preview input could not be cloned.",
});
assert.equal(posting.terminations(), 1);
postWork.dispose();

const runtime = fakeWorker();
const runtimeWork = new PreviewWorker<Input, string>(
  () => runtime.port,
  (state) => failures.push(state),
);
runtimeWork.request(first);
runtimeWork.request(newest);
runtime.port.onerror?.(
  Object.assign(new Event("error"), {
    message: "Worker execution failed",
    error: new Error("Worker execution failed"),
    filename: "preview.worker.ts",
    lineno: 1,
    colno: 1,
  }),
);
assert.deepEqual(failures.at(-1), {
  status: "unavailable",
  input: newest,
  error: "Worker execution failed",
});
assert.equal(runtime.terminations(), 1);
runtimeWork.dispose();

const malformed = fakeWorker();
const malformedWork = new PreviewWorker<Input, string>(
  () => malformed.port,
  (state) => failures.push(state),
);
malformedWork.request(first);
malformed.port.onmessage?.(
  // @ts-expect-error Exercise malformed data from the browser transport.
  new MessageEvent("message", {
    data: { id: 1, reply: { type: "unsupported" } },
  }),
);
assert.deepEqual(failures.at(-1), {
  status: "unavailable",
  input: first,
  error: "Unexpected preview worker response.",
});
malformedWork.dispose();

const reentrant = fakeWorker();
const reentrantWork = new PreviewWorker<Input, string>(
  () => reentrant.port,
  (state) => {
    if (state.status === "ready" && state.input === first)
      reentrantWork.request(newest);
  },
);
reentrantWork.request(first);
reentrant.reply(1, { type: "ready", value: "first" });
assert.deepEqual(
  reentrant.requests.map((request) => request.input),
  [first, newest],
  "An edit published during completion starts exactly one new job.",
);
reentrant.reply(2, { type: "ready", value: "newest" });
reentrantWork.dispose();
console.log(
  "Preview worker latest-input, failure, retry and disposal checks passed.",
);
