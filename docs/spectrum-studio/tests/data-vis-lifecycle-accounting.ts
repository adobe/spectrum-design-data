// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { createStore } from "jotai";
import { createDataVisSnapshot, DATA_VIS_IDS } from "./fixtures/dataVis";
import {
  assertStoredSnapshot,
  captureSnapshot,
  restoreAuthoringSnapshotAtom,
  saveEditAtom,
  editSessionSnapshotAtom,
} from "../src/features/edit-session/state";
import { colorSystemDocumentAtom } from "../src/features/color-system/state";
import {
  dataVisContextFingerprintAtom,
  dataVisInputDocumentAtom,
  editDataVisStructureAtom,
  restoreDataVisPointAtom,
  editDataVisPointAtom,
  pendingDataVisPointEditAtom,
  applyPendingDataVisPointEditAtom,
  applyCategoricalDataVisAtom,
  dataVisInspectorAtom,
  dataVisUiSwatchesAtom,
} from "../src/features/color-system/data-vis/state";
import { dataVisMemberId } from "../src/features/color-system/data-vis/identity";
import {
  modeSetsAtom,
  removeModeSetAtom,
  replaceModeSetAtom,
  restoreModeSetAtom,
} from "../src/features/modes/state";
import { modeSelectionAtom } from "../src/features/modes/selection";
import { previewOverridesAtom } from "../src/features/modes/previewState";
import { createMode, type ModeSet } from "../src/features/modes/model";
import { editModeAtom } from "../src/state/view/editMode";
import { browserTokenEditsAtom } from "../src/features/tokens/browserEdits";
import { tokenOverridesAtom } from "../src/features/tokens/overrides";
import { canonicalTokenModeKey } from "../src/features/tokens/browserModel";
import { tokenStableKey, tokenUuid } from "../src/features/tokens/model";
import {
  browserTokenImpactRecordsAtom,
  savedBrowserConceptIdsAtom,
} from "../src/features/tokens/browserSavedState";
import { aliasesAtom } from "../src/features/tokens/aliasState";
import { buildCascadeTokenExport } from "../src/features/tokens/cascadeExport";
import {
  canonicalAliasRows,
  completeAliasSource,
} from "../src/features/tokens/aliasTargets";
import { inspectPaletteAsync } from "../src/features/color-system/data-vis/categorical";
import { detachFoundationModeSetAtom } from "../src/features/modes/foundationAttachments";
import { revertChangeTopicAtom } from "../src/features/changelog/state";
import { taxonomyDocumentAtom } from "../src/features/taxonomy/state";
import { rulesAtom } from "../src/features/logic/library";
import { setParameterValue } from "../src/features/modes/parameters";

const store = createStore(),
  snapshot = createDataVisSnapshot();
store.set(restoreAuthoringSnapshotAtom, snapshot);
store.set(editModeAtom, true);
assert.notEqual(
  dataVisMemberId("a:b", "c"),
  dataVisMemberId("a", "b:c"),
  "Native IDs use unambiguous scale/member tuples.",
);
store.set(editDataVisStructureAtom, {
  scaleId: DATA_VIS_IDS.sequential,
  kind: "add-point",
});
const sequence = store
  .get(colorSystemDocumentAtom)
  .dataVisScales.find((scale) => scale.id === DATA_VIS_IDS.sequential)!;
if (sequence.kind === "categorical")
  throw new Error("Expected a continuous fixture.");
const point = sequence.points.find((point) => point.position === 0.25)!;
const scheme = store
    .get(modeSetsAtom)
    .find((axis) => axis.key === "colorScheme")!,
  contrast = store.get(modeSetsAtom).find((axis) => axis.key === "contrast")!;
const dark = scheme.modes.find((mode) => mode.key === "dark")!,
  high = contrast.modes.find((mode) => mode.key === "high")!;
