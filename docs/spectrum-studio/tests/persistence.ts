// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { createStore } from "jotai";

class MemoryStorage implements Storage {
  data = new Map<string, string>();
  writes = 0;
  failWrites = false;
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
    if (this.failWrites) throw new Error("Storage quota exceeded.");
    this.writes++;
    this.data.set(key, value);
  }
}
const localStorage = new MemoryStorage();
const sessionStorage = new MemoryStorage();
for (const storage of [localStorage, sessionStorage]) {
  storage.data.set("leonardo:v1:foundations/color", "old testing edits");
  storage.data.set("leonardo:v1:artifacts/dimensions", "old derived cache");
  storage.data.set("another-app", "preserve");
  storage.data.set("leonardo:v1:unknown-owner", "preserve");
}
const events = new EventTarget();
Object.defineProperty(globalThis, "window", {
  value: {
    localStorage,
    sessionStorage,
    addEventListener: events.addEventListener.bind(events),
    removeEventListener: events.removeEventListener.bind(events),
  },
  configurable: true,
});
const {
  persistedAtom,
  flushPersistedState,
  persistenceIssuesAtom,
  PROTOTYPE_STORAGE_KEYS,
} = await import("../src/state/persist");
const store = createStore();
const number = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);
const state = persistedAtom({
  key: "foundations/color",
  schemaVersion: 1,
  initialize: () => 0,
  validate: number,
});
assert.equal(store.get(state), 0);
store.set(state, 1);
store.set(state, 2);
flushPersistedState();
assert.equal(store.get(state), 2);
assert.throws(() => store.set(state, NaN), /invalid data/);
assert.equal(store.get(state), 2);
assert.throws(
  () =>
    persistedAtom({
      key: "invalid/default",
      schemaVersion: 1,
      initialize: () => NaN,
      validate: number,
    }),
  /invalid shipped defaults/,
);
for (const storage of [localStorage, sessionStorage]) {
  for (const key of PROTOTYPE_STORAGE_KEYS)
    assert.equal(storage.getItem(key), null);
  assert.equal(storage.getItem("another-app"), "preserve");
  assert.equal(storage.getItem("leonardo:v1:unknown-owner"), "preserve");
  assert.equal(storage.writes, 0);
}
const fresh = persistedAtom({
  key: "foundations/color",
  schemaVersion: 1,
  initialize: () => 0,
  validate: number,
});
assert.equal(
  store.get(fresh),
  0,
  "New page state comes from defaults, not earlier edits.",
);
assert.deepEqual(store.get(persistenceIssuesAtom), []);

const { initializeAuthoringPersistence } =
  await import("../src/features/edit-session/persistence");
const {
  AUTHORING_STORAGE_KEY,
  PREFERENCES_STORAGE_KEY,
  AUTHORING_RECORD_VERSION,
} = await import("../src/features/edit-session/storage");
const {
  authoringSnapshotAtom,
  assertStoredSnapshot,
  enterEditModeAtom,
  saveEditAtom,
  cancelEditAtom,
  editSessionSnapshotAtom,
  resetAllAuthoringAtom,
  createDefaultSnapshot,
} = await import("../src/features/edit-session/state");
const { colorSystemDocumentAtom, updateColorSystemSettingsAtom } =
  await import("../src/features/color-system/state");
const { modeSelectionAtom } = await import("../src/features/modes/selection");
const { appColorSchemeAtom } = await import("../src/state/view/appAppearance");
const { editModeAtom } = await import("../src/state/view/editMode");
const { platformsAtom } = await import("../src/features/platforms/state");
const { foundationModeAttachmentsAtom } =
  await import("../src/state/view/foundationModeAttachments");
const { changeGroupsAtom } = await import("../src/features/changelog/state");

