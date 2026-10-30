// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { createStore } from "jotai";
import { upgradeColorFamilySnapshot } from "../src/features/edit-session/colorFamilyUpgrade";
import { createDefaultSnapshot } from "../src/features/edit-session/state";
import { buildCascadeTokenExport } from "../src/features/tokens/cascadeExport";
import { modeSetDefaultMode } from "../src/features/modes/model";

const categoryId = "b8fbee94-999d-4776-bf18-1b807b3f60b0";
const legacy = createDefaultSnapshot();
const category = legacy.taxonomy!.categories.find(
  (category) => category.id === categoryId,
)!;
assert.equal(category.key, "colorFamily");
category.key = "colorName";
category.name = "Color name";
const before = structuredClone(legacy);
const upgraded = upgradeColorFamilySnapshot(legacy);
assert.deepEqual(
  legacy,
  before,
  "Migration does not mutate a stored snapshot.",
);
assert.deepEqual(
  upgraded,
  createDefaultSnapshot(),
  "Only the field key and uncustomized label change.",
);
assert.equal(
  upgradeColorFamilySnapshot(upgraded),
  upgraded,
  "Migration is idempotent.",
);
const custom = structuredClone(legacy);
custom.taxonomy!.categories.find(
  (category) => category.id === categoryId,
)!.name = "My color labels";
assert.equal(
  upgradeColorFamilySnapshot(custom).taxonomy!.categories.find(
    (category) => category.id === categoryId,
  )!.name,
  "My color labels",
);
const conflict = structuredClone(legacy);
const extraId = crypto.randomUUID();
conflict.taxonomy!.categories.push({
  ...category,
  id: extraId,
  key: "colorFamily",
});
conflict.taxonomy!.order.push(extraId);
const conflictingBefore = structuredClone(conflict);
assert.throws(
  () => upgradeColorFamilySnapshot(conflict),
  /already belongs to another Registry category/,
);
assert.deepEqual(
  conflict,
  conflictingBefore,
  "Conflicting authored fields are never overwritten.",
);

const output = (snapshot: typeof legacy) =>
  buildCascadeTokenExport({
    base: snapshot.colorSystem,
    taxonomy: snapshot.taxonomy,
    modeSets: snapshot.modeSets,
    activeModes: snapshot.modeSets
      .map(modeSetDefaultMode)
      .filter((mode) => mode !== undefined),
    activeTokens: [],
    overrides: snapshot.tokenOverrides,
    rules: snapshot.rules,
  });
const oldOutput = output(legacy);
const newOutput = output(upgraded);
assert.deepEqual(
  newOutput.tokens.map(({ uuid, conceptId, value }) => ({
    uuid,
    conceptId,
    value,
  })),
  oldOutput.tokens.map(({ uuid, conceptId, value }) => ({
    uuid,
    conceptId,
    value,
  })),
  "Token identities, denominators and color values are unchanged.",
);
assert.deepEqual(
  Object.values(newOutput.taxonomy!.projections).map(
    (projection) => projection.name,
  ),
  Object.values(oldOutput.taxonomy!.projections).map(
    (projection) => projection.name,
  ),
  "Human-readable token names are unchanged.",
);
assert(newOutput.tokens.some((token) => token.name.colorFamily === "gray"));
assert(newOutput.tokens.every((token) => !("colorName" in token.name)));

const data = new Map<string, string>();
const events = new EventTarget();
Object.defineProperty(globalThis, "window", {
  configurable: true,
  value: {
    localStorage: {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => data.set(key, value),
      removeItem: (key: string) => data.delete(key),
    },
    addEventListener: events.addEventListener.bind(events),
    removeEventListener: events.removeEventListener.bind(events),
  },
});
const { initializeAuthoringPersistence } =
  await import("../src/features/edit-session/persistence");
const { AUTHORING_STORAGE_KEY, AUTHORING_RECORD_VERSION } =
  await import("../src/features/edit-session/storage");
