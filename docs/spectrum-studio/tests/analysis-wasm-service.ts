// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { analysisCodeVersion } from "../scripts/design-data-vite";
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
  createSharedLoad,
  type AnalysisMessage,
  type AnalysisReply,
} from "../src/features/design-data/analysisService";
import {
  analysisCacheKey,
  createAnalysisCache,
  type AnalysisCacheStore,
} from "../src/features/design-data/analysisCache";

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

const keyed = createAnalysisService(() => {
  const worker = new FakeWorker();
  workers.push(worker);
  return worker;
});
const keyedWorker = () => workers.at(-1)!;
const replyCompare = (result: { app: AnalysisInput }) =>
  keyedWorker().onmessage?.({
    data: {
      id: keyedWorker().messages.at(-1)!.id,
      type: "ready",
      value: { type: "compare", result },
    },
  } as MessageEvent<AnalysisReply>);
const comparing = keyed.execute(
  { type: "compare", source: { dataset: "defaults" } },
  new AbortController().signal,
  () => {},
);
replyCompare({ app: first });
const compared = await comparing;
assert(compared.type === "compare");
const firstCompareId = keyedWorker().messages[0].id;
const savedSnapshot = {} as never;
const gapping = keyed.execute(
  {
    type: "gaps",
    comparison: compared.result,
    saved: savedSnapshot,
    stale: false,
  },
  new AbortController().signal,
  () => {},
);
const gapMessage = keyedWorker().messages.at(-1)!;
assert.equal(gapMessage.comparisonKey, firstCompareId);
assert(
  gapMessage.input.type === "gaps" && !gapMessage.input.comparison,
  "A kept comparison is sent by key, not copied back to the worker.",
);
keyedWorker().onmessage?.({
  data: {
    id: gapMessage.id,
    type: "ready",
    value: { type: "gaps", result: { selected: [], saved: [] } },
  },
} as unknown as MessageEvent<AnalysisReply>);
await gapping;
const recompareControl = new AbortController();
const recompare = keyed.execute(
  {
    type: "compare",
    source: { dataset: "defaults" },
    cachedApp: compared.result.app,
  },
  recompareControl.signal,
  () => {},
);
const recompareMessage = keyedWorker().messages.at(-1)!;
assert.equal(recompareMessage.appKey, firstCompareId);
assert(
  recompareMessage.input.type === "compare" &&
    !recompareMessage.input.cachedApp,
  "A kept app input is sent by key.",
);
recompareControl.abort();
await assert.rejects(recompare, { name: "AbortError" });
assert(keyedWorker().terminated, "Cancelling active work restarts the worker.");
const afterRestart = keyed.execute(
  {
    type: "gaps",
    comparison: compared.result,
    saved: savedSnapshot,
    stale: false,
  },
  new AbortController().signal,
  () => {},
);
const freshMessage = keyedWorker().messages.at(-1)!;
assert.equal(
  freshMessage.comparisonKey,
  undefined,
  "Keys from a terminated worker are never reused.",
);
assert(
  freshMessage.input.type === "gaps" &&
    freshMessage.input.comparison === compared.result,
);
keyed.dispose();
await assert.rejects(afterRestart, { name: "AbortError" });

const memory = new Map<string, unknown>();
let failWrites = false;
const memoryStore: AnalysisCacheStore = {
  get: async (key) => memory.get(key),
  put: async (key, value) => {
    if (failWrites) throw new Error("QuotaExceededError");
    memory.set(key, value);
  },
  delete: async (key) => {
    memory.delete(key);
  },
  keys: async () => [...memory.keys()],
};
const resolvedReference = {
  ...first,
  valueResolution: { engine: "wasm:fixture" },
} as AnalysisInput;
const keyFor = (dataset: "defaults" | "other") =>
  analysisCacheKey(
    { type: "compare", source: { dataset } as never, resolveValues: true },
    resolvedReference,
  );
