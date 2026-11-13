// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { createStore } from "jotai";

class MemoryStorage implements Storage {
  data = new Map<string, string>();
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
  }
}
const localStorage = new MemoryStorage();
localStorage.data.set("another-app", "preserve");
const events = new EventTarget();
Object.defineProperty(globalThis, "window", {
  value: {
    localStorage,
    sessionStorage: new MemoryStorage(),
    addEventListener: events.addEventListener.bind(events),
    removeEventListener: events.removeEventListener.bind(events),
  },
  configurable: true,
});

const { initializeAuthoringPersistence } =
  await import("../src/features/edit-session/persistence");
const { AUTHORING_STORAGE_KEY, SHIPPED_DEFAULTS_STORAGE_KEY } =
  await import("../src/features/edit-session/storage");
const { authoringSnapshotAtom, createDefaultSnapshot, enterEditModeAtom } =
  await import("../src/features/edit-session/state");
const { colorSystemDocumentAtom, updateColorSystemSettingsAtom } =
  await import("../src/features/color-system/state");
const { editModeAtom } = await import("../src/state/view/editMode");
const { appColorSchemeAtom } = await import("../src/state/view/appAppearance");
const { flushPersistedState } = await import("../src/state/persist");

const blend = (store: ReturnType<typeof createStore>) =>
  store.get(colorSystemDocumentAtom).settings.backgroundBlend;
const shippedBlend =
  createDefaultSnapshot().colorSystem.settings.backgroundBlend;
const editedBlend = shippedBlend === 0.5 ? 0.4 : 0.5;
const stamp = () => localStorage.getItem(SHIPPED_DEFAULTS_STORAGE_KEY);
function restart() {
  const store = createStore();
  return { store, dispose: initializeAuthoringPersistence(store) };
}

let { store, dispose } = restart();
const current = stamp();
assert.match(
  current ?? "",
  /^[0-9a-f]{16}$/,
  "Startup stamps shipped defaults.",
);
assert.equal(localStorage.getItem(AUTHORING_STORAGE_KEY), null);
store.set(enterEditModeAtom);
store.set(updateColorSystemSettingsAtom, { backgroundBlend: editedBlend });
store.set(appColorSchemeAtom, "dark");
flushPersistedState();
dispose();

({ store, dispose } = restart());
assert.equal(blend(store), editedBlend, "Unchanged defaults keep edits.");
assert.equal(store.get(editModeAtom), true);
dispose();

localStorage.data.set(SHIPPED_DEFAULTS_STORAGE_KEY, "0000000000000000");
({ store, dispose } = restart());
assert.deepEqual(
  store.get(authoringSnapshotAtom),
  createDefaultSnapshot(),
  "Changed defaults reset edits to the shipped data.",
);
assert.equal(store.get(editModeAtom), false);
assert.equal(stamp(), current);
assert.equal(
  store.get(appColorSchemeAtom),
  "dark",
  "Resetting data keeps app view state.",
);
assert.equal(localStorage.getItem("another-app"), "preserve");
store.set(enterEditModeAtom);
store.set(updateColorSystemSettingsAtom, { backgroundBlend: editedBlend });
flushPersistedState();
dispose();

localStorage.data.delete(SHIPPED_DEFAULTS_STORAGE_KEY);
({ store, dispose } = restart());
assert.equal(
  blend(store),
  editedBlend,
  "Edits saved before stamping existed are kept.",
);
assert.equal(stamp(), current);
dispose();
console.log("Changed shipped defaults reset browser edits on startup.");