const authored = createStore();
let dispose = initializeAuthoringPersistence(authored);
assertStoredSnapshot(authored.get(authoringSnapshotAtom));
assert.deepEqual(
  authored.get(authoringSnapshotAtom),
  createDefaultSnapshot(),
  "Fresh startup uses shipped defaults without hardcoded authoring edits.",
);
assert.deepEqual(
  authored.get(editSessionSnapshotAtom),
  createDefaultSnapshot(),
);
assert.deepEqual(
  authored.get(changeGroupsAtom),
  [],
  "Fresh startup has no seeded change-log entries.",
);
assert.equal(authored.get(editModeAtom), false);
authored.set(enterEditModeAtom);
const initialWrites = localStorage.writes;
for (let value = 0.1; value <= 0.5; value += 0.1)
  authored.set(updateColorSystemSettingsAtom, { extOffset: value });
assert.equal(
  localStorage.writes,
  initialWrites,
  "Working writes are coalesced, not performed per slider event.",
);
flushPersistedState();
assert.equal(localStorage.writes, initialWrites + 1);
const record = JSON.parse(localStorage.getItem(AUTHORING_STORAGE_KEY)!);
assert.equal(record.working.colorSystem.settings.extOffset, 0.5);
assert.deepEqual(record.saved, createDefaultSnapshot());
dispose();
const staleMembership = createStore();
dispose = initializeAuthoringPersistence(staleMembership);
staleMembership.set(enterEditModeAtom);
staleMembership.set(foundationModeAttachmentsAtom, { removed: ["color"] });
flushPersistedState();
assert.deepEqual(
  JSON.parse(localStorage.getItem(AUTHORING_STORAGE_KEY)!).attachments,
  {},
);
staleMembership.set(saveEditAtom);
assert.deepEqual(
  staleMembership.get(foundationModeAttachmentsAtom),
  {},
  "Save prunes membership after scoped mode reverts.",
);
dispose();
localStorage.data.set(PREFERENCES_STORAGE_KEY, '{"broken":true}');
const badPreferences = createStore();
dispose = initializeAuthoringPersistence(badPreferences);
badPreferences.set(saveEditAtom);
assert.ok(
  badPreferences
    .get(persistenceIssuesAtom)
    .some((issue) => issue.includes("appearance or mode choices")),
  "Saving authoring data must not hide an unresolved preference failure.",
);
assert.equal(localStorage.getItem(PREFERENCES_STORAGE_KEY), '{"broken":true}');
badPreferences.set(appColorSchemeAtom, "dark");
assert.equal(
  JSON.parse(localStorage.getItem(PREFERENCES_STORAGE_KEY)!).appearance,
  "dark",
  "An explicit preference change can replace an invalid preference record.",
);
assert.deepEqual(badPreferences.get(persistenceIssuesAtom), []);
dispose();

const restored = createStore();
dispose = initializeAuthoringPersistence(restored);
assert.equal(restored.get(editModeAtom), true, "Refresh resumes editing.");
assert.equal(restored.get(colorSystemDocumentAtom).settings.extOffset, 0.5);
restored.set(saveEditAtom);
const saved = structuredClone(restored.get(authoringSnapshotAtom));
restored.set(updateColorSystemSettingsAtom, { extOffset: 0.8 });
flushPersistedState();
dispose();
const afterRefresh = createStore();
dispose = initializeAuthoringPersistence(afterRefresh);
assert.equal(afterRefresh.get(colorSystemDocumentAtom).settings.extOffset, 0.8);
assert.deepEqual(afterRefresh.get(editSessionSnapshotAtom), saved);
afterRefresh.set(cancelEditAtom);
assert.deepEqual(
  afterRefresh.get(authoringSnapshotAtom),
  saved,
  "Cancel restores the last save, not refreshed working state.",
);
assert.equal(afterRefresh.get(editModeAtom), false);

