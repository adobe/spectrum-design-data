// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { createStore } from "jotai";
import {
  captureSnapshot,
  cancelEditAtom,
  createDefaultSnapshot,
  editSessionSnapshotAtom,
  restoreAuthoringSnapshotAtom,
  saveEditAtom,
} from "../src/features/edit-session/state";
import {
  colorSystemDocumentAtom,
  cssBaseDocumentAtom,
  resolvedColorSystemDocumentAtom,
} from "../src/features/color-system/state";
import {
  customContrastEditingContextAtom,
  editCustomContrastsAtom,
} from "../src/features/color-system/customContrastState";
import { effectiveContrast } from "../src/features/color-system/polarity";
import { compareAuthoring } from "../src/features/changelog/registry";
import { modeSetsAtom } from "../src/features/modes/state";
import { modeSelectionAtom } from "../src/features/modes/selection";
import { previewOverridesAtom } from "../src/features/modes/previewState";
import { editModeAtom } from "../src/state/view/editMode";

const near = (actual: number, expected: number) =>
  assert.ok(Math.abs(actual - expected) < 1e-10, `${actual} != ${expected}`);
const store = createStore();
const seed = createDefaultSnapshot();
const darkSeed = seed.modeSets
  .find((axis) => axis.key === "colorScheme")!
  .modes.find((mode) => mode.key === "dark")!;
darkSeed.foundations.color = {
  ...darkSeed.foundations.color,
  backgroundLightness: 0.17,
};
store.set(restoreAuthoringSnapshotAtom, seed);
store.set(editModeAtom, true);
const original = structuredClone(store.get(colorSystemDocumentAtom));
original.settings.polarityCompensation = 0.6;
const gray = original.scales.find((scale) => scale.id === "scale-gray")!;
const step = gray.customContrasts!.steps[3];
const sibling = gray.customContrasts!.steps[4];
step.value = 1.2;
step.oppositeValue = 1.7;
store.set(colorSystemDocumentAtom, original);
const sets = store.get(modeSetsAtom);
const schemes = sets.find((axis) => axis.key === "colorScheme")!;
const dark = schemes.modes.find((mode) => mode.key === "dark")!;
const contrast = sets.find((axis) => axis.key === "contrast")!;
const high = contrast.modes.find((mode) => mode.key === "high")!;
const action = { scaleId: gray.id, stepId: step.id };
const authored = () =>
  store
    .get(colorSystemDocumentAtom)
    .scales.find((scale) => scale.id === gray.id)!
    .customContrasts!.steps.find((item) => item.id === step.id)!;
const resolvedStep = () =>
  store
    .get(cssBaseDocumentAtom)
    .scales.find((scale) => scale.id === gray.id)!
    .customContrasts!.steps.find((item) => item.id === step.id)!;

store.set(modeSelectionAtom, { [schemes.key]: schemes.defaultModeId });
assert.equal(store.get(customContrastEditingContextAtom).modeLabel, undefined);
assert.equal(store.get(customContrastEditingContextAtom).opposite, false);
store.set(modeSelectionAtom, { [schemes.key]: dark.id });
const context = store.get(customContrastEditingContextAtom);
assert.equal(context.opposite, true);
assert.match(context.modeLabel!, /Dark/);
near(resolvedStep().value, effectiveContrast(step, context.polarity));
assert.deepEqual(
  authored(),
  step,
  "Selecting Dark preserves existing overrides.",
);

const before = structuredClone(captureSnapshot(store.get));
store.set(editSessionSnapshotAtom, before);
const unrelated = before.colorSystem.scales
  .find((scale) => scale.id === gray.id)!
  .customContrasts!.steps.find((item) => item.id === sibling.id)!;