store.set(modeSelectionAtom, { colorScheme: dark.id });
store.set(editDataVisPointAtom, {
  scaleId: sequence.id,
  pointId: point.id,
  source: { kind: "ui-scale", scaleId: snapshot.colorSystem.scales[0].id },
});
store.set(modeSelectionAtom, { contrast: high.id });
store.set(editDataVisPointAtom, {
  scaleId: sequence.id,
  pointId: point.id,
  contrast: { value: 3.14159 },
});
store.set(modeSelectionAtom, {});
const undo = store.set(editDataVisStructureAtom, {
  scaleId: sequence.id,
  pointId: point.id,
  kind: "remove-point",
})!;
assert.ok(
  !store
    .get(modeSetsAtom)
    .some((axis) =>
      axis.modes.some(
        (mode) =>
          mode.foundations.color?.dataVisSources?.[sequence.id]?.[point.id] ||
          mode.foundations.color?.dataVisContrasts?.[sequence.id]?.[point.id],
      ),
    ),
);
store.set(editDataVisPointAtom, {
  scaleId: sequence.id,
  pointId: "end",
  contrast: { value: 9.5 },
  scope: "base",
});
store.set(restoreDataVisPointAtom, undo);
const restored = store
  .get(colorSystemDocumentAtom)
  .dataVisScales.find((scale) => scale.id === sequence.id)!;
if (restored.kind === "categorical")
  throw new Error("Expected continuous output.");
assert.ok(
  restored.points.some(
    (candidate) => candidate.id === point.id && candidate.position === 0.25,
  ),
);
assert.equal(
  restored.points.find((candidate) => candidate.id === "end")!.contrast!.value,
  9.5,
  "Scoped point Undo retains a later unrelated edit.",
);
assert.equal(
  store
    .get(modeSetsAtom)
    .find((axis) => axis.id === contrast.id)!
    .modes.find((mode) => mode.id === high.id)!.foundations.color!
    .dataVisContrasts![sequence.id][point.id],
  3.14159,
);
assertStoredSnapshot(captureSnapshot(store.get));
assert.throws(() => store.set(restoreDataVisPointAtom, undo), /already in use/);
store.set(editDataVisStructureAtom, {
  scaleId: sequence.id,
  pointId: point.id,
  kind: "remove-point",
});
store.set(
  modeSetsAtom,
  store
    .get(modeSetsAtom)
    .map((axis) =>
      axis.id === contrast.id
        ? { ...axis, modes: axis.modes.filter((mode) => mode.id !== high.id) }
        : axis,
    ),
);
const beforeMissingUndo = captureSnapshot(store.get);
assert.throws(() => store.set(restoreDataVisPointAtom, undo), /mode.*removed/);
assert.deepEqual(captureSnapshot(store.get), beforeMissingUndo);

store.set(restoreAuthoringSnapshotAtom, snapshot);
store.set(editModeAtom, true);
store.set(previewOverridesAtom, { "color.contrastMultiplier": 1.25 });
assert.equal(
  store.set(editDataVisPointAtom, {
    scaleId: DATA_VIS_IDS.sequential,
    pointId: "start",
    contrast: { value: 4.88 },
  }),
  "pending",
);
const pending = store.get(pendingDataVisPointEditAtom)!;
store.set(pendingDataVisPointEditAtom, {
  ...pending,
  edit: { ...pending.edit, pointId: "missing" },
});
const beforeInvalid = [
  captureSnapshot(store.get),
  store.get(modeSelectionAtom),
  store.get(previewOverridesAtom),
];
assert.throws(
  () =>
    store.set(applyPendingDataVisPointEditAtom, { name: "New invalid mode" }),
  /unavailable/,
);
assert.deepEqual(
  [
    captureSnapshot(store.get),
    store.get(modeSelectionAtom),
    store.get(previewOverridesAtom),
  ],
  beforeInvalid,
  "A destination is validated before creating a mode, clearing previews or changing selection.",
);
store.set(pendingDataVisPointEditAtom, pending);
store.set(applyPendingDataVisPointEditAtom, { name: "Detailed contrast" });
const destination = store
  .get(modeSetsAtom)
  .find((axis) => axis.id === contrast.id)!
  .modes.find((mode) => mode.name === "Detailed contrast")!;
assert.equal(destination.foundations.color!.contrastMultiplier, 1.25);
assert.equal(
  destination.foundations.color!.dataVisContrasts![DATA_VIS_IDS.sequential]
    .start,
  4.88,
);
assert.deepEqual(store.get(previewOverridesAtom), {});
assert.equal(store.get(modeSelectionAtom).contrast, destination.id);
assert.equal(store.get(pendingDataVisPointEditAtom), null);
assertStoredSnapshot(captureSnapshot(store.get));

