// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { mock } from "node:test";
import { createStore } from "jotai";
import type { PreparedAuthoringResult } from "../src/features/edit-session/recordPreparation";
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
    this.writes += 1;
  }
}
class ManualWorker {
  static instances: ManualWorker[] = [];
  static peak = 0;
  onmessage:
    | ((event: MessageEvent<WorkerReply<PreparedAuthoringResult>>) => void)
    | null = null;
  onerror = null;
  onmessageerror = null;
  terminated = false;
  input?: PreparedAuthoringResult["record"];
  private delivery: ManualWorker["onmessage"] = null;
  constructor(readonly url: URL) {
    ManualWorker.instances.push(this);
  }
  postMessage(input: PreparedAuthoringResult["record"]) {
    this.input = structuredClone(input);
    this.delivery = this.onmessage;
    if (String(this.url).includes("recordPreparation.worker")) {
      ManualWorker.peak = Math.max(
        ManualWorker.peak,
        ManualWorker.instances.filter(
          (worker) =>
            String(worker.url).includes("recordPreparation.worker") &&
            !worker.terminated,
        ).length,
      );
    }
  }
  reply(data: WorkerReply<PreparedAuthoringResult>) {
    this.delivery?.({ data } as MessageEvent<
      WorkerReply<PreparedAuthoringResult>
    >);
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
const { prepareAuthoringRecord } =
  await import("../src/features/edit-session/recordPreparation");
const { AUTHORING_STORAGE_KEY } =
  await import("../src/features/edit-session/storage");
const {
  enterEditModeAtom,
  saveEditAtom,
  cancelEditAtom,
  resetAllAuthoringAtom,
  editSessionSnapshotAtom,
  authoringSourceSnapshotAtom,
  captureAuthoringRecord,
} = await import("../src/features/edit-session/state");
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
const { foundationModeAttachmentsAtom } =
  await import("../src/state/view/foundationModeAttachments");
const { persistenceIssuesAtom, flushPersistedState } =
  await import("../src/state/persist");
mock.timers.enable({ apis: ["setTimeout"] });
async function advance(ms = 0) {
  mock.timers.tick(ms);
  for (let index = 0; index < 12; index++) await Promise.resolve();
}
function activeWorker() {
  const active = ManualWorker.instances.filter(
    (worker) =>
      String(worker.url).includes("recordPreparation.worker") &&
      !worker.terminated,
  );
  assert.equal(
    active.length,
    1,
    "Exactly one authoring worker owns the current request.",
  );
  return active[0];
}
function resolve(worker: ManualWorker) {
  const record = prepareAuthoringRecord(worker.input!);
  worker.reply({
    type: "ready",
    value: { record, ...createComponentReferenceWitnesses(record.working) },
  });
}
function changeContrast(store: ReturnType<typeof createStore>) {
  const first = store.get(contrastTokensAtom)[0];
  store.set(updateContrastTokenAtom, {
    id: first.id,
    value: first.value + 0.01,
  });
}
async function scenario(
  run: (
    store: ReturnType<typeof createStore>,
    bootstrap: ManualWorker,
  ) => Promise<void>,
) {
  storage.removeItem(AUTHORING_STORAGE_KEY);
  storage.writes = 0;
  const store = createStore();
  const dispose = initializeAuthoringPersistence(store);
  try {
    await advance();
    await run(store, activeWorker());
  } finally {
    dispose();
    assert.equal(store.get(componentContrastWitnessAtom), null);
    assert.equal(store.get(componentColorWitnessAtom), null);
    assert.equal(
      ManualWorker.instances.filter(
        (worker) =>
          String(worker.url).includes("recordPreparation.worker") &&
          !worker.terminated,
      ).length,
      0,
    );
  }
}
try {
  await scenario(async (store, bootstrap) => {
    resolve(bootstrap);
    await advance();
    assert.ok(
      matchesComponentContrastWitness(
        store.get(componentContrastWitnessAtom),
        store.get(authoringSourceSnapshotAtom),
      ),
    );
    assert.ok(
      matchesComponentColorWitness(
        store.get(componentColorWitnessAtom),
        store.get(authoringSourceSnapshotAtom),
      ),
    );
    assert.equal(
      storage.getItem(AUTHORING_STORAGE_KEY),
      null,
      "Bootstrap validation must not save untouched defaults.",
    );
    assert.equal(storage.writes, 0);
  });
  await scenario(async (store, bootstrap) => {
    store.set(enterEditModeAtom);
    changeContrast(store);
    changeContrast(store);
    await advance(1000);
    assert.equal(
      activeWorker(),
      bootstrap,
      "Editing-state and numeric-only changes cannot starve initial proof.",
    );
    resolve(bootstrap);
    await advance();
    assert.ok(
      matchesComponentContrastWitness(
        store.get(componentContrastWitnessAtom),
        store.get(authoringSourceSnapshotAtom),
      ),
    );
    assert.equal(
      store.get(componentColorWitnessAtom),
      null,
      "Changed contrast values cannot reuse the bootstrap color partition.",
    );
    assert.equal(
      storage.getItem(AUTHORING_STORAGE_KEY),
      null,
      "A reusable proof never authorizes writing its obsolete record.",
    );
    await advance(199);
    assert.equal(storage.writes, 0);
    await advance(1);
    const latest = activeWorker();
    assert.notEqual(latest, bootstrap);
    assert.equal(latest.input!.isEditing, true);
    assert.deepEqual(
      latest.input!.working,
      store.get(authoringSourceSnapshotAtom),
    );
    resolve(latest);
    await advance();
    assert.ok(
      matchesComponentColorWitness(
        store.get(componentColorWitnessAtom),
        store.get(authoringSourceSnapshotAtom),
      ),
    );
    assert.equal(storage.writes, 1);
    assert.deepEqual(
      JSON.parse(storage.getItem(AUTHORING_STORAGE_KEY)!),
      prepareAuthoringRecord(captureAuthoringRecord(store.get)),
    );
  });
  for (const invalidate of [
    (store: ReturnType<typeof createStore>) =>
      store.set(updateColorSystemSettingsAtom, { extOffset: 0.3 }),
    (store: ReturnType<typeof createStore>) =>
      store.set(foundationModeAttachmentsAtom, {}),
    (store: ReturnType<typeof createStore>) =>
      store.set(
        editSessionSnapshotAtom,
        structuredClone(store.get(editSessionSnapshotAtom)),
      ),
  ])
    await scenario(async (store, bootstrap) => {
      store.set(enterEditModeAtom);
      invalidate(store);
      assert.equal(
        bootstrap.terminated,
        true,
        "Other source, attachment or saved-baseline identities cancel initial proof.",
      );
      resolve(bootstrap);
      await advance();
      assert.equal(store.get(componentContrastWitnessAtom), null);
      assert.equal(store.get(componentColorWitnessAtom), null);
      assert.equal(storage.writes, 0);
      await advance(200);
      const latest = activeWorker();
      resolve(latest);
      await advance();
      assert.ok(
        matchesComponentContrastWitness(
          store.get(componentContrastWitnessAtom),
          store.get(authoringSourceSnapshotAtom),
        ),
      );
      assert.deepEqual(
        JSON.parse(storage.getItem(AUTHORING_STORAGE_KEY)!),
        prepareAuthoringRecord(captureAuthoringRecord(store.get)),
      );
    });
  for (const action of [
    (store: ReturnType<typeof createStore>) => store.set(saveEditAtom),
    (store: ReturnType<typeof createStore>) => store.set(cancelEditAtom),
    (store: ReturnType<typeof createStore>) => store.set(resetAllAuthoringAtom),
    () => flushPersistedState(),
    () => events.dispatchEvent(new Event("pagehide")),
  ])
    await scenario(async (store, bootstrap) => {
      store.set(enterEditModeAtom);
      changeContrast(store);
      assert.equal(activeWorker(), bootstrap);
      action(store);
      assert.equal(
        bootstrap.terminated,
        true,
        "Durable lifecycle actions cancel a protected, obsolete proof request.",
      );
      const durable = storage.getItem(AUTHORING_STORAGE_KEY);
      assert.ok(durable);
      const writes = storage.writes;
      resolve(bootstrap);
      await advance();
      assert.equal(storage.getItem(AUTHORING_STORAGE_KEY), durable);
      assert.equal(storage.writes, writes);
      assert.deepEqual(
        JSON.parse(durable),
        prepareAuthoringRecord(captureAuthoringRecord(store.get)),
      );
    });
  await scenario(async (store, bootstrap) => {
    bootstrap.reply({
      type: "error",
      error: "Injected proof preparation failure.",
    });
    await advance();
    assert.equal(store.get(componentContrastWitnessAtom), null);
    assert.equal(store.get(componentColorWitnessAtom), null);
    assert(
      store
        .get(persistenceIssuesAtom)
        .some((issue) => issue.includes("Injected proof preparation failure")),
    );
    assert.equal(storage.writes, 0);
    store.set(enterEditModeAtom);
    changeContrast(store);
    await advance(200);
    resolve(activeWorker());
    await advance();
    assert.ok(
      matchesComponentContrastWitness(
        store.get(componentContrastWitnessAtom),
        store.get(authoringSourceSnapshotAtom),
      ),
    );
    assert.equal(
      storage.writes,
      0,
      "Recovery first publishes only the reusable proof, never the superseded record.",
    );
    await advance(200);
    resolve(activeWorker());
    await advance();
    assert.deepEqual(
      JSON.parse(storage.getItem(AUTHORING_STORAGE_KEY)!),
      prepareAuthoringRecord(captureAuthoringRecord(store.get)),
    );
  });
  await scenario(async (store, bootstrap) => {
    store.set(enterEditModeAtom);
    changeContrast(store);
    bootstrap.reply({ type: "error", error: "Obsolete preparation failure." });
    await advance();
    assert.equal(store.get(componentContrastWitnessAtom), null);
    assert(
      !store
        .get(persistenceIssuesAtom)
        .some((issue) => issue.includes("Obsolete preparation failure")),
    );
    assert.equal(storage.writes, 0);
    await advance(200);
    resolve(activeWorker());
    await advance();
    assert.ok(
      matchesComponentContrastWitness(
        store.get(componentContrastWitnessAtom),
        store.get(authoringSourceSnapshotAtom),
      ),
    );
    assert.deepEqual(
      JSON.parse(storage.getItem(AUTHORING_STORAGE_KEY)!),
      prepareAuthoringRecord(captureAuthoringRecord(store.get)),
    );
  });
  await scenario(async (store, bootstrap) => {
    const disposeAgain = initializeAuthoringPersistence(store);
    try {
      assert.equal(bootstrap.terminated, true);
      resolve(bootstrap);
      await advance();
      assert.equal(
        store.get(componentContrastWitnessAtom),
        null,
        "Reinitialization rejects the disposed owner's late proof.",
      );
      assert.equal(store.get(componentColorWitnessAtom), null);
      resolve(activeWorker());
      await advance();
      assert.ok(store.get(componentContrastWitnessAtom));
      assert.equal(storage.writes, 0);
    } finally {
      disposeAgain();
    }
  });
  assert.equal(
    ManualWorker.peak,
    1,
    "Repeated sessions never overlap authoring workers.",
  );
} finally {
  mock.timers.reset();
  delete (globalThis as { window?: unknown }).window;
  delete (globalThis as { Worker?: unknown }).Worker;
}
console.log(
  "Production persistence proof lifecycle: unsaved bootstrap, starvation prevention, exact latest writes, source/baseline/attachment invalidation, Save/Cancel/reset/flush/pagehide, explicit failure/recovery and bounded disposal passed.",
);
