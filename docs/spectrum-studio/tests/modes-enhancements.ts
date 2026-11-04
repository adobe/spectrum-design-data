// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import {
  modeAdjustmentRows,
  modeSetDraftHasChanges,
  modeSetFoundationSelection,
  modeSetPreviewFoundation,
  previewContrastIndices,
  typographyPreviewPositions,
} from "../src/features/modes/presentation";
import { createDefaultSnapshot } from "../src/features/edit-session/state";

const snapshot = createDefaultSnapshot();
const colorScheme = snapshot.modeSets.find((set) => set.key === "colorScheme")!;
assert.equal(modeSetPreviewFoundation(colorScheme), "color");
assert.deepEqual(
  modeSetFoundationSelection(colorScheme, ["color"], "opacity"),
  ["color", "opacity", "elevation"],
);
assert.equal(
  modeSetPreviewFoundation(
    { ...colorScheme, authoringCapabilities: ["elevation.depth"] },
    ["typography"],
  ),
  "typography",
);
assert.deepEqual(previewContrastIndices(11), [4, 5, 6]);
assert.deepEqual(previewContrastIndices(4), [1, 2, 3]);
assert.deepEqual(typographyPreviewPositions([-3, -2, -1, 0, 1, 2]), [-1, 0, 1]);
assert.deepEqual(typographyPreviewPositions([-1, 0, 1]), [-1, 0, 1]);
const baselineDraft = {
  modeSet: colorScheme,
  foundations: ["color", "opacity"] as const,
  adaptiveParameterIds: ["color.contrastMultiplier"] as const,
  polarityCompensation: 0.2,
};
assert.equal(
  modeSetDraftHasChanges(baselineDraft, {
    ...baselineDraft,
    foundations: ["opacity", "color"],
  }),
  false,
  "Draft foundations compare as a set.",
);
assert.equal(
  modeSetDraftHasChanges(baselineDraft, {
    ...baselineDraft,
    polarityCompensation: 0.3,
  }),
  true,
);

const wireframe = colorScheme.modes.find((mode) => mode.key === "wireframe")!;
const light = colorScheme.modes.find((mode) => mode.key === "light")!;
assert.deepEqual(
  modeAdjustmentRows(light, colorScheme).map(({ label, value }) => [
    label,
    value,
  ]),
  [],
);
assert.deepEqual(
  modeAdjustmentRows(wireframe, colorScheme).map(({ label, value }) => [
    label,
    value,
  ]),
  [["Color", "#486ec2"]],
);
const noAdjustmentSet = {
  ...colorScheme,
  modes: colorScheme.modes.map((mode) => ({
    ...mode,
    foundations: {
      color: {
        scaleAdjustment: { method: "relative" as const, hue: 10 },
      },
    },
  })),
};
assert.deepEqual(
  modeAdjustmentRows(noAdjustmentSet.modes[0], noAdjustmentSet),
  [],
);
const relativeSet = structuredClone(colorScheme);
relativeSet.modes[1].foundations.color = {
  scaleAdjustment: { method: "relative", hue: 20, chroma: 0 },
};
assert.deepEqual(
  modeAdjustmentRows(relativeSet.modes[1], relativeSet).map(
    ({ label, value }) => [label, value],
  ),
  [
    ["Hue", "+20°"],
    ["Saturation", "0%"],
  ],
);
assert.match(
  modeAdjustmentRows(wireframe, colorScheme, {
    authoringGamut: "srgb",
    outputFormat: "hex",
    mapOutputsToSrgb: false,
  })[0].value,
  /^#486ec2$/,
);
assert.equal(
  modeAdjustmentRows(wireframe, colorScheme, {
    authoringGamut: "srgb",
    outputFormat: "rgb",
    mapOutputsToSrgb: false,
  })[0].value,
  "rgb(72, 110, 194)",
);

console.log("Mode previews and differing parameter presentation pass.");