store.set(restoreAuthoringSnapshotAtom, snapshot);
store.set(editModeAtom, true);
const categorical = store
  .get(colorSystemDocumentAtom)
  .dataVisScales.find((scale) => scale.kind === "categorical")!;
if (categorical.kind !== "categorical")
  throw new Error("Expected a categorical fixture.");
const removedId = dataVisMemberId(categorical.id, categorical.members[1].id),
  retainedId = dataVisMemberId(categorical.id, categorical.members[0].id);
const defaultKey = canonicalTokenModeKey(
  Object.fromEntries(
    snapshot.modeSets.map((axis) => [axis.id, axis.defaultModeId]),
  ),
);
const modeBaseline = captureSnapshot(store.get);
assert.throws(
  () => store.set(replaceModeSetAtom, { ...scheme, defaultModeId: dark.id }),
  /clear.*data vis overrides.*default/,
);
assert.deepEqual(
  captureSnapshot(store.get),
  modeBaseline,
  "Changing the default cannot silently ignore authored data vis patches.",
);
assert.throws(
  () =>
    store.set(replaceModeSetAtom, {
      ...scheme,
      authoringCapabilities: scheme.authoringCapabilities!.filter(
        (id) => id !== "color.scales",
      ),
    }),
  /clear.*data vis overrides.*owner/,
);
assert.deepEqual(captureSnapshot(store.get), modeBaseline);
const clearedSource = setParameterValue(
  dark,
  "color.dataVisSources",
  undefined,
);
assert.equal(clearedSource.foundations.color?.dataVisSources, undefined);
assert.equal(
  clearedSource.foundations.color?.backgroundLightness,
  dark.foundations.color?.backgroundLightness,
);
assert.throws(
  () => setParameterValue(dark, "color.dataVisSources", "invalid"),
  /data vis editor/,
);
const clearedContrast = setParameterValue(
  high,
  "color.dataVisContrasts",
  undefined,
);
assert.equal(clearedContrast.foundations.color?.dataVisContrasts, undefined);
assert.equal(
  clearedContrast.foundations.color?.contrastMultiplier,
  high.foundations.color?.contrastMultiplier,
);
const darkKey = canonicalTokenModeKey(
  Object.fromEntries(
    snapshot.modeSets.map((axis) => [
      axis.id,
      axis.id === scheme.id ? dark.id : axis.defaultModeId,
    ]),
  ),
);
store.set(browserTokenEditsAtom, {
  [retainedId]: {
    description: "Retain metadata during mode changes",
    values: {
      [defaultKey]: { value: "#112233", baseline: "#333333" },
      [darkKey]: { value: "#445566", baseline: "#333333" },
    },
  },
});
store.set(replaceModeSetAtom, {
  ...scheme,
  modes: scheme.modes.filter((mode) => mode.id !== dark.id),
});
assert.deepEqual(
  Object.keys(store.get(browserTokenEditsAtom)[retainedId].values),
  [defaultKey],
  "Deleting one mode removes only that mode's value records.",
);
assertStoredSnapshot(captureSnapshot(store.get));
store.set(restoreAuthoringSnapshotAtom, snapshot);
store.set(editModeAtom, true);
store.set(browserTokenEditsAtom, {
  [retainedId]: {
    description: "Original metadata",
    values: { [darkKey]: { value: "#445566", baseline: "#333333" } },
  },
});
store.set(browserTokenEditsAtom, {
  ...store.get(browserTokenEditsAtom),
  unrelated: { values: {} },
});
const tokenValues = store.set(removeModeSetAtom, scheme.id);
assert.deepEqual(store.get(browserTokenEditsAtom)[retainedId].values, {});
assert.deepEqual(
  store.get(browserTokenEditsAtom).unrelated,
  { values: {} },
  "Mode cleanup does not rewrite unrelated records.",
);
store.set(browserTokenEditsAtom, {
  ...store.get(browserTokenEditsAtom),
  [retainedId]: { description: "Later metadata", values: {} },
});
store.set(restoreModeSetAtom, {
  modeSet: scheme,
  index: snapshot.modeSets.findIndex((axis) => axis.id === scheme.id),
  tokenValues,
});
assert.equal(
  store.get(browserTokenEditsAtom)[retainedId].description,
  "Later metadata",
);
assert.equal(
  store.get(browserTokenEditsAtom)[retainedId].values[darkKey].value,
  "#445566",
);
assertStoredSnapshot(captureSnapshot(store.get));
const repeatedRemoval = store.set(removeModeSetAtom, scheme.id);
store.set(browserTokenEditsAtom, {
  [retainedId]: {
    values: { [darkKey]: { value: "#abcdef", baseline: "#333333" } },
  },
});
const beforeConflictingModeUndo = captureSnapshot(store.get);
assert.throws(
  () =>
    store.set(restoreModeSetAtom, {
      modeSet: scheme,
      index: 0,
      tokenValues: repeatedRemoval,
    }),
  /Undo cannot overwrite/,
);
assert.deepEqual(
  captureSnapshot(store.get),
  beforeConflictingModeUndo,
  "Conflicting mode Undo is atomic.",
);

