// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { createStore } from "jotai";
import {
  assertStoredSnapshot,
  createDefaultSnapshot,
  enterEditModeAtom,
  saveEditAtom,
  cancelEditAtom,
  authoringSourceSnapshotAtom,
} from "../src/features/edit-session/state";
import { upgradeScaleAdjustmentSnapshot } from "../src/features/edit-session/scaleAdjustmentUpgrade";
import { initializeAuthoringPersistence } from "../src/features/edit-session/persistence";
import {
  AUTHORING_STORAGE_KEY,
  AUTHORING_RECORD_VERSION,
  readAuthoringRecord,
} from "../src/features/edit-session/storage";
import { DEFAULT_ABSOLUTE_COLOR } from "../src/features/color-system/scaleAdjustment";
import {
  updateModeScaleAdjustmentAtom,
  colorSchemeDocumentsAtom,
} from "../src/features/color-system/state";
import { modeSetsAtom } from "../src/features/modes/state";
import { modeSelectionAtom } from "../src/features/modes/selection";
import { persistenceIssuesAtom } from "../src/state/persist";
import { compareAuthoring } from "../src/features/changelog/registry";
import { comparePrimitiveTokens } from "../src/features/changelog/tokenComparison";
import { modeFoundationParameters } from "../src/features/impact/sources/modeFoundation";
import { componentImpactForSnapshots } from "../src/features/impact/componentImpact";
import { componentTokenCatalog } from "../src/features/components/references";
import { browserSourcesForSnapshot } from "../src/features/tokens/browserSavedState";
import {
  prepareChangeReset,
  sourceResetPlan,
} from "../src/features/changelog/resetPlans";
import { buildColorLibrary } from "../src/features/color-system/cssLibrary";
import { buildScaleData } from "../src/features/color-system/scaleGeneration";
import { flushPersistedState } from "../src/state/persist";

const original = createDefaultSnapshot();
const scheme = original.modeSets.find((set) => set.key === "colorScheme")!;
const wireframe = scheme.modes.find((mode) => mode.key === "wireframe")!;
const adjustmentOf = (snapshot: typeof original) =>
  snapshot.modeSets
    .find((set) => set.id === scheme.id)!
    .modes.find((mode) => mode.id === wireframe.id)!.foundations.color!
    .scaleAdjustment;
const legacy = (adjustment: unknown) => ({
  ...original,
  modeSets: original.modeSets.map((set) => ({
    ...set,
    modes: set.modes.map((mode) =>
      mode.id === wireframe.id
        ? {
            ...mode,
            foundations: {
              ...mode.foundations,
              color: { scaleAdjustment: adjustment },
            },
          }
        : mode,
    ),
  })),
});
for (const old of [
  { hue: { method: "absolute", value: 10 } },
  { chroma: { method: "absolute", value: 0 } },
  {
    hue: { method: "relative", value: 20 },
    chroma: { method: "absolute", value: 10 },
  },
]) {
  const input = legacy(old);
  const before = structuredClone(input);
  const next = upgradeScaleAdjustmentSnapshot(input);
  assertStoredSnapshot(next);
  assert.deepEqual(adjustmentOf(next), {
    method: "absolute",
    color: DEFAULT_ABSOLUTE_COLOR,
  });
  assert.deepEqual(next.colorSystem, original.colorSystem);
  assert.deepEqual(input, before);
}
const relative = upgradeScaleAdjustmentSnapshot(
  legacy({
    hue: { method: "relative", value: -20 },
    chroma: { method: "relative", value: 0 },
  }),
);
assertStoredSnapshot(relative);
assert.deepEqual(adjustmentOf(relative), {
  method: "relative",
  hue: -20,
  chroma: 0,
});
const neutral = upgradeScaleAdjustmentSnapshot(legacy({}));
assertStoredSnapshot(neutral);
assert.equal(adjustmentOf(neutral), undefined);
assert.deepEqual(upgradeScaleAdjustmentSnapshot(original), original);
assert.throws(
  () =>
    assertStoredSnapshot(
      upgradeScaleAdjustmentSnapshot(
        legacy({
          hue: { method: "absolute", value: NaN },
        }),
      ),
    ),
  /invalid|Invalid/,
);

