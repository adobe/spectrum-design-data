// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { createStore } from "jotai";
import { enterEditModeAtom } from "../src/features/edit-session/state";
import {
  colorSystemDocumentAtom,
  updateColorStopAtom,
} from "../src/features/color-system/state";
import {
  contrastStepIndex,
  sortContrastSteps,
} from "../src/features/color-system/contrastSteps";
import type { ColorScale } from "../src/features/color-system/model";
import { STANDARD_SCALE_NAMING_RULE } from "../src/features/logic/scaleNaming";
import { isGradientDragIntentional } from "../src/components/color-picker/gradientStopPositions";

for (const movement of [0, 1, -1, 5.99, -5.99])
  assert.equal(isGradientDragIntentional("mouse", 100, 100 + movement), false);
for (const movement of [6, -6, 20, -20])
  assert.equal(isGradientDragIntentional("mouse", 100, 100 + movement), true);
for (const pointerType of ["touch", "pen"])
  assert.equal(isGradientDragIntentional(pointerType, 100, 101), true);

const store = createStore();
store.set(enterEditModeAtom);
const document = store.get(colorSystemDocumentAtom);
const palette = structuredClone(document.palette);
const color = palette[0];
const scaleId = document.scales[0].id;
const stopId = document.scales[0].stops[0].id;
const currentStop = () =>
  store
    .get(colorSystemDocumentAtom)
    .scales.find((scale) => scale.id === scaleId)!
    .stops.find((stop) => stop.id === stopId)!;
const link = () =>
  store.set(updateColorStopAtom, {
    scaleId,
    stopId,
    paletteColorId: color.id,
  });
link();
const stop = currentStop();
const linkedDocument = structuredClone(store.get(colorSystemDocumentAtom));
const { paletteColorId, ...unlinkedStop } = stop;
assert.equal(paletteColorId, color.id);
const channels = { lightness: 0.54321, hue: 142.25, chroma: 0.21987 };
store.set(updateColorStopAtom, { scaleId, stopId, ...channels });
assert.deepEqual(currentStop(), {
  ...unlinkedStop,
  ...channels,
});
assert.equal(
  stop.paletteColorId,
  color.id,
  "Detaching must not mutate the source.",
);
assert.deepEqual(
  linkedDocument.scales
    .find((scale) => scale.id === scaleId)!
    .stops.find((source) => source.id === stopId),
  stop,
);
link();
store.set(updateColorStopAtom, { scaleId, stopId, lightness: 0.5 });
assert.deepEqual(
  currentStop(),
  { ...unlinkedStop, lightness: 0.5, hue: color.hue, chroma: color.chroma },
  "Partial literal edits start from the displayed palette value.",
);
assert.deepEqual(store.get(colorSystemDocumentAtom).palette, palette);
assert.deepEqual(
  store
    .get(colorSystemDocumentAtom)
    .scales.filter((scale) => scale.id !== scaleId),
  document.scales.filter((scale) => scale.id !== scaleId),
);

const scale: ColorScale = {
  id: "editor-scale",
  name: "Example",
  stops: [stop],
  customContrasts: {
    namingRuleId: STANDARD_SCALE_NAMING_RULE.id,
    baseContrastId: "base",
    steps: [
      { id: "base", value: 1.06 },
      { id: "high", value: 7.12345678, oppositeValue: 8.23456789 },
      { id: "equal-a", value: 2 },
      { id: "equal-b", value: 2 },
      { id: "low", value: 1.5 },
    ],
  },
};
const original = structuredClone(scale);
const custom = scale.customContrasts!;
const steps = sortContrastSteps(custom.steps);
assert.deepEqual(
  steps.map((step) => step.id),
  ["base", "low", "equal-a", "equal-b", "high"],
);
assert.deepEqual(scale, original, "Sorting must not mutate authored input.");
assert.equal(
  steps.at(-1),
  custom.steps[1],
  "Sorting preserves complete step records and identity.",
);
assert.deepEqual(sortContrastSteps(steps), steps, "Sort is idempotent.");
assert.deepEqual(sortContrastSteps([]), []);
assert.deepEqual(sortContrastSteps([steps[0]]), [steps[0]]);
const sortedScale = { ...scale, customContrasts: { ...custom, steps } };
assert.equal(sortedScale.customContrasts.baseContrastId, custom.baseContrastId);
assert.deepEqual(
  steps.map((_, index) => contrastStepIndex(index, sortedScale)),
  [100, 200, 300, 400, 500],
);
const patches: Record<string, number> = { high: 9.87654321, "equal-a": 3.2 };
assert.equal(steps.find((step) => step.id === "high")!.value, 7.12345678);
assert.equal(patches[steps.at(-1)!.id], 9.87654321);
assert.equal(steps.at(-1)!.oppositeValue, 8.23456789);
console.log("Color scale editor checks passed.");
