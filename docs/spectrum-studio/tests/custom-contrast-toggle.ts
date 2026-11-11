// Copyright 2026 Adobe. All rights reserved.
import { decodeAuthoringStorage } from "../src/features/edit-session/authoringStorageCodec";
import assert from "node:assert/strict";
import { createStore } from "jotai";
import {
  assertStoredSnapshot,
  captureSnapshot,
  createDefaultSnapshot,
  restoreAuthoringSnapshotAtom,
  editSessionSnapshotAtom,
  cancelEditAtom,
  saveEditAtom,
} from "../src/features/edit-session/state";
import { editModeAtom } from "../src/state/view/editMode";
import { colorSystemDocumentAtom } from "../src/features/color-system/state";
import { isColorSystemDocument } from "../src/features/color-system/model";
import { editCustomContrastsAtom } from "../src/features/color-system/customContrastState";
import {
  scaleContrasts,
  contrastStepIndex,
  customContrastNamesMissingFromShared,
} from "../src/features/color-system/contrastSteps";
import { resolveColorDocument } from "../src/features/color-system/resolution";
import { buildColorLibrary } from "../src/features/color-system/cssLibrary";
import { modeSetsAtom } from "../src/features/modes/state";
import { modeSelectionAtom } from "../src/features/modes/selection";
import { previewOverridesAtom } from "../src/features/modes/previewState";
import { compareAuthoring } from "../src/features/changelog/registry";
import {
  changeGroupsAtom,
  legacyChangeGroupsAtom,
  revertChangeItemAtom,
} from "../src/features/changelog/state";
import {
  applyChangeResetPlanAtom,
  itemResetPlan,
  prepareChangeReset,
  sourceResetPlan,
} from "../src/features/changelog/resetPlans";
import { colorFoundationParameters } from "../src/features/impact/sources/colorFoundation";
import { ruleConsumers } from "../src/features/logic/consumers";
import {
  canonicalDesignSystemDataset,
  composeDesignSystemDefaults,
} from "../src/features/design-data/validation";
import { designSystemDefaults } from "../src/data/defaults";
import { initializeAuthoringPersistence } from "../src/features/edit-session/persistence";
import {
  AUTHORING_STORAGE_KEY,
  AUTHORING_RECORD_VERSION,
} from "../src/features/edit-session/storage";
import { persistenceIssuesAtom } from "../src/state/persist";
import { flushPersistedState } from "../src/state/persist";
import { tokenIdentity } from "../src/features/tokens/canonicalIdentity";

const original = createDefaultSnapshot();
const guarded = createStore();
guarded.set(restoreAuthoringSnapshotAtom, original);
guarded.set(editModeAtom, true);
const referencedGray = original.colorSystem.scales.find(
  (scale) => scale.customContrasts,
)!;
assert.throws(
  () =>
    guarded.set(editCustomContrastsAtom, {
      kind: "disable",
      scaleId: referencedGray.id,
    }),
  /no longer published or available/,
  "Switching off must not silently break existing component references.",
);
assert.deepEqual(
  guarded
    .get(colorSystemDocumentAtom)
    .scales.find((scale) => scale.id === referencedGray.id)!.customContrasts,
  referencedGray.customContrasts,
);
original.components!.components = [];
const store = createStore();
store.set(restoreAuthoringSnapshotAtom, original);
store.set(editSessionSnapshotAtom, original);
store.set(editModeAtom, true);
const gray = original.colorSystem.scales.find(
  (scale) => scale.customContrasts,
)!;
const custom = structuredClone(gray.customContrasts!);
assert.deepEqual(
  customContrastNamesMissingFromShared(
    gray,
    original.colorSystem.contrasts,
    original.rules!,
  ),
  [`${gray.name}-25`, `${gray.name}-50`, `${gray.name}-75`],
);
assert.deepEqual(
  customContrastNamesMissingFromShared(
    { ...gray, customContrasts: undefined },
    original.colorSystem.contrasts,
    original.rules!,
  ),
  [],
);
const scale = () =>
  store
    .get(colorSystemDocumentAtom)
    .scales.find((scale) => scale.id === gray.id)!;
const toggle = (kind: "enable" | "disable", scaleId = gray.id) =>
  store.set(editCustomContrastsAtom, { kind, scaleId });
