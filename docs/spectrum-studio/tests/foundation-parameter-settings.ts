// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { atom, createStore } from "jotai";
import {
  authoringSourceSnapshotAtom,
  assertStoredSnapshot,
  cancelEditAtom,
  createDefaultSnapshot,
  enterEditModeAtom,
  restoreAuthoringSnapshotAtom,
  saveEditAtom,
} from "../src/features/edit-session/state";
import { upgradeFoundationSettingsSnapshot } from "../src/features/edit-session/foundationSettingsUpgrade";
import {
  ADAPTIVE_COLOR_CHANNEL_IDS,
  ADAPTIVE_SETTING_IDS,
  FOUNDATION_SETTING_IDS,
  foundationParameterDefaults,
  isFoundationParameterSettings,
  removeModeCapability,
  restoreModeCapability,
} from "../src/features/modes/foundationSettings";
import {
  clearRememberedModeSettingsAtom,
  foundationParameterSettingsAtom,
  rememberedModeSettingsAtom,
  updateFoundationParameterSettingAtom,
} from "../src/features/modes/foundationSettingsState";
import { adaptiveParametersAtom } from "../src/features/modes/adaptiveSelectors";
import {
  modeSetsAtom,
  removeModeSetAtom,
  writeModeSources,
} from "../src/features/modes/state";
import type { ModeSet } from "../src/features/modes/model";
import { detachFoundationModeSetAtom } from "../src/features/modes/foundationAttachments";
import { previewOverridesAtom } from "../src/features/modes/previewState";
import {
  CUSTOM_MODE_KEY,
  displayedModeIdsAtom,
  resetModeAtom,
} from "../src/features/modes/preview";
import { compareAuthoring } from "../src/features/changelog/registry";
import { legacyChangeGroupsAtom } from "../src/features/changelog/state";
import {
  prepareChangeReset,
  sourceResetPlan,
} from "../src/features/changelog/resetPlans";
import { foundationSettingsParameters } from "../src/features/impact/sources/foundationSettings";
import { resolveColorDocument } from "../src/features/color-system/resolution";
import { applyScaleAdjustment } from "../src/features/color-system/scaleAdjustment";
import { designSystemDefaults } from "../src/data/defaults";
import { canonicalDesignSystemDataset } from "../src/features/design-data/validation";
import { initializeAuthoringPersistence } from "../src/features/edit-session/persistence";
import {
  AUTHORING_STORAGE_KEY,
  AUTHORING_RECORD_VERSION,
  readAuthoringRecord,
} from "../src/features/edit-session/storage";
import {
  flushPersistedState,
  persistenceIssuesAtom,
} from "../src/state/persist";

const original = createDefaultSnapshot();
const scheme = original.modeSets.find((set) => set.key === "colorScheme")!;
const dark = scheme.modes.find((mode) => mode.key === "dark")!;
const wireframe = scheme.modes.find((mode) => mode.key === "wireframe")!;
const id = "color.backgroundLightness";
const settings = foundationParameterDefaults();
assert.equal(FOUNDATION_SETTING_IDS.length, 9);
for (const parameter of [
  "size.componentSize",
  "typography.textSize",
] as const) {
  assert.deepEqual(settings[parameter], { modal: true, adaptive: false });
  const scale = original.modeSets.find((set) => set.key === "scale")!;
  const removed = removeModeCapability(scale, parameter);
  assert(!removed.authoringCapabilities?.includes(parameter));
  assert.deepEqual(restoreModeCapability(removed, scale, parameter), scale);
}
assert.deepEqual(original.foundationParameterSettings, settings);
assert.ok(isFoundationParameterSettings(settings));
assert.equal(
  isFoundationParameterSettings({ ...settings, unexpected: settings[id] }),
  false,
);
assert.equal(
  isFoundationParameterSettings({
    ...settings,
    "elevation.depth": { modal: true, adaptive: true },
  }),
  false,
);

const legacyWorking = structuredClone(original);
delete legacyWorking.foundationParameterSettings;
legacyWorking.adaptiveClaims = { [id]: scheme.id };
const legacySaved = { ...legacyWorking, adaptiveClaims: {} };
const migratedWorking = upgradeFoundationSettingsSnapshot(legacyWorking);
const migratedSaved = upgradeFoundationSettingsSnapshot(legacySaved);
assertStoredSnapshot(migratedWorking);
assertStoredSnapshot(migratedSaved);
assert.equal(migratedWorking.foundationParameterSettings![id].adaptive, true);
assert.equal(migratedSaved.foundationParameterSettings![id].adaptive, false);
assert.deepEqual(migratedWorking.adaptiveClaims, {});
assert.deepEqual(migratedWorking.modeSets, original.modeSets);