const {
  authoringSnapshotAtom,
  editSessionSnapshotAtom,
  enterEditModeAtom,
  saveEditAtom,
  cancelEditAtom,
} = await import("../src/features/edit-session/state");
const {
  updateColorSystemSettingsAtom,
  addColorScaleAtom,
  addPaletteColorAtom,
} = await import("../src/features/color-system/state");
const { persistenceIssuesAtom, flushPersistedState } =
  await import("../src/state/persist");
const { changeGroupsAtom } = await import("../src/features/changelog/state");
const working = structuredClone(legacy);
working.colorSystem.settings.extOffset = 0.37;
const record = {
  version: 15,
  saved: legacy,
  working,
  isEditing: true,
  attachments: {},
  savedAttachments: {},
};
data.set(AUTHORING_STORAGE_KEY, JSON.stringify(record));
const store = createStore();
let dispose = initializeAuthoringPersistence(store);
assert.deepEqual(store.get(persistenceIssuesAtom), []);
assert.deepEqual(
  store.get(authoringSnapshotAtom),
  upgradeColorFamilySnapshot(working),
);
assert.deepEqual(store.get(editSessionSnapshotAtom), upgraded);
assert.equal(
  JSON.parse(data.get(AUTHORING_STORAGE_KEY)!).version,
  AUTHORING_RECORD_VERSION,
);
assert.deepEqual(
  JSON.parse(data.get(AUTHORING_STORAGE_KEY)!).attachments,
  record.attachments,
);
assert.deepEqual(
  JSON.parse(data.get(AUTHORING_STORAGE_KEY)!).savedAttachments,
  record.savedAttachments,
);
assert(
  !store
    .get(changeGroupsAtom)
    .some((group) => group.items.some((item) => item.topic === "registry")),
  "The version upgrade does not create phantom Registry changes.",
);
store.set(cancelEditAtom);
assert.deepEqual(
  store.get(authoringSnapshotAtom),
  upgraded,
  "Cancel uses the upgraded saved baseline.",
);
store.set(enterEditModeAtom);
const scaleId = store.set(addColorScaleAtom);
const paletteId = store.set(addPaletteColorAtom);
const contributed = store.get(authoringSnapshotAtom);
for (const source of [
  contributed.colorSystem.scales.find((source) => source.id === scaleId)!,
  contributed.colorSystem.palette.find((source) => source.id === paletteId)!,
]) {
  assert.equal(
    source.nameRef?.categoryId,
    categoryId,
    "New colors keep contributing to the same category UUID.",
  );
  assert(
    contributed.taxonomy!.terms.some(
      (term) => term.id === source.nameRef?.termId,
    ),
  );
}
store.set(cancelEditAtom);
assert.deepEqual(
  store.get(authoringSnapshotAtom),
  upgraded,
  "Cancel removes newly contributed sources and terms.",
);
store.set(enterEditModeAtom);
store.set(updateColorSystemSettingsAtom, { extOffset: 0.41 });
store.set(saveEditAtom);
const saved = structuredClone(store.get(authoringSnapshotAtom));
store.set(updateColorSystemSettingsAtom, { extOffset: 0.45 });
flushPersistedState();
dispose();
const restored = createStore();
dispose = initializeAuthoringPersistence(restored);
assert.deepEqual(restored.get(persistenceIssuesAtom), []);
assert.equal(
  restored.get(authoringSnapshotAtom).colorSystem.settings.extOffset,
  0.45,
);
assert.deepEqual(restored.get(editSessionSnapshotAtom), saved);
restored.set(cancelEditAtom);
assert.deepEqual(
  restored.get(authoringSnapshotAtom),
  saved,
  "Save/Cancel/reload retain the same Registry identities.",
);
dispose();
data.set(
  AUTHORING_STORAGE_KEY,
  JSON.stringify({ ...record, working: conflict }),
);
const conflictingBytes = data.get(AUTHORING_STORAGE_KEY);
const blocked = createStore();
dispose = initializeAuthoringPersistence(blocked);
assert(
  blocked
    .get(persistenceIssuesAtom)
    .some((issue) => issue.includes("already belongs")),
);
assert.equal(
  data.get(AUTHORING_STORAGE_KEY),
  conflictingBytes,
  "A failed migration preserves the original stored bytes and reports why.",
);
dispose();
console.log(
  "Color family classification, identity and persistence upgrade passed.",
);
