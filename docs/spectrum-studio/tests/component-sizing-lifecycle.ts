// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createStore } from "jotai";
import {
  createDefaultSnapshot,
  assertStoredSnapshot,
  authoringSourceSnapshotAtom,
  enterEditModeAtom,
  cancelEditAtom,
  saveEditAtom,
  editSessionSnapshotAtom,
  resetAllAuthoringAtom,
} from "../src/features/edit-session/state";
import {
  upgradeComponentSizingSnapshot,
  upgradeSizingFields,
} from "../src/features/edit-session/componentSizingUpgrade";
import { upgradeNativeSizingFields } from "../src/features/foundations/componentSizing";
import { synchronizeVariantIdentities } from "../src/features/structures/semanticIdentity";
import {
  AUTHORING_STORAGE_KEY,
  AUTHORING_RECORD_VERSION,
  readAuthoringRecord,
} from "../src/features/edit-session/storage";
import { initializeAuthoringPersistence } from "../src/features/edit-session/persistence";
import {
  persistenceIssuesAtom,
  flushPersistedState,
} from "../src/state/persist";
import { updateSizingParameterAtom } from "../src/features/modes/sizingState";
import { createModeSet } from "../src/features/modes/model";
import { foundationRemovalIssue } from "../src/features/modes/foundationAttachments";
import { responsibleParameterIds } from "../src/features/modes/parameters";
import { modeSelectionAtom } from "../src/features/modes/selection";
import { componentSizingDocumentAtom } from "../src/features/foundations/componentSizingState";
import { typographyDocumentAtom } from "../src/features/typography/state";
import { compareAuthoring } from "../src/features/changelog/registry";
import { comparePrimitiveTokens } from "../src/features/changelog/tokenComparison";
import {
  prepareChangeReset,
  sourceResetPlan,
} from "../src/features/changelog/resetPlans";
import { FOUNDATION_IMPACT_SOURCES } from "../src/features/impact/sources";
import { componentImpactForSnapshots } from "../src/features/impact/componentImpact";
import { componentTokenCatalog } from "../src/features/components/references";
import { browserTokenImpactRecordsAtom } from "../src/features/tokens/browserSavedState";
import { tokenModeSetIds } from "../src/features/tokens/browserModel";
import {
  canonicalDesignSystemDataset,
  composeDesignSystemDefaults,
} from "../src/features/design-data/validation";
import { designSystemDefaults } from "../src/data/defaults";
import { createLegacyIdentitySnapshot } from "./fixtures/legacyIdentity";

execFileSync(
  process.execPath,
  [
    "--import",
    "tsx",
    "--input-type",
    "module",
    "-e",
    'await import("./src/features/edit-session/storage.ts"); await import("./src/features/edit-session/state.ts");',
  ],
  { cwd: fileURLToPath(new URL("..", import.meta.url)), stdio: "pipe" },
);

