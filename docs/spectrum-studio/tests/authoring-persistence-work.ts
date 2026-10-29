// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { mock } from "node:test";
import { createStore } from "jotai";
import type { WorkExecutor } from "../src/features/derived-work/LatestRequest";
import type { EditSessionSnapshot } from "../src/features/edit-session/state";
import type { AuthoringRecord } from "../src/features/edit-session/storage";

class MemoryStorage implements Storage {
  data = new Map<string, string>();
  writes = new Map<string, number>();
  failKey?: string;
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
    if (key === this.failKey) throw new Error("Injected quota failure.");
    this.data.set(key, value);
    this.writes.set(key, (this.writes.get(key) ?? 0) + 1);
  }
}
class IdleArtifactWorker {
  onmessage = null;
  onerror = null;
  onmessageerror = null;
  postMessage() {}
  terminate() {}
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
  value: IdleArtifactWorker,
});
const { initializeAuthoringPersistence } =
  await import("../src/features/edit-session/persistence");
const { prepareAuthoringRecord } =
  await import("../src/features/edit-session/recordPreparation");
const { AUTHORING_STORAGE_KEY, AUTHORING_RECORD_VERSION } =
  await import("../src/features/edit-session/storage");
const {
  captureAuthoringRecord,
  enterEditModeAtom,
  saveEditAtom,
  cancelEditAtom,
} = await import("../src/features/edit-session/state");
const { updateColorSystemSettingsAtom } =
  await import("../src/features/color-system/state");
const { persistenceIssuesAtom } = await import("../src/state/persist");
type RecordValue = AuthoringRecord<EditSessionSnapshot>;
const requests: {
  record: RecordValue;
  signal: AbortSignal;
  resolve: (record: RecordValue) => void;
  reject: (error: Error) => void;
}[] = [];
const execute: WorkExecutor<RecordValue, RecordValue> = (record, signal) =>
  new Promise((resolve, reject) => {
    requests.push({ record, signal, resolve, reject });
  });
const read = (): RecordValue =>
  JSON.parse(storage.getItem(AUTHORING_STORAGE_KEY)!);
const count = () => storage.writes.get(AUTHORING_STORAGE_KEY) ?? 0;
mock.timers.enable({ apis: ["setTimeout"] });
async function advance(ms = 0) {
  mock.timers.tick(ms);
  for (let index = 0; index < 8; index++) await Promise.resolve();
}
const store = createStore();
const dispose = initializeAuthoringPersistence(store, {
  validateScheduled: execute,
});
try {
  const initial = captureAuthoringRecord(store.get);
  assert.equal(
    JSON.stringify(prepareAuthoringRecord(initial)),
    JSON.stringify(initial),
  );
  assert.throws(
    () => prepareAuthoringRecord({ ...initial, version: 13 }),
    /unsupported format/,
  );
  store.set(enterEditModeAtom);
  for (const extOffset of [0.1, 0.2, 0.3, 0.4, 0.5])
    store.set(updateColorSystemSettingsAtom, { extOffset });
  await advance(199);
  assert.equal(requests.length, 0);
  assert.equal(count(), 0);
  await advance(1);
  assert.equal(requests.length, 1);
  assert.equal(requests[0].record.working.colorSystem.settings.extOffset, 0.5);
  requests[0].resolve(prepareAuthoringRecord(requests[0].record));
  await advance();
  assert.equal(count(), 1);
  assert.equal(read().version, AUTHORING_RECORD_VERSION);
  assert.equal(read().working.colorSystem.settings.extOffset, 0.5);
  assert.deepEqual(read().saved, initial.saved);

  store.set(updateColorSystemSettingsAtom, { extOffset: 0.6 });
  await advance(200);
  const obsolete = requests.at(-1)!;
  store.set(updateColorSystemSettingsAtom, { extOffset: 0.7 });
  assert.equal(obsolete.signal.aborted, true);
  obsolete.resolve(prepareAuthoringRecord(obsolete.record));
  await advance();
  assert.equal(read().working.colorSystem.settings.extOffset, 0.5);
  await advance(200);
  const beforeSave = requests.at(-1)!;
  store.set(saveEditAtom);
  assert.equal(beforeSave.signal.aborted, true);
  beforeSave.resolve(prepareAuthoringRecord(beforeSave.record));
  await advance();
  assert.equal(read().working.colorSystem.settings.extOffset, 0.7);
  assert.equal(read().saved.colorSystem.settings.extOffset, 0.7);

  store.set(updateColorSystemSettingsAtom, { extOffset: 0.8 });
  await advance(200);
  const beforeCancel = requests.at(-1)!;
  store.set(cancelEditAtom);
  beforeCancel.resolve(prepareAuthoringRecord(beforeCancel.record));
  await advance();
  assert.equal(beforeCancel.signal.aborted, true);
  assert.equal(read().working.colorSystem.settings.extOffset, 0.7);
  assert.equal(read().isEditing, false);

  store.set(enterEditModeAtom);
  store.set(updateColorSystemSettingsAtom, { extOffset: 0.9 });
  await advance(200);
  const beforeHide = requests.at(-1)!;
  events.dispatchEvent(new Event("pagehide"));
  assert.equal(beforeHide.signal.aborted, true);
  assert.equal(read().working.colorSystem.settings.extOffset, 0.9);
  const afterHide = count();
  beforeHide.resolve(prepareAuthoringRecord(beforeHide.record));
  await advance();
  assert.equal(count(), afterHide);
  assert.equal(read().saved.colorSystem.settings.extOffset, 0.7);

  store.set(updateColorSystemSettingsAtom, { extOffset: 0.2 });
  await advance(200);
  requests.at(-1)!.reject(new Error("Injected validation failure."));
  await advance();
  assert(
    store
      .get(persistenceIssuesAtom)
      .some((issue) => issue.includes("Injected validation failure")),
  );
  assert.equal(read().working.colorSystem.settings.extOffset, 0.9);
  store.set(updateColorSystemSettingsAtom, { extOffset: 0.3 });
  await advance(200);
  storage.failKey = AUTHORING_STORAGE_KEY;
  const failedWrite = requests.at(-1)!;
  failedWrite.resolve(prepareAuthoringRecord(failedWrite.record));
  await advance();
  assert(
    store
      .get(persistenceIssuesAtom)
      .some((issue) => issue.includes("Injected quota failure")),
  );
  assert.equal(read().working.colorSystem.settings.extOffset, 0.9);
  storage.failKey = undefined;

  store.set(updateColorSystemSettingsAtom, { extOffset: 0.4 });
  await advance(200);
  const staleFailure = requests.at(-1)!;
  store.set(updateColorSystemSettingsAtom, { extOffset: 0.5 });
  staleFailure.reject(new Error("Obsolete validation failure."));
  await advance();
  assert(
    !store
      .get(persistenceIssuesAtom)
      .some((issue) => issue.includes("Obsolete validation failure")),
  );
  await advance(200);
  const beforeDispose = requests.at(-1)!;
  dispose();
  assert.equal(beforeDispose.signal.aborted, true);
  beforeDispose.resolve(prepareAuthoringRecord(beforeDispose.record));
  await advance();
  assert.equal(read().working.colorSystem.settings.extOffset, 0.9);
} finally {
  dispose();
  mock.timers.reset();
}
console.log(
  "Scheduled persistence: exact records, coalescing, stale work, Save/Cancel, pagehide, validation/storage errors and disposal passed.",
);