const defaultsKey = (await keyFor("defaults"))!;
assert.equal(defaultsKey, await keyFor("defaults"), "Keys are stable.");
assert.notEqual(defaultsKey, await keyFor("other"));
assert.notEqual(
  defaultsKey,
  await analysisCacheKey(
    { type: "compare", source: { dataset: "defaults" }, resolveValues: true },
    { ...resolvedReference, source: { ...first.source, hash: "changed" } },
  ),
  "A changed reference changes the key.",
);
assert.equal(
  await analysisCacheKey({ type: "compare", source: { dataset: "defaults" } }, {
    ...resolvedReference,
    valueResolution: { engine: "wasm:fixture", error: "failed" },
  } as AnalysisInput),
  undefined,
  "A degraded reference is never cached.",
);
const stored = { app: first, unsaved: false };
const cacheV1 = createAnalysisCache(async () => memoryStore, "v1", 2);
await cacheV1.put("a", stored);
await cacheV1.put("b", stored);
await cacheV1.put("c", stored);
assert.equal(await cacheV1.get("a"), undefined, "The oldest entry is evicted.");
assert.deepEqual(await cacheV1.get("c"), stored);
await cacheV1.put("d", {
  app: { ...first, valueResolution: { engine: "x", error: "failed" } },
} as never);
assert.equal(
  await cacheV1.get("d"),
  undefined,
  "Degraded results are skipped.",
);
const cacheV2 = createAnalysisCache(async () => memoryStore, "v2", 2);
assert.equal(
  await cacheV2.get("c"),
  undefined,
  "A new code version silently clears old entries.",
);
assert.deepEqual([...memory.keys()], ["__index"]);
failWrites = true;
await cacheV2.put("e", stored);
assert.equal(await cacheV2.get("e"), undefined, "Write failures are ignored.");
const broken = createAnalysisCache(async () => {
  throw new Error("IndexedDB unavailable");
}, "v1");
assert.equal(await broken.get("a"), undefined);
await broken.put("a", stored);

const loads: { args: { generation: number }; signal: AbortSignal }[] = [];
const sharedLoad = createSharedLoad(
  (args: { generation: number }, signal) =>
    new Promise<number>((resolve, reject) => {
      loads.push({ args, signal });
      signal.addEventListener("abort", () => reject(new Error("stopped")));
      setTimeout(() => resolve(args.generation), 10);
    }),
);
const firstMount = new AbortController();
const firstLoad = sharedLoad({ generation: 0 }, firstMount.signal);
firstMount.abort();
const remount = sharedLoad({ generation: 0 }, new AbortController().signal);
await assert.rejects(firstLoad, { name: "AbortError" });
assert.equal(await remount, 0);
assert.equal(loads.length, 1, "An immediate remount reuses the running load.");
assert.equal(loads[0].signal.aborted, false);
const leaving = new AbortController();
const left = sharedLoad({ generation: 1 }, leaving.signal);
leaving.abort();
await assert.rejects(left, { name: "AbortError" });
await new Promise((resolve) => setTimeout(resolve, 0));
assert.equal(loads[1].signal.aborted, true, "Unused loads are stopped.");
assert.equal(
  await sharedLoad({ generation: 2 }, new AbortController().signal),
  2,
);
assert.equal(loads.length, 3, "A refresh starts a fresh load.");

const codeRoot = await mkdtemp(join(tmpdir(), "analysis-code-version-"));
const entry = join(codeRoot, "worker.ts");
await writeFile(
  entry,
  'import type { T } from "./types";\nimport {\n  a,\n} from "./rules";\nimport data from "./data.json";\nexport default [a, data];',
);
await writeFile(join(codeRoot, "rules.ts"), "export const a = 1;");
await writeFile(join(codeRoot, "data.json"), "1");
await writeFile(join(codeRoot, "types.ts"), "export type T = 1;");
await writeFile(join(codeRoot, "unrelated.ts"), "export const b = 1;");
const versionBefore = await analysisCodeVersion([entry]);
assert.equal(versionBefore, await analysisCodeVersion([entry]));
await writeFile(join(codeRoot, "unrelated.ts"), "export const b = 2;");
await writeFile(join(codeRoot, "types.ts"), "export type T = 2;");
assert.equal(
  versionBefore,
  await analysisCodeVersion([entry]),
  "Files the analysis never runs keep stored results.",
);
await writeFile(join(codeRoot, "rules.ts"), "export const a = 2;");
const versionAfterRules = await analysisCodeVersion([entry]);
assert.notEqual(
  versionBefore,
  versionAfterRules,
  "Editing analysis source changes the cache version.",
);
await writeFile(join(codeRoot, "data.json"), "2");
assert.notEqual(
  versionAfterRules,
  await analysisCodeVersion([entry]),
  "Editing imported data changes the cache version.",
);
await rm(codeRoot, { recursive: true, force: true });
console.log(
  "Analysis WASM service: batching, bounded graph reuse, metadata, cancellation, stale replies, latest-only queue, kept-result keys and result cache passed.",
);
