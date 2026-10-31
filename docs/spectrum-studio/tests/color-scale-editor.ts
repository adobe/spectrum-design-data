// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { applyStopPatch } from "../src/features/color-system/paletteReferences";
import {
  contrastStepIndex,
  sortContrastSteps,
} from "../src/features/color-system/contrastSteps";
import type {
  ColorScale,
  PaletteColor,
} from "../src/features/color-system/model";
import { STANDARD_SCALE_NAMING_RULE } from "../src/features/logic/scaleNaming";
import { isGradientDragIntentional } from "../src/components/color-picker/gradientStopPositions";

for (const movement of [0, 1, -1, 5.99, -5.99])
  assert.equal(isGradientDragIntentional("mouse", 100, 100 + movement), false);
for (const movement of [6, -6, 20, -20])
  assert.equal(isGradientDragIntentional("mouse", 100, 100 + movement), true);
for (const pointerType of ["touch", "pen"])
  assert.equal(isGradientDragIntentional(pointerType, 100, 101), true);

const palette: PaletteColor[] = [
  { id: "brand", name: "Brand", lightness: 0.6, hue: 140, chroma: 30 },
];
const stop = {
  id: "stop",
  paletteColorId: "brand",
  lightness: 0.1,
  hue: 20,
  chroma: 10,
};
const channels = { lightness: 0.54321, hue: 142.234, chroma: 21.987 };
assert.deepEqual(applyStopPatch(stop, channels, palette), {
  id: stop.id,
  ...channels,
});
assert.equal(
  stop.paletteColorId,
  "brand",
  "Detaching must not mutate the source.",
);
assert.deepEqual(
  applyStopPatch(stop, { lightness: 0.5 }, palette),
  { id: stop.id, lightness: 0.5, hue: 140, chroma: 30 },
  "Partial literal edits start from the displayed palette value.",
);
assert.deepEqual(palette[0], {
  id: "brand",
  name: "Brand",
  lightness: 0.6,
  hue: 140,
  chroma: 30,
});

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