const beforePreferences = localStorage.getItem(AUTHORING_STORAGE_KEY);
afterRefresh.set(appColorSchemeAtom, "dark");
afterRefresh.set(modeSelectionAtom, { colorScheme: "mode-dark" });
assert.equal(localStorage.getItem(AUTHORING_STORAGE_KEY), beforePreferences);
assert.equal(
  JSON.parse(localStorage.getItem(PREFERENCES_STORAGE_KEY)!).appearance,
  "dark",
);
afterRefresh.set(enterEditModeAtom);
afterRefresh.set(platformsAtom, (platforms) =>
  platforms.map((platform, index) =>
    index === 0 ? { ...platform, name: "Changed platform" } : platform,
  ),
);
afterRefresh.set(foundationModeAttachmentsAtom, {
  "mode-set-color-scheme": ["spacing"],
});
const baseline = afterRefresh.get(editSessionSnapshotAtom);
flushPersistedState();
localStorage.failWrites = true;
assert.throws(() => afterRefresh.set(saveEditAtom), /quota/);
assert.equal(
  afterRefresh.get(editSessionSnapshotAtom),
  baseline,
  "Failed Save must not advance its baseline.",
);
assert.throws(() => afterRefresh.set(cancelEditAtom), /quota/);
assert.equal(afterRefresh.get(editModeAtom), true);
assert.equal(afterRefresh.get(platformsAtom)[0].name, "Changed platform");
localStorage.failWrites = false;
afterRefresh.set(resetAllAuthoringAtom);
assert.deepEqual(
  afterRefresh.get(authoringSnapshotAtom),
  createDefaultSnapshot(),
);
assert.deepEqual(
  afterRefresh.get(editSessionSnapshotAtom),
  createDefaultSnapshot(),
);
assert.deepEqual(
  afterRefresh.get(changeGroupsAtom),
  [],
  "Reset all removes existing edits instead of replaying testing changes.",
);
assert.deepEqual(afterRefresh.get(foundationModeAttachmentsAtom), {});
assert.equal(
  afterRefresh.get(appColorSchemeAtom),
  "dark",
  "Resetting data preserves app appearance.",
);
dispose();

const malformed = '{"version":1,"working":"broken"}';
localStorage.data.set(AUTHORING_STORAGE_KEY, malformed);
const invalid = createStore();
dispose = initializeAuthoringPersistence(invalid);
assert.ok(invalid.get(persistenceIssuesAtom).length);
assert.equal(
  localStorage.getItem(AUTHORING_STORAGE_KEY),
  malformed,
  "Invalid data is preserved, never overwritten on startup.",
);
assert.throws(() => invalid.set(saveEditAtom), /Reset all/);
invalid.set(resetAllAuthoringAtom);
assert.deepEqual(invalid.get(persistenceIssuesAtom), []);
dispose();
const badReference = createDefaultSnapshot();
badReference.colorSystem.scales[0].nameRef = {
  categoryId: crypto.randomUUID(),
  termId: crypto.randomUUID(),
};
assert.throws(() => assertStoredSnapshot(badReference), /reference/);
const badPalette = createDefaultSnapshot();
badPalette.colorSystem.scales[0].stops[0].paletteColorId = "missing";
assert.throws(() => assertStoredSnapshot(badPalette), /palette color/);
const badPlatform = createDefaultSnapshot();
badPlatform.modeSets[0].modes[0].platformIds = ["missing"];
assert.throws(() => assertStoredSnapshot(badPlatform), /platform/);
const badLineHeightRule = createDefaultSnapshot();
badLineHeightRule.typography.lineHeightRoundingRuleId = "missing";
assert.throws(() => assertStoredSnapshot(badLineHeightRule), /rounding rule/);
const oldTypography = createDefaultSnapshot();
Object.assign(oldTypography.typography, { schemaVersion: 7 });
assert.throws(() => assertStoredSnapshot(oldTypography), /invalid/);
const badTypeScale = createDefaultSnapshot();
badTypeScale.scaleTypes = badTypeScale.scaleTypes!.filter(
  (formula) => formula.id !== badTypeScale.typography.scaleTypeId,
);
assert.throws(() => assertStoredSnapshot(badTypeScale), /invalid/);
const badShape = createDefaultSnapshot();
badShape.interpolations![0] = {
  id: "interpolation-linear",
  name: "Invalid",
  description: "",
  kind: "expression",
  parameters: [],
  expression: "x / 2",
};
assert.throws(() => assertStoredSnapshot(badShape), /invalid/);
const badAdaptiveOutput = createDefaultSnapshot();
const ratioShapeIndex = badAdaptiveOutput.interpolations!.findIndex(
  (shape) => shape.id === "interpolation-linear",
);
assert.notEqual(ratioShapeIndex, -1);
badAdaptiveOutput.interpolations![ratioShapeIndex] = {
  id: "interpolation-linear",
  name: "Overshoot",
  description: "",
  kind: "expression",
  parameters: [],
  expression: "x + 120 * x * (1 - x)",
};
assert.throws(() => assertStoredSnapshot(badAdaptiveOutput), /ratio positive/);