const baseline = createDefaultSnapshot();
const legacyIdentity = createLegacyIdentitySnapshot();
const scaleSet = baseline.modeSets.find((set) => set.key === "scale")!;
assert.deepEqual(responsibleParameterIds(baseline.modeSets, scaleSet.id), [
  "size.componentSize",
  "typography.textSize",
]);
for (const foundation of ["size", "typography"] as const) {
  assert.equal(
    foundationRemovalIssue(scaleSet, foundation),
    "Remove this foundation's mode overrides before removing the mode set.",
  );
  assert.equal(
    foundationRemovalIssue(
      {
        ...scaleSet,
        modes: scaleSet.modes.filter(
          (mode) => mode.id === scaleSet.defaultModeId,
        ),
      },
      foundation,
    ),
    null,
  );
}
const legacyModes = baseline.modeSets.map((set) =>
  set.id !== scaleSet.id
    ? set
    : {
        ...set,
        key: "platformScale",
        name: "Platform scale",
        authoringCapabilities: [],
        modes: [{ ...set.modes[0], key: "default", name: "Default" }],
      },
);
const legacyType: Record<string, unknown> = {
  ...baseline.typography,
  schemaVersion: 8,
  componentSize: "s",
};
delete legacyType.textSize;
const legacySettings = { ...baseline.foundationParameterSettings };
delete legacySettings["size.componentSize"];
delete legacySettings["typography.textSize"];
const legacy: Record<string, unknown> = {
  ...baseline,
  components: legacyIdentity.components,
  browserTokenEdits: legacyIdentity.browserTokenEdits,
  typography: legacyType,
  modeSets: legacyModes,
  structures: synchronizeVariantIdentities(baseline.structures!, legacyModes),
  foundationParameterSettings: legacySettings,
};
delete legacy.componentSizing;
const previous = structuredClone(legacy);
const identities = new Map<string, string>();
const upgraded = upgradeComponentSizingSnapshot(legacy, identities);
assertStoredSnapshot(upgraded);
assert.deepEqual(legacy, previous);
assert.deepEqual(upgradeComponentSizingSnapshot(upgraded), upgraded);
assert.deepEqual(upgradeComponentSizingSnapshot(legacy, identities), upgraded);
assert.equal(upgraded.componentSizing!.componentSize, 1);
assert.equal(upgraded.typography.textSize, 1);
assert.equal(
  upgraded.modeSets.find((set) => set.id === scaleSet.id)!.modes[1].foundations
    .typography!.textSize,
  17 / 14,
);
assert.deepEqual(upgraded.typography, {
  ...legacyType,
  schemaVersion: 9,
  textSize: 1,
});
assert.deepEqual(upgraded.browserTokenEdits, legacy.browserTokenEdits);
assert.throws(
  () =>
    assertStoredSnapshot(
      upgradeSizingFields({ ...legacy, componentSizing: null }),
    ),
  /invalid/i,
);
const missing = {
  ...legacy,
  modeSets: legacyModes.filter((set) => set.id !== scaleSet.id),
};
const deleted = upgradeComponentSizingSnapshot(missing);
assertStoredSnapshot(deleted);
assert(!deleted.modeSets.some((set) => set.id === scaleSet.id));
const issues: string[] = [];
const customized = structuredClone(legacy);
customized.modeSets = legacyModes.map((set) =>
  set.id !== scaleSet.id
    ? set
    : {
        ...set,
        modes: [...set.modes, { ...scaleSet.modes[1], foundations: {} }],
      },
);
const customUpgrade = upgradeComponentSizingSnapshot(
  customized,
  new Map(),
  (message) => issues.push(message),
);
assertStoredSnapshot(customUpgrade);
assert.deepEqual(customUpgrade.modeSets, customized.modeSets);
assert.equal(issues.length, 1);
const renamed = {
  ...legacy,
  modeSets: legacyModes.map((set) =>
    set.id !== scaleSet.id
      ? set
      : {
          ...set,
          name: "Keep my Scale label",
          modes: [{ ...set.modes[0], name: "Keep my desktop label" }],
        },
  ),
};
const renamedUpgrade = upgradeComponentSizingSnapshot(renamed);
assertStoredSnapshot(renamedUpgrade);
assert.equal(
  renamedUpgrade.modeSets.find((set) => set.id === scaleSet.id)!.name,
  "Keep my Scale label",
);
assert.equal(
  renamedUpgrade.modeSets.find((set) => set.id === scaleSet.id)!.modes[0].name,
  "Keep my desktop label",
);
const customOwner = createModeSet();
customOwner.key = "customSize";
customOwner.authoringCapabilities = ["size.componentSize"];
const conflicting = {
  ...legacy,
  modeSets: [...legacyModes, customOwner],
};
const conflictIssues: string[] = [];
const conflictUpgrade = upgradeComponentSizingSnapshot(
  conflicting,
  new Map(),
  (message) => conflictIssues.push(message),
);
assert(
  conflictUpgrade &&
    typeof conflictUpgrade === "object" &&
    "modeSets" in conflictUpgrade,
);
assert.deepEqual(conflictUpgrade.modeSets, conflicting.modeSets);
assert.equal(conflictIssues.length, 1);
const native = canonicalDesignSystemDataset(designSystemDefaults);
const oldNative = {
  ...native,
  system: {
    ...native.system,
    foundations: { ...native.system.foundations, typography: legacyType },
  },
};
Reflect.deleteProperty(oldNative.system, "componentSizing");
const nativeBefore = structuredClone(oldNative);
const restoredNative = composeDesignSystemDefaults(
  oldNative,
  baseline.scaleTypes!,
);
assert.equal(restoredNative.system.foundations.typography.textSize, 1);
assert.equal(restoredNative.system.componentSizing!.componentSize, 1);
assert.deepEqual(oldNative, nativeBefore);
assert.equal(
  (
    upgradeNativeSizingFields({
      ...oldNative.system,
      componentSizing: null,
    }) as Record<string, unknown>
  ).componentSizing,
  null,
);

const store = createStore();
assert.throws(
  () =>
    store.set(updateSizingParameterAtom, {
      parameterId: "size.componentSize",
      value: 1.1,
    }),
  /edit mode/,
);
store.set(enterEditModeAtom);
store.set(updateSizingParameterAtom, {
  parameterId: "size.componentSize",
  value: 1.1,
});
assert.equal(store.get(componentSizingDocumentAtom).componentSize, 1.1);
let working = store.get(authoringSourceSnapshotAtom);
const comparison = compareAuthoring(baseline, working);
const fields = comparison.groups
  .flatMap((group) => group.items)
  .flatMap((item) => item.fields);