const removed = removeModeCapability(scheme, id);
assert.equal(removed.authoringCapabilities?.includes(id), false);
assert.ok(
  removed.modes.every(
    (mode) => mode.foundations.color?.backgroundLightness === undefined,
  ),
);
const renamed = { ...removed, name: "Keep unrelated edits" };
const restored = restoreModeCapability(renamed, scheme, id);
assert.equal(restored.name, renamed.name);
assert.equal(
  restored.modes.find((mode) => mode.id === dark.id)!.foundations.color!
    .backgroundLightness,
  dark.foundations.color!.backgroundLightness,
);
assert.deepEqual(
  restored.modes.find((mode) => mode.id === restored.defaultModeId)!
    .foundations,
  {},
);

const store = createStore();
const replaceSources = atom(null, (get, set, sets: ModeSet[]) =>
  writeModeSources(get, set, sets),
);
store.set(enterEditModeAtom);
const toggle = (kind: "modal" | "adaptive", value: boolean) =>
  store.set(updateFoundationParameterSettingAtom, { id, kind, value });
toggle("adaptive", true);
toggle("modal", false);
assert.equal(store.get(foundationParameterSettingsAtom)[id].adaptive, true);
assert.ok(
  store.get(adaptiveParametersAtom).some((parameter) => parameter.id === id),
);
assert.ok(store.get(rememberedModeSettingsAtom)[id]?.length);
const inactive = store.get(authoringSourceSnapshotAtom);
assert.equal(
  inactive.modeSets
    .find((set) => set.id === scheme.id)!
    .authoringCapabilities?.includes(id),
  false,
);
assert.ok(
  inactive.modeSets.every((set) =>
    set.modes.every(
      (mode) => mode.foundations.color?.backgroundLightness === undefined,
    ),
  ),
);
assertStoredSnapshot(inactive);
assert.equal(
  JSON.stringify(inactive).includes("rememberedModeSettings"),
  false,
);
const portable = canonicalDesignSystemDataset({
  ...designSystemDefaults,
  system: {
    ...designSystemDefaults.system,
    foundationParameterSettings: inactive.foundationParameterSettings,
    modeSets: inactive.modeSets,
  },
});
assert.deepEqual(
  portable.system.foundationParameterSettings,
  inactive.foundationParameterSettings,
);
assert.deepEqual(portable.system.modeSets, inactive.modeSets);
toggle("modal", true);
assert.deepEqual(
  store.get(modeSetsAtom),
  original.modeSets,
  "Toggling before Save restores exact mode values.",
);

const beforePreview = store.get(authoringSourceSnapshotAtom);
store.set(previewOverridesAtom, { [id]: 40 });
assert.deepEqual(store.get(authoringSourceSnapshotAtom), beforePreview);
toggle("adaptive", false);
assert.deepEqual(store.get(previewOverridesAtom), {});
toggle("modal", false);
store.set(saveEditAtom);
assert.deepEqual(store.get(rememberedModeSettingsAtom), {});
toggle("modal", true);
assert.equal(
  store
    .get(modeSetsAtom)
    .find((set) => set.id === scheme.id)!
    .authoringCapabilities?.includes(id),
  false,
  "Main Save permanently discards inactive values.",
);
store.set(cancelEditAtom);
assert.equal(store.get(foundationParameterSettingsAtom)[id].modal, false);
assert.deepEqual(store.get(rememberedModeSettingsAtom), {});
store.set(restoreAuthoringSnapshotAtom, original);
store.set(enterEditModeAtom);
toggle("modal", false);
store.set(clearRememberedModeSettingsAtom, scheme.id);
toggle("modal", true);
assert.equal(
  store
    .get(modeSetsAtom)
    .find((set) => set.id === scheme.id)!
    .authoringCapabilities?.includes(id),
  false,
  "Mode-set Save's scoped clear permanently discards that set's inactive values.",
);

store.set(restoreAuthoringSnapshotAtom, original);
store.set(enterEditModeAtom);
toggle("modal", false);
store.set(removeModeSetAtom, scheme.id);
toggle("modal", true);
assert.ok(!store.get(modeSetsAtom).some((set) => set.id === scheme.id));
assert.equal(
  store.get(foundationParameterSettingsAtom)["typography.textZoom"].adaptive,
  true,
);
store.set(restoreAuthoringSnapshotAtom, original);
toggle("modal", false);
store.set(detachFoundationModeSetAtom, {
  modeSetId: scheme.id,
  foundation: "color",
});
assert.deepEqual(store.get(rememberedModeSettingsAtom)[id], []);

