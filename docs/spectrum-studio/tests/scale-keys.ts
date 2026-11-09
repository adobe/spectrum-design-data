// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createStore } from "jotai";
import { referenceRecords } from "../scripts/design-data-loader";
import { designSystemDefaults } from "../src/data/defaults";
import { componentTokenCatalog } from "../src/features/components/references";
import {
  compareDesignData,
  type AnalysisInput,
} from "../src/features/design-data/comparison";
import { defaultsAnalysisInput } from "../src/features/design-data/projection";
import {
  canonicalDesignSystemDataset,
  composeDesignSystemDefaults,
} from "../src/features/design-data/validation";
import { initializeAuthoringPersistence } from "../src/features/edit-session/persistence";
import {
  assertStoredSnapshot,
  authoringSourceSnapshotAtom,
  cancelEditAtom,
  createDefaultSnapshot,
  editSessionSnapshotAtom,
  enterEditModeAtom,
  saveEditAtom,
} from "../src/features/edit-session/state";
import {
  AUTHORING_RECORD_VERSION,
  AUTHORING_STORAGE_KEY,
  PREFERENCES_STORAGE_KEY,
  readAuthoringRecord,
} from "../src/features/edit-session/storage";
import {
  createMode,
  createModeSet,
  ensureModeSetKeys,
  migrateModeSets,
} from "../src/features/modes/model";
import {
  scaleIdentityContext,
  upgradeScaleKeys,
  upgradeScaleSelection,
} from "../src/features/modes/scaleKeys";
import { modeSelectionAtom } from "../src/features/modes/selection";
import { updateSizingParameterAtom } from "../src/features/modes/sizingState";
import { componentSizingDocumentAtom } from "../src/features/foundations/componentSizingState";
import {
  flushPersistedState,
  persistenceIssuesAtom,
} from "../src/state/persist";
import { modeCoverageRows } from "../src/views/analysis/colorOpacityPresentation";

const namedMode = { ...createMode(), name: "Desktop" };
const otherNamedMode = { ...createMode(), name: "Very large" };
const namedSet = ensureModeSetKeys({
  ...createModeSet(),
  name: "Scale",
  defaultModeId: namedMode.id,
  modes: [namedMode, otherNamedMode],
});
assert.equal(namedSet.key, "scale");
assert.deepEqual(
  namedSet.modes.map((mode) => mode.key),
  ["desktop", "very-large"],
  "Default and non-default modes derive keys from their names in the same way.",
);
assert.deepEqual(
  ensureModeSetKeys({
    ...namedSet,
    defaultModeId: otherNamedMode.id,
  }).modes.map((mode) => mode.key),
  ["desktop", "very-large"],
  "Changing which mode is the default never changes either key.",
);
assert.deepEqual(
  ensureModeSetKeys({
    ...namedSet,
    modes: [{ ...namedMode, key: "", name: "Very large" }, otherNamedMode],
  }).modes.map((mode) => mode.key),
  ["very-large", "very-large-2"],
  "Name collisions keep the existing unique-key convention for every mode.",
);

const current = createDefaultSnapshot();
const scale = current.modeSets.find((set) => set.key === "scale")!;
assert(scale);
const desktop = scale.modes.find((mode) => mode.key === "desktop")!;
const mobile = scale.modes.find((mode) => mode.key === "mobile")!;
const legacy = structuredClone(current);
const legacyScale = legacy.modeSets.find((set) => set.id === scale.id)!;
legacyScale.key = "platformScale";
legacyScale.modes.find((mode) => mode.id === desktop.id)!.key = "default";
const assignments = legacy.components!.components.flatMap(
  (component) => component.assignments,
);
const legacyTokens = componentTokenCatalog(legacy);
const mobileSize = legacyTokens.find(
  (token) =>
    token.property === "size" && token.context.platformScale === "mobile",
)!;
assert(mobileSize);
const sizeAssignment = legacy
  .components!.components.flatMap((component) => component.assignments)
  .find(
    (assignment) =>
      assignment.$ref &&
      legacyTokens.find((token) => token.id === assignment.$ref)?.property ===
        "size",
  )!;