store.set(editCustomContrastsAtom, { kind: "reset", ...action });
assert.equal(authored().oppositeValue, undefined);
assert.equal(
  authored().value,
  step.value,
  "Reset retains the Light starting value.",
);
const expected = effectiveContrast(
  { id: step.id, value: step.value },
  context.polarity,
);
near(resolvedStep().value, expected);
assert.notEqual(
  expected,
  step.value,
  "Reset uses compensation, not the raw Light ratio.",
);
assert.notEqual(
  expected,
  effectiveContrast(step, context.polarity),
  "Reset removes the old manual target rather than continuing to blend it.",
);
assert.deepEqual(
  store
    .get(colorSystemDocumentAtom)
    .scales.find((scale) => scale.id === gray.id)!
    .customContrasts!.steps.find((item) => item.id === sibling.id),
  unrelated,
  "Reset leaves other overrides unchanged.",
);
assert.equal(
  compareAuthoring(before, captureSnapshot(store.get)).slots.filter(
    (slot) => slot.changed,
  ).length,
  1,
  "Changes counts removal as one authored field.",
);
store.set(cancelEditAtom);
assert.deepEqual(authored(), step, "Cancel restores the existing override.");
store.set(editModeAtom, true);

store.set(editCustomContrastsAtom, { kind: "value", ...action, value: 2 });
near(resolvedStep().value, 2);
assert.equal(authored().value, step.value, "Dark edits do not change Light.");
assert.notEqual(
  authored().oppositeValue,
  2,
  "The existing endpoint encoding is reversed, not compounded.",
);
store.set(saveEditAtom);
const saved = structuredClone(store.get(editSessionSnapshotAtom)!);
const reloaded = createStore();
reloaded.set(restoreAuthoringSnapshotAtom, saved);
reloaded.set(modeSelectionAtom, { [schemes.key]: dark.id });
const restored = reloaded
  .get(cssBaseDocumentAtom)
  .scales.find((scale) => scale.id === gray.id)!
  .customContrasts!.steps.find((item) => item.id === step.id)!;
near(restored.value, 2);

store.set(editCustomContrastsAtom, { kind: "reset", ...action });
near(resolvedStep().value, expected);
store.set(saveEditAtom);
const resetSaved = structuredClone(store.get(editSessionSnapshotAtom)!);
reloaded.set(restoreAuthoringSnapshotAtom, resetSaved);
assert.equal(
  reloaded
    .get(colorSystemDocumentAtom)
    .scales.find((scale) => scale.id === gray.id)!
    .customContrasts!.steps.find((item) => item.id === step.id)!.oppositeValue,
  undefined,
  "Save/reload does not restore a removed override.",
);

for (const value of [Number.NaN, 0, 22]) {
  assert.throws(
    () =>
      store.set(editCustomContrastsAtom, { kind: "value", ...action, value }),
    /between 1 and 21/,
  );
}
assert.throws(
  () => store.set(editCustomContrastsAtom, { kind: "add", scaleId: gray.id }),
  /reference color scheme/,
);
store.set(previewOverridesAtom, { "color.backgroundLightness": 0.1 });
assert.throws(
  () => store.set(editCustomContrastsAtom, { kind: "reset", ...action }),
  /Select a saved mode/,
);
store.set(previewOverridesAtom, {});
store.set(editModeAtom, false);
assert.throws(
  () => store.set(editCustomContrastsAtom, { kind: "reset", ...action }),
  /edit mode/,
);
store.set(editModeAtom, true);
store.set(modeSelectionAtom, {
  [schemes.key]: dark.id,
  [contrast.key]: high.id,
});
assert.equal(store.get(customContrastEditingContextAtom).mode?.id, high.id);
assert.equal(store.get(customContrastEditingContextAtom).opposite, false);
store.set(editCustomContrastsAtom, { kind: "value", ...action, value: 3 });
assert.equal(
  store
    .get(modeSetsAtom)
    .find((axis) => axis.id === contrast.id)!
    .modes.find((mode) => mode.id === high.id)!.foundations.color!
    .scaleContrasts![gray.id][step.id],
  3,
  "Existing Contrast-mode overrides keep their owner.",
);
store.set(editCustomContrastsAtom, { kind: "reset", ...action });
near(
  store
    .get(resolvedColorSystemDocumentAtom)
    .scales.find((scale) => scale.id === gray.id)!
    .customContrasts!.steps.find((item) => item.id === step.id)!.value,
  (expected - 1) * 2 + 1,
);
console.log(
  "Custom contrast polarity: inherited Dark values, exact edits, reset to compensation, scoped Changes, Save/Cancel/reload and existing Contrast modes passed.",
);
