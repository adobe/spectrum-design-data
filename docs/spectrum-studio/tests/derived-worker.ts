// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import {
  workerTask,
  type TaskWorker,
  type WorkerReply,
} from "../src/features/derived-work/workerTask";
import { boundedExecutor } from "../src/features/derived-work/boundedExecutor";

class FakeWorker implements TaskWorker<string, string, string> {
  onmessage: TaskWorker<string, string, string>["onmessage"] = null;
  onerror: TaskWorker<string, string, string>["onerror"] = null;
  onmessageerror: TaskWorker<string, string, string>["onmessageerror"] = null;
  messages: string[] = [];
  terminated = 0;
  failPost = false;
  postMessage(input: string) {
    if (this.failPost) throw new Error("Clone failed");
    this.messages.push(input);
  }
  terminate() {
    this.terminated++;
  }
  reply(data: WorkerReply<string, string>) {
    this.onmessage?.(new MessageEvent("message", { data }));
  }
}
const workers: FakeWorker[] = [];
const execute = workerTask<string, string, string>(() => {
  const worker = new FakeWorker();
  workers.push(worker);
  return worker;
});
const preAborted = new AbortController();
preAborted.abort();
await assert.rejects(
  execute("ignored", preAborted.signal, () => {}),
  { name: "AbortError" },
);
assert.equal(workers.length, 0);
const progress: string[] = [];
const complete = execute("current", new AbortController().signal, (partial) =>
  progress.push(partial),
);
const first = workers[0];
first.reply({ type: "partial", value: "authored" });
assert.deepEqual(progress, ["authored"]);
first.reply({ type: "ready", value: "complete" });
assert.equal(await complete, "complete");
assert.equal(first.terminated, 1);
assert.equal(first.onmessage, null);
assert.equal(first.onmessageerror, null);

const abort = new AbortController();
const cancelled = execute("cancelled", abort.signal, () =>
  assert.fail("A cancelled worker published progress"),
);
const rejected = assert.rejects(cancelled, { name: "AbortError" });
const late = workers[1].onmessage;
abort.abort();
late?.(
  new MessageEvent("message", { data: { type: "ready", value: "obsolete" } }),
);
await rejected;
assert.equal(workers[1].terminated, 1);
const unreadable = execute(
  "unreadable",
  new AbortController().signal,
  () => {},
);
const unreadableFailure = assert.rejects(unreadable, /could not be read/);
workers[2].onmessageerror?.(new MessageEvent("messageerror"));
await unreadableFailure;
assert.equal(workers[2].terminated, 1);
const failure = execute("failure", new AbortController().signal, () => {});
const workerFailure = assert.rejects(failure, /Generator rejected input/);
workers[3].reply({ type: "error", error: "Generator rejected input" });
await workerFailure;
assert.equal(workers[3].terminated, 1);
const broken = new FakeWorker();
broken.failPost = true;
await assert.rejects(
  workerTask(() => broken)("clone", new AbortController().signal, () => {}),
  /Clone failed/,
);
assert.equal(broken.terminated, 1);
const callbackFailure = execute(
  "callback",
  new AbortController().signal,
  () => {
    throw new Error("Publication failed");
  },
);
const callbackRejected = assert.rejects(callbackFailure, /Publication failed/);
workers[4].reply({ type: "partial", value: "partial" });
await callbackRejected;
assert.equal(workers[4].terminated, 1);

const bounded = boundedExecutor(execute, 1);
const before = workers.length;
const one = bounded("one", new AbortController().signal, () => {});
const abortQueued = new AbortController();
const two = bounded("two", abortQueued.signal, () => {});
const twoRejected = assert.rejects(two, { name: "AbortError" });
const three = bounded("three", new AbortController().signal, () => {});
await Promise.resolve();
await Promise.resolve();
assert.equal(workers.length, before + 1);
abortQueued.abort();
await twoRejected;
workers[before].reply({ type: "ready", value: "one" });
assert.equal(await one, "one");
await Promise.resolve();
assert.equal(workers.length, before + 2);
assert.deepEqual(workers.at(-1)?.messages, ["three"]);
workers.at(-1)!.reply({ type: "ready", value: "three" });
assert.equal(await three, "three");
assert.throws(() => boundedExecutor(execute, 0), /positive integer/);
console.log(
  "Worker transport: progress, cancellation, stale replies, clone/read/publication failures, cleanup and bounded queue passed.",
);