const {
  addLineHeightAtom,
  renameLineHeightAtom,
  typographyDocumentAtom,
  updateTypographyAtom,
} = await import("../src/features/typography/state");
const { replaceScaleTypeAtom, scaleTypesAtom } =
  await import("../src/features/logic/scaleTypeLibrary");
const { taxonomyDocumentAtom } = await import("../src/features/taxonomy/state");
const { browserTokenEditsAtom } =
  await import("../src/features/tokens/browserEdits");
const { browserModeContextAtom, editBrowserTokensAtom } =
  await import("../src/features/tokens/browserState");
const typographyEdit = createStore();
dispose = initializeAuthoringPersistence(typographyEdit);
typographyEdit.set(enterEditModeAtom);
const lineHeightId = typographyEdit.set(addLineHeightAtom);
typographyEdit.set(renameLineHeightAtom, { id: lineHeightId, name: "Reading" });
const formula = typographyEdit
  .get(scaleTypesAtom)
  .find(
    (item) =>
      item.id === typographyEdit.get(typographyDocumentAtom).scaleTypeId,
  )!;
typographyEdit.set(replaceScaleTypeAtom, {
  ...formula,
  base: { ...formula.base, default: 18 },
});
typographyEdit.set(updateTypographyAtom, {
  outputUnit: "pt",
  iconography: { alignment: "line-height", baseSize: 30, lineHeightId },
});
typographyEdit.set(editBrowserTokensAtom, {
  ids: ["typography-font-size-100"],
  modeKey: typographyEdit.get(browserModeContextAtom).key,
  patch: { value: "12pt" },
});
const workingTypography = structuredClone(
  typographyEdit.get(authoringSnapshotAtom),
);
assertStoredSnapshot(workingTypography);
flushPersistedState();
dispose();

const typographyReload = createStore();
dispose = initializeAuthoringPersistence(typographyReload);
assert.deepEqual(
  typographyReload.get(authoringSnapshotAtom),
  workingTypography,
  "unsaved cards, names, units, icon references, formulas and edits restore together",
);
assert.deepEqual(
  typographyReload.get(editSessionSnapshotAtom),
  createDefaultSnapshot(),
  "reload retains the distinct saved baseline",
);
assert.equal(typographyReload.get(editModeAtom), true);
typographyReload.set(saveEditAtom);
assert.deepEqual(
  typographyReload.get(editSessionSnapshotAtom),
  workingTypography,
);
typographyReload.set(renameLineHeightAtom, {
  id: lineHeightId,
  name: "Temporary",
});
typographyReload.set(updateTypographyAtom, {
  outputUnit: "em",
  hideFromPublishing: true,
});
typographyReload.set(replaceScaleTypeAtom, {
  ...formula,
  base: { ...formula.base, default: 20 },
});
flushPersistedState();
dispose();