assert(sizeAssignment?.$ref);
sizeAssignment.$ref = mobileSize.id;
sizeAssignment.options = { platformScale: "mobile" };
const [desktopCondition, mobileCondition] = assignments.filter(
  (assignment) => assignment !== sizeAssignment,
);
assert(desktopCondition && mobileCondition);
desktopCondition.options = { platformScale: "default" };
mobileCondition.options = { platformScale: "mobile", unrelated: "default" };
const before = structuredClone(legacy);
const upgraded = upgradeScaleKeys(legacy);
assertStoredSnapshot(upgraded);
assert.deepEqual(legacy, before, "Upgrading never mutates the source record.");
assert.deepEqual(upgradeScaleKeys(upgraded), upgraded);
assert.deepEqual(upgraded.modeSets, current.modeSets);
const desktopContext = { colorScheme: "dark", scale: "desktop" };
assert.deepEqual(scaleIdentityContext(desktopContext, upgraded.modeSets), {
  colorScheme: "dark",
  platformScale: "default",
});
assert.deepEqual(desktopContext, { colorScheme: "dark", scale: "desktop" });
assert.deepEqual(upgraded.structures, legacy.structures);
assert.deepEqual(upgraded.browserTokenEdits, legacy.browserTokenEdits);
assert(
  upgraded
    .components!.components.flatMap((component) => component.assignments)
    .some(
      (assignment) =>
        assignment.$ref === mobileSize.id &&
        assignment.options?.scale === "mobile",
    ),
  "Existing mobile component references keep the same target UUID.",
);
const upgradedAssignments = upgraded.components!.components.flatMap(
  (component) => component.assignments,
);
assert.deepEqual(
  upgradedAssignments.find(
    (assignment) => assignment.id === desktopCondition.id,
  )!.options,
  { scale: "desktop" },
);
assert.deepEqual(
  upgradedAssignments.find(
    (assignment) => assignment.id === mobileCondition.id,
  )!.options,
  { scale: "mobile", unrelated: "default" },
);
assert.deepEqual(migrateModeSets(legacy.modeSets, 11), current.modeSets);
const previousTokens = new Map(legacyTokens.map((token) => [token.id, token]));
const migratedTokens = componentTokenCatalog(upgraded);
assert.equal(migratedTokens.length, previousTokens.size);
for (const token of migratedTokens) {
  const previous = previousTokens.get(token.id);
  assert(
    previous,
    `${token.name} (${JSON.stringify(token.context)}) keeps its generated UUID.`,
  );
  assert.deepEqual(
    token.value,
    previous.value,
    `${token.name} keeps its value.`,
  );
}
const newDefault = structuredClone(legacy);
newDefault.modeSets.find((set) => set.id === scale.id)!.defaultModeId =
  mobile.id;
assert.equal(
  upgradeScaleKeys(newDefault).modeSets.find((set) => set.id === scale.id)!
    .defaultModeId,
  mobile.id,
  "The desktop key does not depend on which mode is the default.",
);
const custom = structuredClone(legacy);
custom.modeSets.find((set) => set.id === scale.id)!.id = "custom-scale";
assert.deepEqual(upgradeScaleKeys(custom), custom);
const renamed = structuredClone(legacy);
renamed.modeSets.find((set) => set.id === scale.id)!.key = "myScale";
assert.deepEqual(upgradeScaleKeys(renamed), renamed);
for (const conflict of ["set", "mode", "condition"] as const) {
  const source = structuredClone(legacy);
  if (conflict === "set")
    source.modeSets.push({ ...scale, id: "another-scale" });
  if (conflict === "mode")
    source.modeSets.find((set) => set.id === scale.id)!.modes[1].key =
      "desktop";
  if (conflict === "condition")
    source.components!.components[0].assignments[0].options!.scale = "mobile";
  const messages: string[] = [];
  assert.deepEqual(
    upgradeScaleKeys(source, (message) => messages.push(message)),
    source,
    "Conflicting keys are reported without overwriting authored data.",
  );
  assert.equal(messages.length, 1);
}
assert.deepEqual(
  upgradeScaleSelection(
    { platformScale: mobile.id, colorScheme: "mode-dark" },
    current.modeSets,
  ),
  { scale: mobile.id, colorScheme: "mode-dark" },
);
assert.deepEqual(
  upgradeScaleSelection(
    { platformScale: mobile.id, scale: desktop.id },
    current.modeSets,
  ),
  { scale: desktop.id },
  "An already-canonical selection takes precedence.",
);
assert.deepEqual(
  upgradeScaleSelection({ platformScale: "custom-mode" }, current.modeSets),
  { platformScale: "custom-mode" },
);
const native = canonicalDesignSystemDataset(designSystemDefaults);
native.system.modeSets = structuredClone(legacy.modeSets);
native.system.components = structuredClone(legacy.components!);
const imported = composeDesignSystemDefaults(native, current.scaleTypes!);
assert.deepEqual(imported.system.modeSets, current.modeSets);
assert.deepEqual(
  imported.system.components,
  upgraded.components,
  "Native imports share the key and component-condition upgrade.",
);