store.set(restoreAuthoringSnapshotAtom, snapshot);
store.set(editModeAtom, true);
const modeOnlySource = {
  ...structuredClone(snapshot.colorSystem.scales[0]),
  id: "mode-only-source",
  name: "Mode-only source",
};
delete modeOnlySource.nameRef;
store.set(colorSystemDocumentAtom, {
  ...store.get(colorSystemDocumentAtom),
  scales: [...store.get(colorSystemDocumentAtom).scales, modeOnlySource],
});
const modeOnlyScheme = structuredClone(scheme);
modeOnlyScheme.modes.find(
  (mode) => mode.id === dark.id,
)!.foundations.color!.dataVisSources![DATA_VIS_IDS.diverging].right = {
  scaleId: modeOnlySource.id,
};
store.set(replaceModeSetAtom, modeOnlyScheme);
const modeOnlyRemoval = store.set(removeModeSetAtom, scheme.id);
store.set(colorSystemDocumentAtom, {
  ...store.get(colorSystemDocumentAtom),
  scales: store
    .get(colorSystemDocumentAtom)
    .scales.filter((scale) => scale.id !== modeOnlySource.id),
});
const beforeMissingSourceUndo = captureSnapshot(store.get);
assert.throws(
  () =>
    store.set(restoreModeSetAtom, {
      modeSet: modeOnlyScheme,
      index: 0,
      tokenValues: modeOnlyRemoval,
    }),
  /linked UI scale mode-only-source is unavailable/,
);
assert.deepEqual(
  captureSnapshot(store.get),
  beforeMissingSourceUndo,
  "Mode Undo cannot restore a dangling source or make partial writes.",
);

store.set(restoreAuthoringSnapshotAtom, snapshot);
store.set(editModeAtom, true);
store.set(browserTokenEditsAtom, {
  [removedId]: {
    values: { [darkKey]: { value: "#445566", baseline: "#333333" } },
  },
});
const removedMemberModeValues = store.set(removeModeSetAtom, scheme.id);
store.set(applyCategoricalDataVisAtom, {
  scale: { ...categorical, members: categorical.members.slice(0, 1) },
  fingerprint: store.get(dataVisContextFingerprintAtom),
  acknowledgeFailures: true,
});
const beforeMissingMemberUndo = captureSnapshot(store.get);
assert.throws(
  () =>
    store.set(restoreModeSetAtom, {
      modeSet: scheme,
      index: 0,
      tokenValues: removedMemberModeValues,
    }),
  /categorical color was removed/,
);
assert.deepEqual(
  captureSnapshot(store.get),
  beforeMissingMemberUndo,
  "Mode Undo cannot recreate a removed member's value record.",
);

store.set(restoreAuthoringSnapshotAtom, snapshot);
store.set(editModeAtom, true);
store.set(browserTokenEditsAtom, {
  [removedId]: {
    values: { [defaultKey]: { value: "#222222", baseline: "#333333" } },
  },
  [retainedId]: { description: "Keep this metadata", values: {} },
});
store.set(tokenOverridesAtom, {
  [removedId]: {
    value: "#222222",
    editedAt: "test",
    baseline: {
      name: { colorName: "test", contrastValue: "" },
      value: "#333333",
    },
  },
});
const aliasContexts = canonicalAliasRows(
  completeAliasSource(captureSnapshot(store.get)),
)
  .filter((row) => row.id === removedId)
  .map((row) => row.context);
