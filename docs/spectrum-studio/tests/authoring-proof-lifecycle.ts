// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { mock } from "node:test";
import { createStore } from "jotai";
import type { PreparedAuthoringResult } from "../src/features/edit-session/recordPreparation";
import type { EditSessionSnapshot } from "../src/features/edit-session/state";
import type { WorkerReply } from "../src/features/derived-work/workerTask";

class MemoryStorage implements Storage {
  data = new Map<string, string>();
  writes = 0;
  get length() {
    return this.data.size;
  }
  clear() {
    throw new Error("Broad storage clearing is prohibited.");
  }
  key(index: number) {
    return [...this.data.keys()][index] ?? null;
  }
  getItem(key: string) {
    return this.data.get(key) ?? null;
  }
  removeItem(key: string) {
    this.data.delete(key);
  }
  setItem(key: string, value: string) {
    this.data.set(key, value);
    this.writes++;
  }
}

class ManualWorker {
  static instances: ManualWorker[] = [];
  onmessage: ((event: MessageEvent<WorkerReply<unknown>>) => void) | null =
    null;
  onerror = null;
  onmessageerror = null;
  terminated = false;
  input: unknown;
  private delivery: ManualWorker["onmessage"] = null;
  constructor(readonly url: URL) {
    ManualWorker.instances.push(this);
  }
  postMessage(input: unknown) {
    this.input = structuredClone(input);
    this.delivery = this.onmessage;
  }
  reply(data: WorkerReply<unknown>) {
    this.delivery?.({ data } as MessageEvent<WorkerReply<unknown>>);
  }
  terminate() {
    this.terminated = true;
  }
}
const storage = new MemoryStorage();
const events = new EventTarget();
Object.defineProperty(globalThis, "window", {
  configurable: true,
  value: {
    localStorage: storage,
    sessionStorage: new MemoryStorage(),
    addEventListener: events.addEventListener.bind(events),
    removeEventListener: events.removeEventListener.bind(events),
  },
});
Object.defineProperty(globalThis, "Worker", {
  configurable: true,
  value: ManualWorker,
});
const { initializeAuthoringPersistence } =
  await import("../src/features/edit-session/persistence");
const { serializeAuthoringRecord, AUTHORING_STORAGE_KEY, readAuthoringRecord } =
  await import("../src/features/edit-session/storage");
const { enterEditModeAtom, authoringSourceSnapshotAtom, assertStoredSnapshot } =
  await import("../src/features/edit-session/state");
const {
  updateColorSystemSettingsAtom,
  updateContrastTokenAtom,
  contrastTokensAtom,
} = await import("../src/features/color-system/state");
const {
  componentContrastWitnessAtom,
  createComponentReferenceWitnesses,
  matchesComponentContrastWitness,
} = await import("../src/features/components/contrastWitness");
const { componentColorWitnessAtom, matchesComponentColorWitness } =
  await import("../src/features/components/colorWitness");
const { persistenceIssuesAtom, flushPersistedState } =
  await import("../src/state/persist");