const typographyCancel = createStore();
dispose = initializeAuthoringPersistence(typographyCancel);
assert.equal(typographyCancel.get(typographyDocumentAtom).outputUnit, "em");
assert.deepEqual(
  typographyCancel.get(editSessionSnapshotAtom),
  workingTypography,
);
typographyCancel.set(cancelEditAtom);
assert.deepEqual(
  typographyCancel.get(authoringSnapshotAtom),
  workingTypography,
  "Cancel restores saved Registry, formulas, cards, references, visibility and edits atomically",
);
assert.deepEqual(
  typographyCancel.get(taxonomyDocumentAtom),
  workingTypography.taxonomy,
);
assert.deepEqual(
  typographyCancel.get(browserTokenEditsAtom),
  workingTypography.browserTokenEdits,
);
flushPersistedState();
dispose();

const typographySavedReload = createStore();
dispose = initializeAuthoringPersistence(typographySavedReload);
assert.deepEqual(
  typographySavedReload.get(authoringSnapshotAtom),
  workingTypography,
);
typographySavedReload.set(resetAllAuthoringAtom);
assert.deepEqual(
  typographySavedReload.get(authoringSnapshotAtom),
  createDefaultSnapshot(),
);
dispose();

const {
  addStructureAtom,
  assignStructureAtom,
  renameStructureAtom,
  structuresDocumentAtom,
  removeStructureAtom,
  selectedStructureIdAtom,
} = await import("../src/features/structures/state");
const { primitiveReferencesAtom } =
  await import("../src/features/tokens/primitiveReferenceState");
const layout = {
  availableWidth: 500,
  availableHeight: 300,
  naturalWidth: 98,
  naturalHeight: 34,
};
const structureEdit = createStore();
dispose = initializeAuthoringPersistence(structureEdit);
structureEdit.set(enterEditModeAtom);
const structureId = structureEdit.set(addStructureAtom);
const sizeReference = structureEdit
  .get(primitiveReferencesAtom)
  .find((item) => item.family === "size")!;
structureEdit.set(assignStructureAtom, {
  id: structureId,
  changes: { width: { $ref: sizeReference.id } },
  layout,
});
structureEdit.set(renameStructureAtom, {
  id: structureId,
  name: "Saved structure",
});
const structureWorking = structuredClone(
  structureEdit.get(authoringSnapshotAtom),
);
flushPersistedState();
assert.equal(
  JSON.parse(localStorage.getItem(AUTHORING_STORAGE_KEY)!).version,
  AUTHORING_RECORD_VERSION,
);
dispose();

const structureReload = createStore();
dispose = initializeAuthoringPersistence(structureReload);
assert.deepEqual(structureReload.get(authoringSnapshotAtom), structureWorking);
assert.deepEqual(
  structureReload.get(editSessionSnapshotAtom),
  createDefaultSnapshot(),
);
assert.equal(
  structureReload.get(selectedStructureIdAtom),
  null,
  "Selection is not durable authoring data.",
);
structureReload.set(saveEditAtom);
const savedStructure = structuredClone(
  structureReload.get(editSessionSnapshotAtom),
);
structureReload.set(renameStructureAtom, {
  id: structureId,
  name: "Temporary structure",
});
flushPersistedState();
const beforeFailure = localStorage.getItem(AUTHORING_STORAGE_KEY);
localStorage.failWrites = true;
assert.throws(() => structureReload.set(saveEditAtom), /quota/);
assert.deepEqual(structureReload.get(editSessionSnapshotAtom), savedStructure);
assert.equal(localStorage.getItem(AUTHORING_STORAGE_KEY), beforeFailure);
localStorage.failWrites = false;
dispose();

const structureCancel = createStore();
dispose = initializeAuthoringPersistence(structureCancel);
assert.equal(
  structureCancel
    .get(structuresDocumentAtom)
    .structures.find((structure) => structure.conceptId === structureId)!.name,
  "Temporary structure",
);
structureCancel.set(cancelEditAtom);
assert.deepEqual(structureCancel.get(authoringSnapshotAtom), savedStructure);
assert.equal(structureCancel.get(editModeAtom), false);
structureCancel.set(enterEditModeAtom);
structureCancel.set(removeStructureAtom, structureId);
structureCancel.set(cancelEditAtom);
assert.deepEqual(
  structureCancel.get(structuresDocumentAtom),
  savedStructure!.structures,
);
dispose();

