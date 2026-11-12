// Copyright 2026 Adobe. All rights reserved.
import { mock } from "node:test";
import { createStore } from "jotai";
import type { WorkExecutor } from "../../src/features/derived-work/LatestRequest";
import type { EditSessionSnapshot } from "../../src/features/edit-session/state";
import type { AuthoringRecord } from "../../src/features/edit-session/storage";

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
export const storage = new MemoryStorage();
export const events = new EventTarget();
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
  await import("../../src/features/edit-session/persistence");
export const { prepareAuthoringRecord, prepareAuthoringResult } =
  await import("../../src/features/edit-session/recordPreparation");
export const {
  AUTHORING_STORAGE_KEY,
  AUTHORING_RECORD_VERSION,
  readAuthoringRecord,
  serializeAuthoringRecord,
} = await import("../../src/features/edit-session/storage");
export const {
  captureAuthoringRecord,
  enterEditModeAtom,
  saveEditAtom,
  cancelEditAtom,
  assertStoredSnapshot,
} = await import("../../src/features/edit-session/state");
const { stylesDocumentAtom } = await import("../../src/features/styles/state");
export const { persistenceIssuesAtom } =
  await import("../../src/state/persist");
type RecordValue = AuthoringRecord<EditSessionSnapshot>;
export const requests: {
  record: RecordValue;
  signal: AbortSignal;
  resolve: (record: RecordValue) => void;
  reject: (error: Error) => void;
}[] = [];
const execute: WorkExecutor<RecordValue, RecordValue> = (record, signal) =>
  new Promise((resolve, reject) => {
    requests.push({ record, signal, resolve, reject });
  });
export const read = (): RecordValue =>
  readAuthoringRecord(assertStoredSnapshot)!;
export const count = () => storage.writes.get(AUTHORING_STORAGE_KEY) ?? 0;
mock.timers.enable({ apis: ["setTimeout"] });
export async function advance(ms = 0) {
  mock.timers.tick(ms);
  for (let index = 0; index < 8; index++) await Promise.resolve();
}
export const store = createStore();
const recipeId = store.get(stylesDocumentAtom).recipes[0].id;
export const workingIcon = (record: RecordValue) =>
  record.working.styles!.examples[recipeId]?.icon;
export const savedIcon = (record: RecordValue) =>
  record.saved.styles!.examples[recipeId]?.icon;
export const updateExample = (icon: string) =>
  store.set(stylesDocumentAtom, (styles) => ({
    ...styles,
    examples: { ...styles.examples, [recipeId]: { icon } },
  }));
export const dispose = initializeAuthoringPersistence(store, {
  validateScheduled: execute,
});
export function cleanup() {
  dispose();
  mock.timers.reset();
}