const owner = original.modeSets.find((axis) =>
  axis.authoringCapabilities?.includes("color.contrastMultiplier"),
)!;
const high = owner.modes.find((mode) => mode.id !== owner.defaultModeId)!;
const patches = { [gray.id]: { [custom.steps[3].id]: 5.5 } };
store.set(
  modeSetsAtom,
  original.modeSets.map((axis) =>
    axis.id !== owner.id
      ? axis
      : {
          ...axis,
          modes: axis.modes.map((mode) =>
            mode.id !== high.id
              ? mode
              : {
                  ...mode,
                  foundations: {
                    ...mode.foundations,
                    color: {
                      ...mode.foundations.color,
                      scaleContrasts: patches,
                    },
                  },
                },
          ),
        },
  ),
);
store.set(modeSelectionAtom, { [owner.key]: high.id });
toggle("disable");
assert.equal(scale().customContrasts, undefined);
assert.deepEqual(scale().disabledCustomContrasts, custom);
assert.deepEqual(
  store
    .get(modeSetsAtom)
    .find((axis) => axis.id === owner.id)!
    .modes.find((mode) => mode.id === high.id)!.foundations.color!
    .scaleContrasts,
  patches,
);
const disabled = structuredClone(captureSnapshot(store.get));
assertStoredSnapshot(disabled);
assert(disabled.spacing);
assert.deepEqual(
  scaleContrasts(disabled.colorSystem, scale()),
  disabled.colorSystem.contrasts,
);
assert.equal(contrastStepIndex(0, scale(), disabled.rules), 100);
const resolved = resolveColorDocument(disabled.colorSystem, [high], undefined, {
  modeSets: disabled.modeSets,
});
assert.equal(
  resolved.scales.find((scale) => scale.id === gray.id)!.customContrasts,
  undefined,
);
const css = buildColorLibrary(
  disabled.colorSystem,
  [],
  [],
  undefined,
  disabled.rules,
);
assert.ok(!css.includes("--contrast-gray-25:"));
assert.ok(css.includes("--contrast-100:"));
const diff = compareAuthoring(original, disabled);
assert.ok(
  diff.slots.some(
    (slot) => slot.changed && slot.id.includes("disabledCustomContrasts"),
  ),
);
assert.ok(
  colorFoundationParameters(disabled.colorSystem).some(
    (record) =>
      record.id === `scale/${gray.id}/disabledCustomContrasts` && record.edited,
  ),
);
assert.ok(
  ruleConsumers({
    typography: disabled.typography,
    spacing: disabled.spacing,
    color: disabled.colorSystem,
  }).some(
    (consumer) =>
      consumer.id === `color/${gray.id}` &&
      consumer.ruleId === custom.namingRuleId,
  ),
);
const canonical = canonicalDesignSystemDataset({
  ...designSystemDefaults,
  system: {
    ...designSystemDefaults.system,
    foundations: {
      ...designSystemDefaults.system.foundations,
      color: disabled.colorSystem,
    },
    modeSets: disabled.modeSets,
  },
});
assert.ok(
  composeDesignSystemDefaults(
    canonical,
    disabled.scaleTypes!,
  ).system.foundations.color.scales.find((scale) => scale.id === gray.id)!
    .disabledCustomContrasts,
);
assert.ok(
  !isColorSystemDocument({
    ...disabled.colorSystem,
    scales: [
      {
        ...scale(),
        disabledCustomContrasts: { ...custom, baseContrastId: "missing" },
      },
    ],
  }),
);
assert.ok(
  !isColorSystemDocument({
    ...disabled.colorSystem,
    scales: [{ ...scale(), customContrasts: custom }],
  }),
);
toggle("enable");
assert.deepEqual(scale().customContrasts, custom);
assert.equal(scale().disabledCustomContrasts, undefined);
const highResolved = resolveColorDocument(
  store.get(colorSystemDocumentAtom),
  [
    store
      .get(modeSetsAtom)
      .find((axis) => axis.id === owner.id)!
      .modes.find((mode) => mode.id === high.id)!,
  ],
  undefined,
  { applyMultiplier: false, applyPolarity: false, modeSets: disabled.modeSets },
);
assert.equal(
  highResolved.scales.find((scale) => scale.id === gray.id)!.customContrasts!
    .steps[3].value,
  5.5,
);

