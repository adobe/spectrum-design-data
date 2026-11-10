// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { createStore } from "jotai";
import {
  createDefaultSnapshot,
  restoreAuthoringSnapshotAtom,
} from "../src/features/edit-session/state";
import {
  opacityAxes,
  opacityContexts,
  resolveOpacity,
  synchronizeOpacityRows,
} from "../src/features/opacity/generation";
import {
  opacityDocumentAtom,
  opacityResultAtom,
  removeOpacityLevelAtom,
  resetOpacityOverrideAtom,
  restoreOpacityLevelAtom,
  updateOpacityLevelAtom,
} from "../src/features/opacity/state";
import { browserOpacitySources } from "../src/features/opacity/output";
import { registerOpacityVocabulary } from "../src/features/taxonomy/opacityGovernance";
import { browserTokenEditsAtom } from "../src/features/tokens/browserEdits";
import { canonicalTokenModeKey } from "../src/features/tokens/browserModel";
import { selectModeAtom } from "../src/features/modes/selection";
import { editModeAtom } from "../src/state/view/editMode";
import {
  nextSwatchIndex,
  swatchIndex,
} from "../src/features/scales/swatchIndices";

const source = createDefaultSnapshot();
assert.ok(source.opacity && source.taxonomy && source.browserTokenEdits);
const id = crypto.randomUUID();
const conceptId = crypto.randomUUID();
const scaleIndex = nextSwatchIndex(source.opacity.levels.map(swatchIndex));
source.opacity = {
  ...source.opacity,
  levels: [...source.opacity.levels, { id, scaleIndex, value: 0.2, rows: {} }],
};
source.taxonomy = registerOpacityVocabulary(source.taxonomy, source.opacity);
source.opacity = synchronizeOpacityRows(source)!;
const scheme = source.modeSets.find((axis) => axis.key === "colorScheme")!;
const scale = source.modeSets.find((axis) => axis.key === "scale")!;
assert.ok(scheme && scale);
const dark = scheme.modes.find((mode) => mode.key === "dark")!;
const mobile = scale.modes.find((mode) => mode.key === "mobile")!;
assert.ok(dark && mobile);
const modes = source.modeSets.map((axis) =>
  axis.id === scheme.id
    ? dark
    : axis.id === scale.id
      ? mobile
      : axis.modes.find((mode) => mode.id === axis.defaultModeId)!,
);
const baseline = resolveOpacity(source, modes).levels.find(
  (level) => level.id === id,
)!;
assert.ok(baseline);
const key = canonicalTokenModeKey({
  [scheme.id]: dark.id,
  [scale.id]: mobile.id,
});
const values = {
  [key]: { value: 0.71, baseline: baseline.generatedValue },
};
source.browserTokenEdits = {
  ...source.browserTokenEdits,
  [conceptId]: {
    authoring: {
      assignments: {},
      identity: {
        sourceId: id,
        conceptId,
        name: { property: "opacity", scaleIndex },
        rows: {},
      },
    },
    values,
  },
};
source.opacity = synchronizeOpacityRows(source)!;
const level = source.opacity.levels.find((level) => level.id === id)!;
source.browserTokenEdits[conceptId].authoring!.identity!.rows = {
  ...level.rows,
};
const before = structuredClone(source);
assert.deepEqual(
  new Set(opacityAxes(source).map((axis) => axis.key)),
  new Set(["colorScheme", "scale"]),
);
assert.equal(
  opacityContexts(source).length,
  scheme.modes.length * scale.modes.length,
);
const legacy = structuredClone(source);
delete legacy.browserTokenEdits![conceptId];
legacy.browserTokenEdits![id] = { values: structuredClone(values) };
let overrides = 0;
for (const context of opacityContexts(source)) {
  const canonical = resolveOpacity(source, context.modes);
  assert.deepEqual(canonical.issues, []);
  assert.deepEqual(canonical, resolveOpacity(legacy, context.modes));
  const output = canonical.levels.find((level) => level.id === id)!;
  assert.equal(output.overridden, context.key === key);
  if (output.overridden) {
    overrides++;
    assert.equal(output.value, 0.71);
    assert.equal(output.stale, false);
  }
}
assert.equal(overrides, 1);
assert.equal(
  browserOpacitySources(source, modes, source.taxonomy).find(
    (token) => token.id === id,
  )!.value,
  0.71,
);
assert.deepEqual(source, before);

const store = createStore();
store.set(restoreAuthoringSnapshotAtom, source);
store.set(selectModeAtom, { modeSetKey: scheme.key, modeId: dark.id });
store.set(selectModeAtom, { modeSetKey: scale.key, modeId: mobile.id });
store.set(editModeAtom, true);
store.set(updateOpacityLevelAtom, { id, value: 0.66 });
assert.deepEqual(store.get(browserTokenEditsAtom)[conceptId].values, {
  [key]: { value: 0.66, baseline: baseline.generatedValue },
});
assert.equal(store.get(browserTokenEditsAtom)[id], undefined);
store.set(resetOpacityOverrideAtom, id);
assert.deepEqual(store.get(browserTokenEditsAtom)[conceptId].values, {});
assert.deepEqual(
  store.get(browserTokenEditsAtom)[conceptId].authoring,
  source.browserTokenEdits[conceptId].authoring,
);
assert.equal(
  store.get(opacityResultAtom).levels.find((level) => level.id === id)!
    .overridden,
  false,
);
store.set(updateOpacityLevelAtom, { id, value: 0.66 });
const savedEdit = structuredClone(store.get(browserTokenEditsAtom)[conceptId]);
const removed = store.set(removeOpacityLevelAtom, id);
assert.equal(store.get(browserTokenEditsAtom)[conceptId], undefined);
assert.deepEqual(removed.edit, savedEdit);
store.set(restoreOpacityLevelAtom, removed);
assert.deepEqual(store.get(browserTokenEditsAtom)[conceptId], savedEdit);
assert.equal(store.get(browserTokenEditsAtom)[id], undefined);
assert.deepEqual(
  store.get(opacityDocumentAtom).levels.find((item) => item.id === id),
  removed.level,
);
assert.deepEqual(source, before);
console.log(
  "Canonical opacity edits preserve scoped values, legacy parity, reset and removal/Undo identities.",
);