const changed = structuredClone(original);
const target = adjustmentOf(changed)!;
assert(target.method === "absolute");
target.color.hue += 30;
changed.platforms[0].name = "Keep this unrelated edit";
const comparison = compareAuthoring(original, changed);
const fields = comparison.groups
  .flatMap((group) => group.items)
  .flatMap((item) => item.fields);
const field = fields.find((field) =>
  field.address?.path.includes("scaleAdjustment"),
);
assert(field?.address);
assert.equal(
  fields.filter((field) => field.address?.path.includes("scaleAdjustment"))
    .length,
  1,
);
const reset = prepareChangeReset(
  { ...changed, attachments: {} },
  sourceResetPlan("Shared color hue", [field.address]),
);
assert.deepEqual(adjustmentOf(reset), adjustmentOf(original));
assert.equal(reset.platforms[0].name, changed.platforms[0].name);
const slots = modeFoundationParameters(changed.modeSets);
assert.equal(slots.filter((slot) => slot.edited).length, 1);
assert.equal(slots.length, modeFoundationParameters(original.modeSets).length);
const impact = comparePrimitiveTokens(original, changed, comparison);
assert.ok(
  impact.records.some(
    (record) =>
      record.category === "color" &&
      record.modeValues.some((value) => value.changed),
  ),
);
const sources = browserSourcesForSnapshot(original, [wireframe]);
const source = sources.filter(
  (item) =>
    item.type === "colors" &&
    item.groupId === original.colorSystem.scales[2].id,
)[7];
const reference = componentTokenCatalog(original).find(
  (token) =>
    token.browserId === source.id && token.context.colorScheme === "wireframe",
)!;
assert.ok(reference);
const component = original.components!.components.find(
  (item) => item.assignments.length,
)!;
assert.ok(component);
const assignment = component.assignments[0];
const componentBase = structuredClone(original);
componentBase.components = {
  schemaVersion: 2,
  components: [
    {
      ...component,
      assignments: [
        {
          id: crypto.randomUUID(),
          property: assignment.property,
          $ref: reference.id,
          options: Object.fromEntries(
            Object.entries(reference.context).map(([key, value]) => [
              key,
              String(value),
            ]),
          ),
        },
        {
          id: crypto.randomUUID(),
          property: assignment.property,
          $ref: reference.id,
          options: Object.fromEntries(
            Object.entries(reference.context).map(([key, value]) => [
              key,
              String(value),
            ]),
          ),
        },
        {
          id: crypto.randomUUID(),
          property: assignment.property,
          value: "#000000",
        },
      ],
    },
  ],
};
const componentChanged = {
  ...changed,
  components: structuredClone(componentBase.components),
};
const componentImpact = componentImpactForSnapshots(
  componentBase,
  componentChanged,
);
assert.equal(
  componentImpact.status,
  "ready",
  componentImpact.status === "unavailable" ? componentImpact.error : undefined,
);
if (componentImpact.status === "ready")
  assert.deepEqual(
    [
      componentImpact.summary.affected.count,
      componentImpact.summary.affected.total,
    ],
    [2, 3],
  );

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
      version: 21,
      working: legacy({ hue: { method: "absolute", value: 15 } }),
      saved: legacy({ hue: { method: "relative", value: 20 } }),
      isEditing: true,
      attachments: {},
      savedAttachments: {},
    }),
  );
  const record = readAuthoringRecord(assertStoredSnapshot, (value) => value)!;
  assert.equal(record.version, AUTHORING_RECORD_VERSION);
  assert.deepEqual(adjustmentOf(record.working), {
    method: "absolute",
    color: DEFAULT_ABSOLUTE_COLOR,
  });
  assert.deepEqual(adjustmentOf(record.saved), { method: "relative", hue: 20 });
  const store = createStore();
  const dispose = initializeAuthoringPersistence(store, {
    validateScheduled: null,
  });
  assert.deepEqual(store.get(persistenceIssuesAtom), []);
  store.set(enterEditModeAtom);
  store.set(updateModeScaleAdjustmentAtom, {
    modeId: wireframe.id,
    adjustment: {
      method: "absolute",
      color: { ...DEFAULT_ABSOLUTE_COLOR, hue: 200 },
    },
  });
  store.set(saveEditAtom);
  assert.deepEqual(store.get(persistenceIssuesAtom), []);
  store.set(updateModeScaleAdjustmentAtom, {
    modeId: wireframe.id,
    adjustment: { method: "relative", hue: 40 },
  });
  store.set(cancelEditAtom);
  assert.equal(
    adjustmentOf(store.get(authoringSourceSnapshotAtom))!.method,
    "absolute",
  );
  assert.deepEqual(adjustmentOf(store.get(authoringSourceSnapshotAtom)), {
    method: "absolute",
    color: { ...DEFAULT_ABSOLUTE_COLOR, hue: 200 },
  });
  const beforeSelection = store.get(authoringSourceSnapshotAtom);
  store.set(modeSelectionAtom, { colorScheme: wireframe.id });
  assert.deepEqual(store.get(authoringSourceSnapshotAtom), beforeSelection);
  const documents = store.get(colorSchemeDocumentsAtom);
  const resolved = documents.find((item) => item.key === "wireframe")!.document;
  const standard = resolved.scales.filter((scale) => !scale.customContrasts);
  for (const scale of standard)
    assert.deepEqual(
      buildScaleData(scale, resolved.settings.colorOutput).anchors,
      buildScaleData(standard[0], resolved.settings.colorOutput).anchors,
    );
  const css = buildColorLibrary(
    resolved,
    [],
    [],
    original.taxonomy,
    original.rules,
  );
  assert.match(css, /color-scale-/);
  const declarations = [
    ...css.matchAll(
      /\.color-scale-([a-z-]+)\.color-contrast-800 \{\n([\s\S]*?)\n\}/g,
    ),
  ].filter(([, name]) => standard.some((scale) => scale.name === name));
  assert.equal(declarations.length, standard.length);
  const rampDeclaration = (declaration: string) =>
    declaration.replace(
      / {2}--[a-z-]+-color-800: var\(--color-system-tint\);$/,
      "",
    );
  for (const [, , declaration] of declarations)
    assert.equal(
      rampDeclaration(declaration),
      rampDeclaration(declarations[0][2]),
      "CSS uses the same resolved ramp for matching targets.",
    );
  flushPersistedState();
  dispose();
  const reload = createStore();
  const stop = initializeAuthoringPersistence(reload, {
    validateScheduled: null,
  });
  assert.deepEqual(reload.get(persistenceIssuesAtom), []);
  assert.deepEqual(adjustmentOf(reload.get(authoringSourceSnapshotAtom)), {
    method: "absolute",
    color: { ...DEFAULT_ABSOLUTE_COLOR, hue: 200 },
  });
  reload.set(updateModeScaleAdjustmentAtom, {
    modeId: wireframe.id,
    adjustment: { method: "relative", hue: 0, chroma: 100 },
  });
  assert.equal(
    reload
      .get(modeSetsAtom)
      .find((set) => set.id === scheme.id)!
      .modes.find((mode) => mode.id === wireframe.id)!.foundations.color
      ?.scaleAdjustment,
    undefined,
  );
  stop();
} finally {
  if (previousWindow)
    Object.defineProperty(globalThis, "window", previousWindow);
  else Reflect.deleteProperty(globalThis, "window");
}
console.log(
  "Scale adjustments: migration, independent baselines, Changes/reset, Foundation/Token/Component impact and Save/Cancel/reload pass.",
);