for (const candidate of original.colorSystem.scales.filter(
  (scale) => !scale.customContrasts,
)) {
  toggle("enable", candidate.id);
  const enabled = store
    .get(colorSystemDocumentAtom)
    .scales.find((scale) => scale.id === candidate.id)!.customContrasts!;
  assert.deepEqual(enabled.steps, original.colorSystem.contrasts);
  toggle("disable", candidate.id);
  toggle("enable", candidate.id);
  assert.deepEqual(
    store
      .get(colorSystemDocumentAtom)
      .scales.find((scale) => scale.id === candidate.id)!.customContrasts,
    enabled,
  );
  toggle("disable", candidate.id);
}
const scheme = original.modeSets.find((axis) =>
  axis.authoringCapabilities?.includes("color.backgroundLightness"),
)!;
const opposite = scheme.modes.find((mode) => mode.id !== scheme.defaultModeId)!;
store.set(modeSelectionAtom, { [scheme.key]: opposite.id });
toggle("disable");
toggle("enable");
assert.deepEqual(scale().customContrasts, custom);
store.set(previewOverridesAtom, { "color.contrastMultiplier": 1.2 });
assert.throws(() => toggle("disable"), /saved mode/);
store.set(previewOverridesAtom, {});
store.set(editModeAtom, false);
assert.throws(() => toggle("disable"), /edit mode/);
store.set(editModeAtom, true);
toggle("disable");
store.set(cancelEditAtom);
assert.deepEqual(scale().customContrasts, custom);
assert.equal(scale().disabledCustomContrasts, undefined);

store.set(editModeAtom, true);
toggle("disable");
const change = store
  .get(legacyChangeGroupsAtom)
  .flatMap((group) => group.items)
  .find((item) => item.sourceKind === "scale" && item.id === gray.id)!;
assert.ok(
  change.fields.some((field) => field.key === "Disabled Custom Contrasts"),
);
const reset = prepareChangeReset(
  { ...captureSnapshot(store.get), attachments: {} },
  sourceResetPlan("Gray custom contrast settings", [
    {
      path: ["colorSystem", "scales", { key: "id", id: gray.id }],
      expected: scale(),
    },
  ]),
);
assert.deepEqual(
  reset.colorSystem.scales.find((scale) => scale.id === gray.id)!
    .customContrasts,
  custom,
);
store.set(revertChangeItemAtom, change);
assert.deepEqual(scale().customContrasts, custom);
assert.equal(scale().disabledCustomContrasts, undefined);
toggle("disable");
const uiChange = store
  .get(changeGroupsAtom)
  .flatMap((group) => group.items)
  .find((item) => item.id.includes(`"${gray.id}"`))!;
assert.ok(uiChange);
store.set(applyChangeResetPlanAtom, itemResetPlan(uiChange));
assert.deepEqual(scale().customContrasts, custom);
assert.equal(scale().disabledCustomContrasts, undefined);

const data = new Map<string, string>();
const events = new EventTarget();
const previous = Object.getOwnPropertyDescriptor(globalThis, "window");
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
try {
  data.set(
    AUTHORING_STORAGE_KEY,
    JSON.stringify({
      version: AUTHORING_RECORD_VERSION,
      working: disabled,
      saved: disabled,
      isEditing: true,
      attachments: {},
      savedAttachments: {},
    }),
  );
  const reloaded = createStore();
  const dispose = initializeAuthoringPersistence(reloaded, {
    validateScheduled: null,
  });
  try {
    assert.deepEqual(reloaded.get(persistenceIssuesAtom), []);
    const restored = captureSnapshot(reloaded.get);
    for (const edit of Object.values(disabled.browserTokenEdits!)) {
      const identity = edit.authoring?.identity;
      if (!identity) continue;
      assert.deepEqual(
        tokenIdentity(restored.browserTokenEdits!, identity.sourceId),
        identity,
        "Reload must preserve existing and inactive publication identities.",
      );
    }
    assert.deepEqual(
      reloaded
        .get(colorSystemDocumentAtom)
        .scales.find((scale) => scale.id === gray.id)!.disabledCustomContrasts,
      custom,
    );
    reloaded.set(editCustomContrastsAtom, { kind: "enable", scaleId: gray.id });
    assert.deepEqual(
      reloaded
        .get(colorSystemDocumentAtom)
        .scales.find((scale) => scale.id === gray.id)!.customContrasts,
      custom,
    );
    reloaded.set(editCustomContrastsAtom, {
      kind: "disable",
      scaleId: gray.id,
    });
    reloaded.set(saveEditAtom);
    flushPersistedState();
    assert.deepEqual(
      JSON.parse(
        decodeAuthoringStorage(data.get(AUTHORING_STORAGE_KEY)!),
      ).saved.colorSystem.scales.find(
        (scale: { id: string }) => scale.id === gray.id,
      ).disabledCustomContrasts,
      custom,
    );
  } finally {
    dispose();
  }
} finally {
  if (previous) Object.defineProperty(globalThis, "window", previous);
  else Reflect.deleteProperty(globalThis, "window");
}
console.log(
  "Custom contrast toggles: all scales, modes, shared output, retained settings, Changes, reset, Cancel and Save/reload pass.",
);
