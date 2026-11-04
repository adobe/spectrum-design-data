// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { createStore } from "jotai";
import {
  AUTHORING_RECORD_VERSION,
  AUTHORING_STORAGE_KEY,
  readAuthoringRecord,
  writeAuthoringRecord,
} from "../src/features/edit-session/storage";
import {
  assertStoredSnapshot,
  authoringSnapshotAtom,
  createDefaultSnapshot,
  editSessionSnapshotAtom,
  cancelEditAtom,
  saveEditAtom,
  enterEditModeAtom,
} from "../src/features/edit-session/state";
import { initializeAuthoringPersistence } from "../src/features/edit-session/persistence";
import { renameStructureAtom } from "../src/features/structures/state";
import { structuresDocumentAtom } from "../src/features/structures/documentState";
import { compareAuthoring } from "../src/features/changelog/registry";
import { buildTshirtArtifacts } from "../src/features/design-data/tshirtArtifacts";
import {
  decodeStructureSource,
  encodeStructureSource,
} from "../src/features/edit-session/structureSourceCodec";
import { isPortableStructuresDocument } from "../src/features/structures/portableShape";
import {
  sourceResetPlan,
  prepareChangeReset,
} from "../src/features/changelog/resetPlans";
import { taxonomyDocumentAtom } from "../src/features/taxonomy/state";
import type { EditSessionSnapshot } from "../src/features/edit-session/state";
import type { PortableStructuresDocument } from "../src/features/structures/portableModel";

class MemoryStorage {
  data = new Map<string, string>();
  writes = 0;
  fail = false;
  getItem(key: string) {
    return this.data.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    if (this.fail) throw new Error("Quota exceeded.");
    this.writes++;
    this.data.set(key, value);
  }
  removeItem(key: string) {
    this.data.delete(key);
  }
}
const localStorage = new MemoryStorage();
const events = new EventTarget();
const previousWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
Object.defineProperty(globalThis, "window", {
  value: {
    localStorage,
    addEventListener: events.addEventListener.bind(events),
    removeEventListener: events.removeEventListener.bind(events),
  },
  configurable: true,
});
const source = createDefaultSnapshot();
const original = structuredClone(source);
const stored = encodeStructureSource(source);
assert.deepEqual(source, original);
const shape = stored as Omit<EditSessionSnapshot, "structures"> & {
  structures: PortableStructuresDocument;
};
assert.ok(isPortableStructuresDocument(shape.structures));
assert.ok(
  shape.structures.structures.every(
    (structure) => !("editor" in structure) && !("properties" in structure),
  ),
);
assert.ok(shape.structures.publications.length > 0);
assert.deepEqual(decodeStructureSource(stored), source);
assert.deepEqual(
  buildTshirtArtifacts(decodeStructureSource(stored) as EditSessionSnapshot),
  buildTshirtArtifacts(source),
);
const options = {
  version: AUTHORING_RECORD_VERSION,
  working: source,
  saved: structuredClone(source),
  isEditing: false,
  attachments: {},
  savedAttachments: {},
} as const;
writeAuthoringRecord(options);
const serialized = localStorage.getItem(AUTHORING_STORAGE_KEY)!;
assert.equal(JSON.parse(serialized).version, 22);
writeAuthoringRecord(options);
assert.equal(localStorage.writes, 1, "Identical writes are not repeated.");
const record = readAuthoringRecord(assertStoredSnapshot)!;
assert.deepEqual(record.working, source);
assert.deepEqual(record.saved, source);

// Old saved and working sources remain independent; migration is not reseeding.
const legacyWorking = structuredClone(source);
const legacySaved = structuredClone(source);
for (const snapshot of [legacyWorking, legacySaved])
  for (const structure of snapshot.structures!.structures) {
    delete structure.nameRef;
    for (const property of structure.editor?.properties ?? [])
      if (property.kind === "variant") delete property.categoryId;
  }