const field = fields.find((field) =>
  field.address?.path.includes("componentSizing"),
)!;
assert(field?.address);
const reset = prepareChangeReset(
  { ...working, attachments: {} },
  sourceResetPlan("Component size", [field.address]),
);
assert.equal(reset.componentSizing!.componentSize, 1);
const authored = FOUNDATION_IMPACT_SOURCES.find(
  (source) => source.id === "component-sizing",
)!;
assert.deepEqual(store.get(authored.recordsAtom), [
  {
    id: "componentSizing/componentSize",
    category: "size",
    edited: true,
  },
]);
const impact = comparePrimitiveTokens(baseline, working, comparison);
assert.equal(comparison.slots.filter((slot) => slot.changed).length, 1);
for (const [category, tokens, values, changed] of [
  ["size", 19, 38, 13],
  ["radius", 11, 22, 10],
  ["spacing", 23, 28, 5],
] as const) {
  const records = impact.records.filter(
    (record) => record.category === category,
  );
  assert.equal(records.length, tokens);
  assert.equal(records.flatMap((record) => record.modeValues).length, values);
  assert.equal(
    records
      .flatMap((record) => record.modeValues)
      .filter((value) => value.changed).length,
    changed,
  );
}
assert(
  impact.records.some(
    (record) =>
      record.category === "size" &&
      record.modeValues.some((value) => value.changed),
  ),
);
assert(
  impact.records.some(
    (record) =>
      record.category === "radius" &&
      record.modeValues.some((value) => value.changed),
  ),
);
assert(
  !impact.records.some(
    (record) =>
      ["typography", "color", "opacity"].includes(record.category) &&
      record.modeValues.some((value) => value.changed),
  ),
);
const componentImpact = componentImpactForSnapshots(baseline, working);
assert.equal(componentImpact.status, "ready");
assert(
  componentImpact.status === "ready" &&
    componentImpact.summary.affected.count > 0,
);
if (componentImpact.status === "ready") {
  assert.equal(componentImpact.summary.affected.count, 13);
  assert.equal(componentImpact.summary.affected.total, 27);
}
const componentSpacingIds = new Set(
  impact.records
    .filter(
      (record) =>
        record.category === "spacing" &&
        record.modeValues.some((value) => value.changed),
    )
    .map((record) => record.tokenId),
);
for (const record of store.get(browserTokenImpactRecordsAtom))
  if (
    ["spacing", "color", "opacity", "elevation"].includes(record.category) &&
    !componentSpacingIds.has(record.tokenId)
  )
    for (const value of record.modeValues)
      assert(
        !tokenModeSetIds(
          value.valueId.slice(record.tokenId.length + 1),
        ).includes(scaleSet.id),
        "Scale must not multiply unrelated Impact inventories.",
      );
store.set(cancelEditAtom);
assert.equal(store.get(componentSizingDocumentAtom).componentSize, 1);
store.set(enterEditModeAtom);
store.set(updateSizingParameterAtom, {
  parameterId: "typography.textSize",
  value: 1.05,
});
assert.equal(store.get(typographyDocumentAtom).textSize, 1.05);
store.set(cancelEditAtom);
assert.equal(store.get(typographyDocumentAtom).textSize, 1);
store.set(enterEditModeAtom);
const beforeSelection = store.get(authoringSourceSnapshotAtom);
store.set(modeSelectionAtom, { [scaleSet.key]: scaleSet.modes[1].id });
assert.deepEqual(store.get(authoringSourceSnapshotAtom), beforeSelection);
store.set(updateSizingParameterAtom, {
  parameterId: "size.componentSize",
  value: 1.3,
});
working = store.get(authoringSourceSnapshotAtom);
assert.equal(working.componentSizing!.componentSize, 1);
assert.equal(
  working.modeSets.find((set) => set.id === scaleSet.id)!.modes[1].foundations
    .size!.componentSize,
  1.3,
);
const modalBaseline = structuredClone(baseline);
const catalog = componentTokenCatalog(modalBaseline);
const mobileSize = catalog.find(
  (token) =>
    token.kind === "primitive" &&
    token.property === "size" &&
    token.context.scale === "mobile" &&
    token.name === "size-50",
);
assert(mobileSize);
assert.equal(mobileSize.value, "16px");
const assignedSize = modalBaseline
  .components!.components.flatMap((component) => component.assignments)
  .find(
    (assignment) =>
      assignment.$ref &&
      catalog.find((token) => token.id === assignment.$ref)?.property ===
        "size",
  );