assert.ok(
  aliasContexts.length,
  "The fixture alias uses actual declared member contexts.",
);
store.set(aliasesAtom, {
  schemaVersion: 1,
  tokens: [
    {
      id: tokenUuid("blocked-category"),
      name: "blocked",
      $ref: removedId,
      contexts: aliasContexts,
    },
  ],
});
const smaller = { ...categorical, members: categorical.members.slice(0, 1) },
  beforeBlocked = captureSnapshot(store.get);
assert.throws(
  () =>
    store.set(applyCategoricalDataVisAtom, {
      scale: smaller,
      fingerprint: store.get(dataVisContextFingerprintAtom),
      acknowledgeFailures: true,
    }),
  /alias targets/,
);
assert.deepEqual(captureSnapshot(store.get), beforeBlocked);
assert.throws(
  () => store.set(revertChangeTopicAtom, "foundations"),
  /replacement alias targets/,
);
assert.deepEqual(captureSnapshot(store.get), beforeBlocked);
store.set(aliasesAtom, { schemaVersion: 1, tokens: [] });
store.set(applyCategoricalDataVisAtom, {
  scale: smaller,
  fingerprint: store.get(dataVisContextFingerprintAtom),
  acknowledgeFailures: true,
});
assert.equal(store.get(browserTokenEditsAtom)[removedId], undefined);
assert.equal(store.get(tokenOverridesAtom)[removedId], undefined);
assert.equal(
  store.get(browserTokenEditsAtom)[retainedId].description,
  "Keep this metadata",
);

store.set(restoreAuthoringSnapshotAtom, {
  ...snapshot,
  components: { ...snapshot.components!, components: [] },
});
store.set(editModeAtom, true);
const unrelatedModes = Array.from({ length: 3 }, (_, index) => ({
  ...createMode(),
  key: `unrelated-${index}`,
  name: `Unrelated ${index + 1}`,
}));
const unrelated: ModeSet = {
  id: "unrelated-axis",
  key: "unrelated",
  name: "Unrelated",
  description: "",
  modes: unrelatedModes,
  defaultModeId: unrelatedModes[0].id,
  authoringCapabilities: [],
};
store.set(modeSetsAtom, [...store.get(modeSetsAtom), unrelated]);
const categoryRecords = () =>
  store
    .get(browserTokenImpactRecordsAtom)
    .filter((record) => [removedId, retainedId].includes(record.tokenId));
assert.deepEqual(
  categoryRecords().map((record) => record.modeValues.length),
  [4, 4],
  "Unrelated axes do not multiply categorical mode-value denominators.",
);
const nativeRows = () =>
  buildCascadeTokenExport({
    base: store.get(colorSystemDocumentAtom),
    modeSets: store.get(modeSetsAtom),
    activeModes: [],
    activeTokens: [],
    overrides: store.get(tokenOverridesAtom),
    browserEdits: store.get(browserTokenEditsAtom),
    taxonomy: store.get(taxonomyDocumentAtom),
    rules: store.get(rulesAtom),
  });
assert.equal(
  nativeRows().tokens.filter((row) =>
    [
      tokenUuid(`concept:${retainedId}`),
      tokenUuid(`concept:${removedId}`),
    ].includes(row.conceptId),
  ).length,
  8,
);
const fullKey = canonicalTokenModeKey(
  Object.fromEntries(
    store
      .get(modeSetsAtom)
      .map((axis) => [
        axis.id,
        axis.id === unrelated.id ? unrelatedModes[1].id : axis.defaultModeId,
      ]),
  ),
);
const uiId = tokenUuid(
  tokenStableKey(
    categorical.members[0].source.scaleId,
    categorical.members[0].source.contrastId,
  ),
);
store.set(browserTokenEditsAtom, {
  [uiId]: { values: { [fullKey]: { value: "#111111", baseline: "#333333" } } },
});
const expectedScoped = store
  .get(modeSetsAtom)
  .reduce((count, axis) => count * axis.modes.length, 1);