const { STRUCTURE_CATEGORIES, STRUCTURE_TERMS } =
  await import("../src/features/structures/vocabulary");
const { VARIANT_CATEGORIES, SIZE_TERMS } =
  await import("../src/features/taxonomy/variantVocabulary");
for (const version of [1, 2, 3] as const) {
  const older = createDefaultSnapshot();
  delete older.components;
  delete older.structures;
  older.taxonomy!.categories = older.taxonomy!.categories.filter(
    (category) =>
      ![...STRUCTURE_CATEGORIES, ...VARIANT_CATEGORIES].some(
        (item) => item.id === category.id,
      ),
  );
  older.taxonomy!.order = older.taxonomy!.order.filter(
    (id) =>
      ![...STRUCTURE_CATEGORIES, ...VARIANT_CATEGORIES].some(
        (item) => item.id === id,
      ),
  );
  older.taxonomy!.terms = older.taxonomy!.terms.filter(
    (term) =>
      ![...STRUCTURE_TERMS, ...SIZE_TERMS].some((item) => item.id === term.id),
  );
  older.taxonomy!.terms = older.taxonomy!.terms.filter((term) =>
    older.taxonomy!.categories.some(
      (category) => category.id === term.categoryId,
    ),
  );
  older.taxonomy!.categories.forEach((category) => {
    category.scopes = category.scopes.filter((scope) => scope !== "structures");
  });
  if (version === 1) delete older.radius;
  if (version < 3) delete older.elevation;
  const working = structuredClone(older);
  working.spacing!.scales[0].base = 11;
  older.spacing!.scales[0].base = 9;
  localStorage.data.set(
    AUTHORING_STORAGE_KEY,
    JSON.stringify({
      version,
      working,
      saved: older,
      isEditing: true,
      attachments: {},
      savedAttachments: {},
    }),
  );
  const upgrade = createStore();
  dispose = initializeAuthoringPersistence(upgrade);
  const upgradedRecord = JSON.parse(
    localStorage.getItem(AUTHORING_STORAGE_KEY)!,
  );
  assert.equal(upgradedRecord.version, AUTHORING_RECORD_VERSION);
  assert.equal(upgrade.get(authoringSnapshotAtom).spacing!.scales[0].base, 11);
  assert.equal(
    upgrade.get(editSessionSnapshotAtom)!.spacing!.scales[0].base,
    9,
  );
  assert.deepEqual(upgradedRecord.working.structures, {
    schemaVersion: 4,
    structures: [],
  });
  assert.deepEqual(upgradedRecord.saved.structures, {
    schemaVersion: 4,
    structures: [],
  });
  dispose();
}
const incomplete = createDefaultSnapshot();
delete incomplete.structures;
const incompleteBytes = JSON.stringify({
  version: 4,
  working: incomplete,
  saved: createDefaultSnapshot(),
  isEditing: false,
  attachments: {},
  savedAttachments: {},
});
localStorage.data.set(AUTHORING_STORAGE_KEY, incompleteBytes);
const incompleteStore = createStore();
dispose = initializeAuthoringPersistence(incompleteStore);
assert.ok(
  incompleteStore
    .get(persistenceIssuesAtom)
    .some((issue) => issue.includes("incomplete")),
);
assert.equal(
  localStorage.getItem(AUTHORING_STORAGE_KEY),
  incompleteBytes,
  "Missing version-four Structures is not defaulted or rewritten.",
);
assert.throws(() => incompleteStore.set(saveEditAtom), /Reset all/);
incompleteStore.set(resetAllAuthoringAtom);
assert.deepEqual(incompleteStore.get(persistenceIssuesAtom), []);
dispose();
for (const version of [12, 13] as const) {
  const saved = createDefaultSnapshot(),
    working = createDefaultSnapshot();
  const changed = working.components!.components[0];
  changed.declaration.description =
    "An independently restored working definition.";
  changed.declaration.options = Object.fromEntries(
    Object.entries(changed.declaration.options!).reverse(),
  );
  changed.optionOrder = Object.keys(changed.declaration.options).map(
    (name) => changed.identities.options[name],
  );
  const legacy = (snapshot: typeof working) => ({
    ...snapshot,
    components: {
      schemaVersion: 1,
      components: snapshot.components!.components.map(
        ({ optionOrder, ...component }) => {
          void optionOrder;
          return component;
        },
      ),
    },
  });
  localStorage.data.set(
    AUTHORING_STORAGE_KEY,
    JSON.stringify({
      version,
      working: legacy(working),
      saved: legacy(saved),
      isEditing: true,
      attachments: {},
      savedAttachments: {},
    }),
  );
  const restored = createStore();
  dispose = initializeAuthoringPersistence(restored);
  assert.deepEqual(restored.get(persistenceIssuesAtom), []);
  assert.deepEqual(
    restored.get(authoringSnapshotAtom).components,
    working.components,
    "Legacy working order comes from its own option declarations, retaining identities and values.",
  );
  assert.deepEqual(
    restored.get(editSessionSnapshotAtom)!.components,
    saved.components,
    "Legacy saved order is upgraded independently from the working draft.",
  );
  flushPersistedState();
  assert.equal(
    JSON.parse(localStorage.getItem(AUTHORING_STORAGE_KEY)!).version,
    AUTHORING_RECORD_VERSION,
  );
  restored.set(cancelEditAtom);
  assert.deepEqual(
    restored.get(authoringSnapshotAtom).components,
    saved.components,
  );
  dispose();
}
const preservedCatalog = createDefaultSnapshot();
const preservedColorCategory = preservedCatalog.taxonomy!.categories.find(
  (category) => category.key === "colorName",
)!;
preservedCatalog.taxonomy!.terms.push({
  id: "5fa1d788-9cac-432e-bd81-59f6f44cca74",
  categoryId: preservedColorCategory.id,
  value: "Authored color label",
  description: "Keep this existing authored vocabulary.",
});
const preservedBytes = JSON.stringify({
  version: AUTHORING_RECORD_VERSION,
  working: preservedCatalog,
  saved: preservedCatalog,
  isEditing: false,
  attachments: {},
  savedAttachments: {},
});
localStorage.data.set(AUTHORING_STORAGE_KEY, preservedBytes);
const preservedStore = createStore();
dispose = initializeAuthoringPersistence(preservedStore);
assert.deepEqual(
  preservedStore.get(authoringSnapshotAtom),
  preservedCatalog,
  "New shipped vocabulary must not purge valid saved custom terms.",
);
assert.deepEqual(preservedStore.get(editSessionSnapshotAtom), preservedCatalog);
assert.equal(localStorage.getItem(AUTHORING_STORAGE_KEY), preservedBytes);
preservedStore.set(resetAllAuthoringAtom);
assert.deepEqual(
  preservedStore.get(authoringSnapshotAtom),
  createDefaultSnapshot(),
);
assert.equal(
  preservedStore
    .get(taxonomyDocumentAtom)
    .terms.some(
      (term) => term.categoryId === "3b8d399b-9a38-4c85-b3da-fa242530b721",
    ),
  false,
  "Confirmed Reset all uses the reconciled default catalog, not the retired metric seeds.",
);
dispose();
assert.equal(localStorage.getItem("another-app"), "preserve");
assert.equal(localStorage.getItem("leonardo:v1:unknown-owner"), "preserve");
Reflect.deleteProperty(globalThis, "window");
console.log(
  "Persistence: coherent working/saved refresh, Structures and older-envelope upgrades, Save/Cancel/reset, separate preferences, coalescing, reference validation and failure preservation passed.",
);