store.set(restoreAuthoringSnapshotAtom, original);
store.set(replaceSources, []);
assert.deepEqual(
  store.get(adaptiveParametersAtom).map((parameter) => parameter.id),
  [
    "color.backgroundLightness",
    "color.contrastMultiplier",
    "typography.textZoom",
  ],
  "Adaptive availability does not require mode sets.",
);
store.set(updateFoundationParameterSettingAtom, {
  id: "color.scaleAdjustment",
  kind: "adaptive",
  value: true,
});
assert.equal(
  store.get(foundationParameterSettingsAtom)["color.scaleAdjustment"].adaptive,
  true,
);
store.set(restoreAuthoringSnapshotAtom, original);
const typographySet = original.modeSets.find((set) =>
  set.authoringCapabilities?.includes("typography.textZoom"),
)!;
store.set(previewOverridesAtom, {
  [ADAPTIVE_COLOR_CHANNEL_IDS[0]]: 40,
  [ADAPTIVE_COLOR_CHANNEL_IDS[1]]: 80,
  "typography.textZoom": 1.5,
});
assert.equal(store.get(displayedModeIdsAtom)[scheme.key], CUSTOM_MODE_KEY);
store.set(resetModeAtom, { modeSetKey: scheme.key, modeId: wireframe.id });
assert.deepEqual(store.get(previewOverridesAtom), {
  "typography.textZoom": 1.5,
});
store.set(
  replaceSources,
  original.modeSets.map((set) =>
    removeModeCapability(set, "color.scaleAdjustment"),
  ),
);
store.set(previewOverridesAtom, {
  "color.hueShift": 20,
  "typography.textZoom": 1.5,
});
store.set(resetModeAtom, {
  modeSetKey: typographySet.key,
  modeId: typographySet.defaultModeId,
});
assert.deepEqual(
  store.get(previewOverridesAtom),
  { "color.hueShift": 20 },
  "Mode selection leaves ownerless adaptive inputs unchanged.",
);

for (const mode of [dark, wireframe]) {
  const options = {
    modeSets: original.modeSets,
    applyPolarity: false,
    applyMultiplier: false,
  };
  const modal = resolveColorDocument(
    original.colorSystem,
    [mode],
    undefined,
    options,
  );
  const expected = applyScaleAdjustment(modal, {
    method: "relative",
    hue: 30,
    chroma: 70,
  });
  const adaptive = resolveColorDocument(
    original.colorSystem,
    [mode],
    { "color.hueShift": 30, "color.saturation": 70 },
    options,
  );
  assert.deepEqual(
    adaptive,
    expected,
    "Adaptive relative color composes after modal adjustment, including Absolute.",
  );
  assert.deepEqual(
    resolveColorDocument(
      original.colorSystem,
      [mode],
      { "color.hueShift": 0, "color.saturation": 100 },
      options,
    ),
    modal,
  );
}
store.set(restoreAuthoringSnapshotAtom, original);
toggle("adaptive", false);
const changed = store.get(authoringSourceSnapshotAtom);
const comparison = compareAuthoring(original, changed);
const fields = comparison.groups
  .flatMap((group) => group.items)
  .flatMap((item) => item.fields);
assert.equal(fields.length, 1);
assert.deepEqual(fields[0].address?.path, [
  "foundationParameterSettings",
  id,
  "adaptive",
]);
assert.equal(comparison.slots.filter((slot) => slot.changed).length, 1);
const impact = foundationSettingsParameters(
  changed.foundationParameterSettings!,
);
assert.equal(impact.length, FOUNDATION_SETTING_IDS.length * 2);
assert.equal(impact.filter((slot) => slot.edited).length, 1);
assert.equal(impact.find((slot) => slot.edited)!.category, "color");
assert.equal(
  store
    .get(legacyChangeGroupsAtom)
    .flatMap((group) => group.items)
    .flatMap((item) => item.fields)
    .filter((field) => field.address?.path[0] === "foundationParameterSettings")
    .length,
  1,
);
const reset = prepareChangeReset(
  { ...changed, attachments: {} },
  sourceResetPlan("Restore adaptive availability", [fields[0].address!]),
);
assert.deepEqual(
  reset.foundationParameterSettings,
  original.foundationParameterSettings,
);
assert.deepEqual(reset.modeSets, changed.modeSets);

