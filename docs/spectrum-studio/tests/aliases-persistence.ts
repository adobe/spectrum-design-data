// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { createStore } from "jotai";

class MemoryStorage {
  data = new Map<string, string>();
  failWrites = false;
  getItem(key: string) {
    return this.data.get(key) ?? null;
  }
  removeItem(key: string) {
    this.data.delete(key);
  }
  setItem(key: string, value: string) {
    if (this.failWrites) throw new Error("Storage quota exceeded.");
    this.data.set(key, value);
  }
}
const localStorage = new MemoryStorage();
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
const {
  enterEditModeAtom,
  cancelEditAtom,
  saveEditAtom,
  authoringSnapshotAtom,
  editSessionSnapshotAtom,
  resetAllAuthoringAtom,
} = await import("../src/features/edit-session/state");
const { aliasesAtom, deleteAliasAtom } =
  await import("../src/features/tokens/aliasState");
const { taxonomyDocumentAtom } = await import("../src/features/taxonomy/state");
const { AUTHORING_STORAGE_KEY } =
  await import("../src/features/edit-session/storage");
const { flushPersistedState, persistenceIssuesAtom } =
  await import("../src/state/persist");
const { editModeAtom } = await import("../src/state/view/editMode");
const first = createStore();
let dispose = initializeAuthoringPersistence(first);
first.set(enterEditModeAtom);
const taxonomy = first.get(taxonomyDocumentAtom);
const ref = first.get(authoringSnapshotAtom).typography.metricNames[
  "font-size"
];
first.set(taxonomyDocumentAtom, {
  ...taxonomy,
  terms: taxonomy.terms.map((term) =>
    term.id === ref.termId ? { ...term, value: "Article" } : term,
  ),
});
flushPersistedState();
assert.deepEqual(first.get(aliasesAtom).tokens, []);
first.set(saveEditAtom);
const saved = structuredClone(first.get(editSessionSnapshotAtom));
const alias = first
  .get(aliasesAtom)
  .tokens.find((token) => token.name === "text-size-100")!;
assert(alias);
dispose();
const reloaded = createStore();
dispose = initializeAuthoringPersistence(reloaded);
assert.deepEqual(reloaded.get(authoringSnapshotAtom), saved);
assert.equal(reloaded.get(editModeAtom), true);
reloaded.set(deleteAliasAtom, alias.id);
flushPersistedState();
dispose();
const unsaved = createStore();
dispose = initializeAuthoringPersistence(unsaved);
assert(!unsaved.get(aliasesAtom).tokens.some((token) => token.id === alias.id));
unsaved.set(cancelEditAtom);
assert.deepEqual(unsaved.get(authoringSnapshotAtom), saved);
assert.throws(() => unsaved.set(deleteAliasAtom, alias.id), /edit mode/);
unsaved.set(enterEditModeAtom);
unsaved.set(deleteAliasAtom, alias.id);
const bytes = localStorage.getItem(AUTHORING_STORAGE_KEY);
localStorage.failWrites = true;
assert.throws(() => unsaved.set(saveEditAtom), /quota/);
assert.deepEqual(unsaved.get(editSessionSnapshotAtom), saved);
assert.equal(localStorage.getItem(AUTHORING_STORAGE_KEY), bytes);
localStorage.failWrites = false;
unsaved.set(saveEditAtom);
dispose();
const confirmed = createStore();
dispose = initializeAuthoringPersistence(confirmed);
assert(
  !confirmed.get(aliasesAtom).tokens.some((token) => token.id === alias.id),
);
confirmed.set(saveEditAtom);
assert(
  !confirmed.get(aliasesAtom).tokens.some((token) => token.id === alias.id),
);
const corrupt = JSON.parse(localStorage.getItem(AUTHORING_STORAGE_KEY)!);
corrupt.saved.aliases.tokens[0].$ref = crypto.randomUUID();
const corruptedBytes = JSON.stringify(corrupt);
dispose();
localStorage.data.set(AUTHORING_STORAGE_KEY, corruptedBytes);
const invalid = createStore();
dispose = initializeAuthoringPersistence(invalid);
assert(
  invalid
    .get(persistenceIssuesAtom)
    .some((issue) => issue.includes("unavailable canonical target")),
);
assert.equal(localStorage.getItem(AUTHORING_STORAGE_KEY), corruptedBytes);
assert.throws(() => invalid.set(saveEditAtom), /Reset all/);
invalid.set(resetAllAuthoringAtom);
assert.deepEqual(invalid.get(aliasesAtom).tokens, []);
dispose();
Reflect.deleteProperty(globalThis, "window");
console.log(
  "Alias working/saved reload, read-only deletion, Cancel, quota atomicity, saved deletion and corrupt-target recovery passed.",
);