mock.timers.enable({ apis: ["setTimeout"] });
async function advance(ms = 0) {
  mock.timers.tick(ms);
  for (let index = 0; index < 12; index++) await Promise.resolve();
}
function activeWorker(kind: "recordPreparation" | "referenceWitness") {
  const active = ManualWorker.instances.filter(
    (worker) =>
      String(worker.url).includes(`${kind}.worker`) && !worker.terminated,
  );
  assert.equal(
    active.length,
    1,
    `Exactly one ${kind} worker owns current work.`,
  );
  return active[0];
}
function resolveRecord(worker: ManualWorker) {
  // This transport check simulates an already validated worker reply. The actual
  // record preparation oracle is covered by authoring-persistence-work.ts.
  const record = worker.input as PreparedAuthoringResult["record"];
  worker.reply({
    type: "ready",
    value: {
      record,
      serialized: serializeAuthoringRecord(record),
      stylePublicationsChanged: false,
      componentContrastWitness: null,
      componentColorWitness: null,
    } satisfies PreparedAuthoringResult,
  });
}
const store = createStore();
const dispose = initializeAuthoringPersistence(store);
try {
  await advance();
  const bootstrap = activeWorker("referenceWitness");
  assert.equal(storage.getItem(AUTHORING_STORAGE_KEY), null);
  const originalWitnesses = createComponentReferenceWitnesses(
    bootstrap.input as EditSessionSnapshot,
  );
  store.set(enterEditModeAtom);
  const first = store.get(contrastTokensAtom)[0];
  for (const delta of [0.01, 0.02, 0.03])
    store.set(updateContrastTokenAtom, {
      id: first.id,
      value: first.value + delta,
    });
  await advance(200);
  assert.equal(
    activeWorker("referenceWitness"),
    bootstrap,
    "Reusable proof warming may continue without blocking current durability.",
  );
  const currentRecord = activeWorker("recordPreparation");
  assert.equal(storage.writes, 0);
  resolveRecord(currentRecord);
  await advance();
  assert(
    storage.getItem(AUTHORING_STORAGE_KEY),
    "Current authored data is durable while optional proof generation is still pending.",
  );
  const stored = readAuthoringRecord(assertStoredSnapshot)!;
  assert.equal(
    stored.working.colorSystem.contrasts.find((entry) => entry.id === first.id)!
      .value,
    store.get(contrastTokensAtom).find((entry) => entry.id === first.id)!.value,
  );
  const writes = storage.writes;
  bootstrap.reply({ type: "ready", value: originalWitnesses });
  await advance();
  assert.equal(
    storage.writes,
    writes,
    "A proof reply cannot write an obsolete record.",
  );
  assert(
    matchesComponentContrastWitness(
      store.get(componentContrastWitnessAtom),
      store.get(authoringSourceSnapshotAtom),
    ),
  );
  assert.equal(
    store.get(componentColorWitnessAtom),
    null,
    "An old color proof cannot authorize different current contrast values.",
  );
  await advance(200);
  const currentProof = activeWorker("referenceWitness");
  currentProof.reply({
    type: "ready",
    value: createComponentReferenceWitnesses(
      currentProof.input as EditSessionSnapshot,
    ),
  });
  await advance();
  assert(
    matchesComponentColorWitness(
      store.get(componentColorWitnessAtom),
      store.get(authoringSourceSnapshotAtom),
    ),
  );
  assert.equal(storage.writes, writes);

  store.set(updateColorSystemSettingsAtom, { backgroundBlend: 0.3 });
  await advance(200);
  const obsolete = activeWorker("recordPreparation");
  const obsoleteProof = activeWorker("referenceWitness");
  store.set(updateColorSystemSettingsAtom, { backgroundBlend: 0.4 });
  assert(obsolete.terminated);
  assert(obsoleteProof.terminated);
  resolveRecord(obsolete);
  obsoleteProof.reply({ type: "ready", value: originalWitnesses });
  await advance();
  assert.equal(storage.writes, writes);
  await advance(200);
  const beforeFlush = activeWorker("recordPreparation");
  const proofBeforeFlush = activeWorker("referenceWitness");
  flushPersistedState();
  assert(beforeFlush.terminated);
  assert(proofBeforeFlush.terminated);
  const durable = storage.getItem(AUTHORING_STORAGE_KEY);
  const afterFlush = storage.writes;
  resolveRecord(beforeFlush);
  proofBeforeFlush.reply({ type: "ready", value: originalWitnesses });
  await advance();
  assert.equal(storage.getItem(AUTHORING_STORAGE_KEY), durable);
  assert.equal(storage.writes, afterFlush);

  store.set(updateColorSystemSettingsAtom, { backgroundBlend: 0.5 });
  await advance(200);
  const failedProof = activeWorker("referenceWitness");
  failedProof.reply({
    type: "error",
    error: "Injected optional proof failure.",
  });
  await advance();
  assert(
    store
      .get(persistenceIssuesAtom)
      .some((issue) => issue.includes("Injected optional proof failure")),
  );
  resolveRecord(activeWorker("recordPreparation"));
  await advance();
  assert.equal(
    readAuthoringRecord(assertStoredSnapshot)!.working.colorSystem.settings
      .backgroundBlend,
    0.5,
    "Optional proof failure does not prevent validated record durability.",
  );
} finally {
  dispose();
  mock.timers.reset();
  assert.equal(store.get(componentContrastWitnessAtom), null);
  assert.equal(store.get(componentColorWitnessAtom), null);
  assert(ManualWorker.instances.every((worker) => worker.terminated));
}
console.log(
  "Independent proof warming, durable current records, cancellation, flush and explicit proof errors passed.",
);