legacyWorking.structures!.structures[0].name = "Edited base";
legacyWorking.structures!.structures[0].description = "Keep this draft.";
legacySaved.structures!.structures[0].description = "Saved separately.";
localStorage.data.set(
  AUTHORING_STORAGE_KEY,
  JSON.stringify({
    ...options,
    version: 20,
    isEditing: true,
    working: legacyWorking,
    saved: legacySaved,
  }),
);
const store = createStore();
const stop = initializeAuthoringPersistence(store, { validateScheduled: null });
const working = store.get(authoringSnapshotAtom);
const saved = store.get(editSessionSnapshotAtom)!;
assert.equal(working.structures!.structures[0].name, "Edited base");
assert.equal(saved.structures!.structures[0].name, "Base");
assert.equal(working.structures!.structures[0].description, "Keep this draft.");
assert.equal(saved.structures!.structures[0].description, "Saved separately.");
assert.deepEqual(
  working.structures!.structures[0].generation,
  legacyWorking.structures!.structures[0].generation,
);
assert.ok(
  working.structures!.structures.every(
    (structure) => structure.nameRef || structure.parentStructureId,
  ),
);
const text = working.structures!.structures.find(
  (structure) => structure.name === "Text",
)!;
assert.equal(text.nameRef!.termId, "34e351e7-37c2-4df2-ac75-4f04e25272f3");
assert.equal(
  working.taxonomy!.categories.find(
    (category) => category.id === text.nameRef!.categoryId,
  )!.key,
  "element",
);
assert.deepEqual(
  JSON.parse(localStorage.getItem(AUTHORING_STORAGE_KEY)!).working.structures,
  (encodeStructureSource(working) as typeof shape).structures,
);
store.set(cancelEditAtom);
assert.deepEqual(store.get(structuresDocumentAtom), saved.structures);
store.set(enterEditModeAtom);
store.set(renameStructureAtom, { id: text.conceptId, name: "Text template" });
const renamed = store
  .get(structuresDocumentAtom)
  .structures.find((structure) => structure.conceptId === text.conceptId)!;
assert.equal(renamed.name, "Text template");
assert.notEqual(renamed.nameRef!.termId, text.nameRef!.termId);
const registry = store.get(taxonomyDocumentAtom);
assert.equal(
  registry.terms.find((term) => term.id === renamed.nameRef!.termId)!.value,
  "text template",
);
assert.equal(
  registry.categories.find(
    (category) => category.id === renamed.nameRef!.categoryId,
  )!.key,
  "element",
);

const changes = compareAuthoring(saved, store.get(authoringSnapshotAtom));
const nameReference = changes.groups
  .flatMap((group) => group.items.flatMap((item) => item.fields))
  .find(
    (field) =>
      field.address?.path[0] === "structures" &&
      field.address.path.includes("termId") &&
      field.address.path.includes("nameRef") &&
      !field.address.path.includes("generation"),
  );
assert.ok(
  nameReference?.address,
  "Registry name references participate in source Changes.",
);
const resetInput = structuredClone(store.get(authoringSnapshotAtom));
resetInput.structures!.structures.find(
  (structure) => structure.conceptId === text.conceptId,
)!.description = "Keep this unrelated edit.";
const reset = prepareChangeReset(
  { ...resetInput, attachments: {} },
  sourceResetPlan("Restore Structure name binding", [nameReference.address]),
);
assert.equal(
  reset.structures!.structures.find(
    (structure) => structure.conceptId === text.conceptId,
  )!.nameRef!.termId,
  text.nameRef!.termId,
);
assert.equal(
  reset.structures!.structures.find(
    (structure) => structure.conceptId === text.conceptId,
  )!.description,
  "Keep this unrelated edit.",
);
assert.throws(
  () =>
    assertStoredSnapshot({
      ...resetInput,
      taxonomy: {
        ...resetInput.taxonomy!,
        terms: resetInput.taxonomy!.terms.filter(
          (term) => term.id !== renamed.nameRef!.termId,
        ),
      },
    }),
  /Registry name/,
  "Registry terms referenced by authored Structure names cannot be removed.",
);
store.set(saveEditAtom);
const savedAfterRename = store.get(editSessionSnapshotAtom)!;
assert.deepEqual(
  readAuthoringRecord(assertStoredSnapshot)!.saved,
  savedAfterRename,
);
stop();
const reloaded = createStore();
const stopReload = initializeAuthoringPersistence(reloaded, {
  validateScheduled: null,
});
assert.deepEqual(
  reloaded.get(structuresDocumentAtom),
  savedAfterRename.structures,
);
stopReload();

const invalid = JSON.parse(localStorage.getItem(AUTHORING_STORAGE_KEY)!);
invalid.saved.structures.structures[0].name.termId = crypto.randomUUID();
localStorage.data.set(AUTHORING_STORAGE_KEY, JSON.stringify(invalid));
const beforeInvalid = localStorage.getItem(AUTHORING_STORAGE_KEY);
assert.throws(() => readAuthoringRecord(assertStoredSnapshot), /Registry term/);
assert.equal(localStorage.getItem(AUTHORING_STORAGE_KEY), beforeInvalid);
localStorage.data.set(AUTHORING_STORAGE_KEY, serialized);
localStorage.fail = true;
assert.throws(
  () => writeAuthoringRecord({ ...options, isEditing: true }),
  /Quota/,
);
assert.equal(localStorage.getItem(AUTHORING_STORAGE_KEY), serialized);
localStorage.fail = false;
if (previousWindow) Object.defineProperty(globalThis, "window", previousWindow);
else Reflect.deleteProperty(globalThis, "window");
console.log(
  "Portable storage: atomic saved/working migration, no reseeding, Registry naming, Changes/reset, Save/Cancel/reload and failed-write preservation passed.",
);