for (const parameterId of FOUNDATION_SETTING_IDS) {
  for (const kind of ["modal", "adaptive"] as const) {
    if (kind === "adaptive" && !ADAPTIVE_SETTING_IDS.includes(parameterId))
      continue;
    const mutation = structuredClone(original);
    mutation.foundationParameterSettings![parameterId][kind] =
      !mutation.foundationParameterSettings![parameterId][kind];
    const difference = compareAuthoring(original, mutation);
    const addresses = difference.groups
      .flatMap((group) => group.items)
      .flatMap((item) => item.fields)
      .map((field) => field.address!);
    assert.equal(
      addresses.length,
      1,
      `${parameterId}/${kind} has one authored field.`,
    );
    const narrow = prepareChangeReset(
      { ...mutation, attachments: {} },
      sourceResetPlan("Restore parameter availability", addresses),
    );
    assert.deepEqual(
      narrow.foundationParameterSettings,
      original.foundationParameterSettings,
    );
  }
}
store.set(restoreAuthoringSnapshotAtom, original);
toggle("modal", false);
const unavailable = store.get(authoringSourceSnapshotAtom);
assert.throws(
  () => assertStoredSnapshot({ ...unavailable, modeSets: original.modeSets }),
  /Modal setting/,
  "Scoped resets cannot restore mode support while the foundation disallows it.",
);
const beforeInvalid = store.get(authoringSourceSnapshotAtom);
assert.throws(
  () =>
    store.set(updateFoundationParameterSettingAtom, {
      id: "elevation.depth",
      kind: "adaptive",
      value: true,
    }),
  /invalid/,
);
assert.deepEqual(store.get(authoringSourceSnapshotAtom), beforeInvalid);

const previousWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
const storage = new Map<string, string>();
const events = new EventTarget();
Object.defineProperty(globalThis, "window", {
  configurable: true,
  value: {
    localStorage: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
    },
    addEventListener: events.addEventListener.bind(events),
    removeEventListener: events.removeEventListener.bind(events),
  },
});
try {
  storage.set(
    AUTHORING_STORAGE_KEY,
    JSON.stringify({
      version: 22,
      working: legacyWorking,
      saved: legacySaved,
      isEditing: true,
      attachments: {},
      savedAttachments: {},
    }),
  );
  const record = readAuthoringRecord(assertStoredSnapshot, (value) => value)!;
  assert.equal(record.version, AUTHORING_RECORD_VERSION);
  assert.equal(record.working.foundationParameterSettings![id].adaptive, true);
  assert.equal(record.saved.foundationParameterSettings![id].adaptive, false);
  const persisted = createStore();
  const dispose = initializeAuthoringPersistence(persisted, {
    validateScheduled: null,
  });
  assert.deepEqual(persisted.get(persistenceIssuesAtom), []);
  persisted.set(updateFoundationParameterSettingAtom, {
    id,
    kind: "modal",
    value: false,
  });
  assert.ok(persisted.get(rememberedModeSettingsAtom)[id]?.length);
  flushPersistedState();
  const stored = readAuthoringRecord(assertStoredSnapshot)!;
  assert.ok(
    stored.working.modeSets.every((set) =>
      set.modes.every(
        (mode) => mode.foundations.color?.backgroundLightness === undefined,
      ),
    ),
  );
  assert.deepEqual(stored.saved.modeSets, legacySaved.modeSets);
  dispose();
  const reloaded = createStore();
  const stop = initializeAuthoringPersistence(reloaded, {
    validateScheduled: null,
  });
  assert.deepEqual(reloaded.get(rememberedModeSettingsAtom), {});
  reloaded.set(updateFoundationParameterSettingAtom, {
    id,
    kind: "modal",
    value: true,
  });
  assert.ok(
    reloaded
      .get(modeSetsAtom)
      .every((set) =>
        set.modes.every(
          (mode) => mode.foundations.color?.backgroundLightness === undefined,
        ),
      ),
    "Reload cannot resurrect discarded temporary values.",
  );
  reloaded.set(cancelEditAtom);
  assert.deepEqual(reloaded.get(modeSetsAtom), original.modeSets);
  assert.equal(
    reloaded.get(foundationParameterSettingsAtom)[id].adaptive,
    false,
  );
  stop();
} finally {
  if (previousWindow)
    Object.defineProperty(globalThis, "window", previousWindow);
  else Reflect.deleteProperty(globalThis, "window");
}
console.log(
  "Foundation settings: availability, independent adaptation, transient restoration, save/cancel, ownership, portable data and accounting pass.",
);