assert.equal(
  categoryRecords().find((record) => record.tokenId === retainedId)!.modeValues
    .length,
  expectedScoped,
);
assert.equal(
  categoryRecords().find((record) => record.tokenId === removedId)!.modeValues
    .length,
  4,
);
assert.equal(
  categoryRecords().find((record) => record.tokenId === retainedId)!
    .manuallyOverridden,
  false,
);
assert.ok(
  canonicalAliasRows(completeAliasSource(captureSnapshot(store.get))).some(
    (row) => row.id === retainedId && row.token.value === "#111111",
  ),
);
store.set(saveEditAtom);
assert.ok(store.get(savedBrowserConceptIdsAtom).has(retainedId));
assert.equal(
  store
    .get(editSessionSnapshotAtom)!
    .colorSystem.dataVisScales.filter((scale) => scale.kind !== "categorical")
    .length,
  2,
);
store.set(editModeAtom, true);
const tooMany = structuredClone(unrelated);
tooMany.modes = Array.from({ length: 1500 }, (_, index) => ({
  ...createMode(),
  key: `large-${index}`,
  name: `Large ${index + 1}`,
}));
tooMany.defaultModeId = tooMany.modes[0].id;
store.set(
  modeSetsAtom,
  store
    .get(modeSetsAtom)
    .map((axis) => (axis.id === unrelated.id ? tooMany : axis)),
);
assert.throws(nativeRows, /Too many declared color-mode/);

store.set(restoreAuthoringSnapshotAtom, snapshot);
store.set(editModeAtom, true);
const key = canonicalTokenModeKey(
  Object.fromEntries(
    snapshot.modeSets.map((axis) => [axis.id, axis.defaultModeId]),
  ),
);
store.set(browserTokenEditsAtom, {
  [retainedId]: {
    description: "Retain non-value metadata",
    values: { [key]: { value: "#112233", baseline: "#333333" } },
  },
});
store.set(detachFoundationModeSetAtom, {
  modeSetId: scheme.id,
  foundation: "color",
});
assert.equal(
  store
    .get(modeSetsAtom)
    .find((axis) => axis.id === scheme.id)!
    .modes.some((mode) => mode.foundations.color?.dataVisSources),
  false,
);
assert.deepEqual(store.get(browserTokenEditsAtom)[retainedId].values, {});
assert.equal(
  store.get(browserTokenEditsAtom)[retainedId].description,
  "Retain non-value metadata",
);
assert.deepEqual(
  store.get(colorSystemDocumentAtom).dataVisScales,
  snapshot.colorSystem.dataVisScales,
  "Detaching modes never removes or changes shared recipes.",
);
assertStoredSnapshot(captureSnapshot(store.get));

store.set(restoreAuthoringSnapshotAtom, snapshot);
store.set(editModeAtom, true);
store.set(dataVisInspectorAtom, {
  inspect: async (request, signal) =>
    inspectPaletteAsync(
      request.members,
      request.preferences,
      request.background,
      request.gamut,
      { signal, budget: { yieldEvery: 1 } },
    ),
});
const source = store.get(dataVisUiSwatchesAtom)[0].source;
const large = {
  ...categorical,
  members: Array.from({ length: 40 }, (_, index) => ({
    id: `large-${index}`,
    source,
  })),
};
const beforeAsync = captureSnapshot(store.get);
const applying = store.set(applyCategoricalDataVisAtom, {
  scale: large,
  fingerprint: store.get(dataVisContextFingerprintAtom),
  acknowledgeFailures: true,
});
store.set(modeSelectionAtom, { colorScheme: dark.id });
await assert.rejects(Promise.resolve(applying), /changed while checking/);
assert.deepEqual(
  captureSnapshot(store.get),
  beforeAsync,
  "An async stale Apply cannot write members or clear token records.",
);
store.set(modeSelectionAtom, {});
const cancelled = new AbortController();
const cancelApplying = store.set(applyCategoricalDataVisAtom, {
  scale: large,
  fingerprint: store.get(dataVisContextFingerprintAtom),
  acknowledgeFailures: true,
  signal: cancelled.signal,
});
cancelled.abort();
await assert.rejects(Promise.resolve(cancelApplying), /cancelled/);
assert.deepEqual(captureSnapshot(store.get), beforeAsync);
assert.equal(
  store
    .get(dataVisInputDocumentAtom)
    .dataVisScales.find((scale) => scale.id === categorical.id)!.kind,
  "categorical",
);
console.log(
  "Data vis lifecycle/accounting: tuple identities, point/mode Undo, destination atomicity, removal cleanup, protected reverts, scoped counts, upstream ownership, mode detach and cancellable async Apply passed.",
);
