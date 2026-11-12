// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import type { AnalysisInput } from "../src/features/design-data/comparison";
import {
  createValueResolutionService,
  unavailableValueResolution,
} from "../src/features/design-data/wasmResolution";
import {
  resolutionRequests,
  resolutionDataset,
  resolutionQueries,
} from "../src/features/design-data/colorOpacityAssessment";
import {
  createAnalysisService,
  type AnalysisMessage,
  type AnalysisReply,
} from "../src/features/design-data/analysisService";

const fixture = (hash: string, value = 8): AnalysisInput => ({
  source: {
    kind: "working",
    root: "fixture",
    hash,
    revision: "fixture",
    dirty: false,
    version: "fixture",
    validator: "fixture",
  },
  records: Array.from({ length: 600 }, (_, index) => ({
    id: `row-${index}`,
    identity: `uuid-${index}`,
    category: "tokens",
    name: `row-${index}`,
    source: "tokens/fixture.json",
    pointer: `/${index}`,
    classification: "generated",
    value,
  })),
  categories: ["tokens"],
  schemas: [],
  errors: [],
  limitations: [],
  inventoryStatus: "complete",
});
let initializations = 0,
  prepared = 0,
  freed = 0,
  queries = 0;
const batches: number[] = [];
const service = createValueResolutionService(async () => {
  initializations++;
  return {
    engine: "wasm:fixture",
    create(input) {
      prepared++;
      const values = new Map(
        input.records.map((row) => [row.id, row.raw.value]),
      );
      return {
        free() {
          freed++;
        },
        resolveValues(batch) {
          queries += batch.length;
          batches.push(batch.length);
          return batch.map((query) => ({
            ...query,
            selectedId: query.id,
            label: null,
            value: values.get(query.id),
            chain: [query.id],
            issue: null,
          }));
        },
      };
    },
  };
});
const first = fixture("first");
assert.deepEqual(resolutionRequests(first), {
  ...resolutionDataset(first),
  queries: [...resolutionQueries(first)],
});
const resolved = await service.resolve(first);
assert.equal(resolved.resolvedValues?.length, 600);
assert.deepEqual(batches, [256, 256, 88]);
assert.equal(resolved.resolvedValues?.[0].value, 8);
await service.resolve({ ...first, limitations: ["Fresh metadata"] });
assert.equal(prepared, 1);
assert.equal(queries, 600);
assert.deepEqual(
  (await service.resolve({ ...first, limitations: ["Fresh metadata"] }))
    .limitations,
  ["Fresh metadata"],
);
const reference = {
  ...fixture("reference"),
  source: { ...first.source, hash: "reference", kind: "reference" as const },
};
await service.resolve(reference);
await service.resolve(first, reference);
assert.equal(prepared, 2, "Reference and app use separate prepared graphs.");
await service.resolve(fixture("second", 12), reference);
assert.equal(freed, 1, "Replacing app data releases its old Rust graph.");
assert.equal(initializations, 1);
const failure = unavailableValueResolution(resolved, new Error("fixture"));
assert.equal(failure.resolvedValues, undefined);
assert.match(failure.valueResolution!.error!, /fixture/);
const recovered = await service.resolve(failure, reference);
assert.equal(recovered.valueResolution?.error, undefined);
assert(
  !recovered.limitations.some((message) =>
    message.startsWith("Token resolution unavailable:"),
  ),
);
service.dispose();
assert.equal(freed, 4);
let attempts = 0;
const unavailable = createValueResolutionService(async () => {
  attempts++;
  throw new Error("WASM unavailable");
});
await assert.rejects(unavailable.resolve(first), /WASM unavailable/);
await assert.rejects(unavailable.resolve(first), /WASM unavailable/);
assert.equal(attempts, 2, "A failed initialization can be explicitly retried.");

class FakeWorker {
  onmessage: ((event: MessageEvent<AnalysisReply>) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  onmessageerror: ((event: MessageEvent) => void) | null = null;
  messages: AnalysisMessage[] = [];
  terminated = false;
  postMessage(message: AnalysisMessage) {
    this.messages.push(message);
  }
  terminate() {
    this.terminated = true;
  }
  ready(result: AnalysisInput = reference) {
    this.onmessage?.({
      data: {
        id: this.messages.at(-1)!.id,
        type: "ready",
        value: { type: "reference", result },
      },
    } as MessageEvent<AnalysisReply>);
  }
}
const workers: FakeWorker[] = [];
const client = createAnalysisService(() => {
  const worker = new FakeWorker();
  workers.push(worker);
  return worker;
});
const run = (signal = new AbortController().signal) =>
  client.execute(
    { type: "reference", url: "/fixture", packaged: false },
    signal,
    () => {},
  );
const a = run();
workers[0].ready();
await a;
const b = run();
assert.equal(workers.length, 1, "Completed work reuses the same worker.");
workers[0].ready();
await b;
const controller = new AbortController();
const cancelled = run(controller.signal);
const obsolete = workers[0].onmessage;
const obsoleteError = workers[0].onerror;
controller.abort();
await assert.rejects(cancelled, { name: "AbortError" });
assert(workers[0].terminated, "Cancellation terminates synchronous WASM work.");
const replacement = run();
obsolete?.({
  data: { id: 3, type: "ready", value: { type: "reference", result: first } },
} as MessageEvent<AnalysisReply>);
obsoleteError?.({ message: "Old worker failure" } as ErrorEvent);
assert(
  !workers[1].terminated,
  "A stale error cannot terminate the replacement worker.",
);
workers[1].ready();
assert.equal((await replacement).type, "reference");
const active = run();
const queued = run();
const superseded = assert.rejects(queued, { name: "AbortError" });
const latest = run();
await superseded;
assert.equal(workers[1].messages.length, 2, "Only one job runs at a time.");
workers[1].ready();
await active;
workers[1].ready();
await latest;
client.dispose();
assert(workers[1].terminated);
console.log(
  "Analysis WASM service: batching, bounded graph reuse, metadata, cancellation, stale replies and latest-only queue passed.",
);