const app = defaultsAnalysisInput();
assert.deepEqual(app.errors, []);
const reference: AnalysisInput = {
  source: { ...app.source, kind: "reference" as const },
  records: referenceRecords(
    "mode-sets/scale.json",
    JSON.parse(
      readFileSync(
        new URL(
          "../../../packages/design-data/mode-sets/scale.json",
          import.meta.url,
        ),
        "utf8",
      ),
    ),
  ),
  categories: ["mode-sets"],
  errors: [],
  limitations: [],
  schemas: [],
  inventoryStatus: "complete",
};
const report = compareDesignData(app, reference);
const coverage = report.modeCoverage!;
const scaleCoverage = coverage.sets.find(
  (set) => set.reference?.key === "scale",
)!;
assert.equal(scaleCoverage.result, "pass", JSON.stringify(scaleCoverage));
assert.equal(scaleCoverage.confidence, "canonical-key");
assert.equal(scaleCoverage.app?.default, "desktop");
assert.deepEqual(
  scaleCoverage.modes.map(({ reference, app, result }) => ({
    reference,
    app,
    result,
  })),
  [
    { reference: "desktop", app: "desktop", result: "pass" },
    { reference: "mobile", app: "mobile", result: "pass" },
  ],
  "Real shipped data passes canonical reference mode coverage without a mapping.",
);
assert.deepEqual(
  modeCoverageRows(coverage).map(({ label, mode, result }) => ({
    label,
    mode,
    result,
  })),
  [
    { label: "Scale", mode: "Desktop", result: "pass" },
    { label: "Scale", mode: "Mobile", result: "pass" },
  ],
  "Migration analysis renders the actual passing modes, not Entire mode set.",
);

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
const working = structuredClone(legacy);
working.componentSizing!.componentSize = 1.1;
working.modeSets.find((set) => set.id === scale.id)!.modes[1].foundations.size =
  {
    componentSize: 1.3,
  };
data.set(
  AUTHORING_STORAGE_KEY,
  JSON.stringify({
    version: 26,
    working,
    saved: legacy,
    isEditing: true,
    attachments: {},
    savedAttachments: {},
  }),
);
data.set(
  PREFERENCES_STORAGE_KEY,
  JSON.stringify({
    version: 1,
    appearance: "light",
    modeSelection: { platformScale: mobile.id },
  }),
);
const store = createStore();
const stop = initializeAuthoringPersistence(store);
assert.deepEqual(store.get(persistenceIssuesAtom), []);
assert.equal(store.get(componentSizingDocumentAtom).componentSize, 1.1);
assert.equal(
  store.get(editSessionSnapshotAtom)!.componentSizing!.componentSize,
  1,
);
assert.deepEqual(store.get(modeSelectionAtom), { scale: mobile.id });
const stored = readAuthoringRecord(assertStoredSnapshot);
assert(stored);
assert.equal(stored.version, AUTHORING_RECORD_VERSION);
assert.equal(
  stored.working.modeSets.find((set) => set.id === scale.id)!.key,
  "scale",
);
assert.equal(
  stored.saved.modeSets.find((set) => set.id === scale.id)!.key,
  "scale",
);
assert.equal(
  stored.working.modeSets.find((set) => set.id === scale.id)!.modes[1]
    .foundations.size!.componentSize,
  1.3,
);
assert.equal(
  stored.saved.modeSets.find((set) => set.id === scale.id)!.modes[1].foundations
    .size!.componentSize,
  1.25,
);
store.set(cancelEditAtom);
assert.equal(store.get(componentSizingDocumentAtom).componentSize, 1);
assert.equal(
  store
    .get(authoringSourceSnapshotAtom)
    .modeSets.find((set) => set.id === scale.id)!.key,
  "scale",
);
store.set(enterEditModeAtom);
store.set(modeSelectionAtom, { scale: desktop.id });
store.set(updateSizingParameterAtom, {
  parameterId: "size.componentSize",
  value: 1.2,
});
store.set(saveEditAtom);
flushPersistedState();
stop();
const reloaded = createStore();
const stopReload = initializeAuthoringPersistence(reloaded);
assert.deepEqual(reloaded.get(persistenceIssuesAtom), []);
assert.equal(reloaded.get(componentSizingDocumentAtom).componentSize, 1.2);
assert.deepEqual(reloaded.get(modeSelectionAtom), { scale: desktop.id });
assert.deepEqual(
  reloaded.get(authoringSourceSnapshotAtom).modeSets,
  current.modeSets,
);
stopReload();
Reflect.deleteProperty(globalThis, "window");
console.log(
  "Scale keys preserve identities, saved edits and selections, and pass real reference mode coverage.",
);