assert(assignedSize?.$ref);
assignedSize.$ref = mobileSize.id;
assignedSize.options = { ...assignedSize.options, scale: "mobile" };
assertStoredSnapshot(modalBaseline);
const modalWorking = structuredClone(modalBaseline);
modalWorking.modeSets.find(
  (set) => set.id === scaleSet.id,
)!.modes[1].foundations.size!.componentSize = 1.3;
const modalComparison = compareAuthoring(modalBaseline, modalWorking);
assert.equal(modalComparison.slots.filter((slot) => slot.changed).length, 1);
const modalImpact = comparePrimitiveTokens(
  modalBaseline,
  modalWorking,
  modalComparison,
);
assert.equal(modalImpact.records.length, impact.records.length);
for (const [category, tokens, values, changed] of [
  ["size", 19, 38, 6],
  ["radius", 11, 22, 5],
  ["spacing", 23, 28, 4],
] as const) {
  const records = modalImpact.records.filter(
    (record) => record.category === category,
  );
  assert.equal(records.length, tokens);
  assert.equal(records.flatMap((record) => record.modeValues).length, values);
  assert.equal(
    records
      .flatMap((record) => record.modeValues)
      .filter((value) => value.changed).length,
    changed,
  );
  assert(
    records.every((record) =>
      record.modeValues.every(
        (value) =>
          !value.changed || value.valueId.includes(scaleSet.modes[1].id),
      ),
    ),
    "Editing mobile must not affect desktop values.",
  );
}
assert(
  !modalImpact.records.some(
    (record) =>
      ["typography", "color", "opacity"].includes(record.category) &&
      record.modeValues.some((value) => value.changed),
  ),
);
const modalComponents = componentImpactForSnapshots(
  modalBaseline,
  modalWorking,
);
assert.equal(modalComponents.status, "ready");
if (modalComponents.status === "ready") {
  assert.equal(modalComponents.summary.affected.count, 1);
  assert.equal(modalComponents.summary.affected.total, 27);
}
assert.throws(
  () =>
    store.set(updateSizingParameterAtom, {
      parameterId: "size.componentSize",
      value: 0,
    }),
  /greater than zero/,
);
store.set(cancelEditAtom);

const data = new Map<string, string>();
Object.defineProperty(globalThis, "window", {
  configurable: true,
  value: {
    localStorage: {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => data.set(key, value),
      removeItem: (key: string) => data.delete(key),
    },
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  },
});
const legacyWorking = structuredClone(legacy);
legacyWorking.typography = { ...legacyType, textZoom: 1 };
data.set(
  AUTHORING_STORAGE_KEY,
  JSON.stringify({
    version: 25,
    working: legacyWorking,
    saved: legacy,
    isEditing: true,
    attachments: {},
    savedAttachments: {},
  }),
);
const record = readAuthoringRecord(assertStoredSnapshot, (value) => value);
assert(record);
assert.equal(record.working.typography.textZoom, 1);
assert.equal(record.saved.typography.textZoom, baseline.typography.textZoom);
assert.deepEqual(record.working.structures, record.saved.structures);
const persisted = createStore();
const stop = initializeAuthoringPersistence(persisted);
assert.deepEqual(persisted.get(persistenceIssuesAtom), []);
persisted.set(updateSizingParameterAtom, {
  parameterId: "size.componentSize",
  value: 1.1,
});
persisted.set(saveEditAtom);
assert.equal(
  persisted.get(editSessionSnapshotAtom)!.componentSizing!.componentSize,
  1.1,
);
flushPersistedState();
stop();
assert.equal(
  JSON.parse(data.get(AUTHORING_STORAGE_KEY)!).version,
  AUTHORING_RECORD_VERSION,
);
const reload = createStore();
const stopReload = initializeAuthoringPersistence(reload);
assert.equal(reload.get(componentSizingDocumentAtom).componentSize, 1.1);
assert.equal(
  reload
    .get(authoringSourceSnapshotAtom)
    .modeSets.find((set) => set.id === scaleSet.id)!.modes[1].foundations
    .typography!.textSize,
  17 / 14,
);
reload.set(resetAllAuthoringAtom);
assert.equal(reload.get(componentSizingDocumentAtom).componentSize, 1);
stopReload();
Reflect.deleteProperty(globalThis, "window");
console.log(
  "Component sizing lifecycle: lossless upgrade, native import, Changes/reset, real Impact, default/modal editing, Cancel, Save and reload passed.",
);
