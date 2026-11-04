// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import fs from "node:fs";
import Color from "colorjs.io";
import { createStore } from "jotai";
import {
  assertStoredSnapshot,
  cancelEditAtom,
  captureSnapshot,
  createDefaultSnapshot,
  editSessionSnapshotAtom,
  restoreAuthoringSnapshotAtom,
} from "../src/features/edit-session/state";
import { editModeAtom } from "../src/state/view/editMode";
import {
  colorSystemDocumentAtom,
  updateColorScaleInterpolationAtom,
} from "../src/features/color-system/state";
import {
  isColorSystemDocument,
  scaleInterpolation,
  type ColorScale,
} from "../src/features/color-system/model";
import { resolveColorDocument } from "../src/features/color-system/resolution";
import { buildScaleData } from "../src/features/color-system/scaleGeneration";
import { generateColors } from "../src/features/color-system/dynamicGeneration";
import { measureOutputContrast } from "../src/features/color-system/outputContrast";
import { buildColorLibrary } from "../src/features/color-system/cssLibrary";
import { colorFoundationParameters } from "../src/features/impact/sources/colorFoundation";
import { changeGroupsAtom } from "../src/features/changelog/state";
import {
  applyChangeResetPlanAtom,
  itemResetPlan,
} from "../src/features/changelog/resetPlans";

const original = createDefaultSnapshot();

assert.ok(
  original.colorSystem.scales.length > 0 &&
    original.colorSystem.scales.every(
      (scale) =>
        scale.interpolation === "rgb" && scaleInterpolation(scale) === "rgb",
    ),
  "Every shipped color scale explicitly uses RGB interpolation.",
);
assert.equal(
  scaleInterpolation({}),
  "oklch",
  "Existing saved scales without an interpolation setting keep OKLCh.",
);

const document = resolveColorDocument(original.colorSystem, [], undefined, {
  modeSets: original.modeSets,
});
const output = document.settings.colorOutput;
const cinnamon = document.scales.find((scale) => scale.name === "cinnamon")!;
const reference: string[] = JSON.parse(
  fs.readFileSync(
    new URL(
      "../../../packages/design-data/tokens/color-palette.tokens.json",
      import.meta.url,
    ),
    "utf8",
  ),
)
  .filter(
    (token: { name: { colorFamily?: string; colorScheme?: string } }) =>
      token.name.colorFamily === "cinnamon" &&
      token.name.colorScheme === "light",
  )
  .sort(
    (
      first: { name: { scaleIndex: number } },
      second: { name: { scaleIndex: number } },
    ) => first.name.scaleIndex - second.name.scaleIndex,
  )
  .map((token: { value: string }) => token.value);
assert.equal(reference.length, document.contrasts.length);

function cinnamonColors(scale: ColorScale) {
  const data = buildScaleData(scale, output);
  return document.contrasts.map(
    (contrast) =>
      generateColors(data, [1, 1, 1], contrast.value, document.settings).dynamic
        .css,
  );
}
function deltaStats(colors: string[]) {
  const deltas = colors.map((css, index) =>
    new Color(css).deltaE(new Color(reference[index]), "2000"),
  );
  return {
    mean: deltas.reduce((sum, value) => sum + value, 0) / deltas.length,
    max: Math.max(...deltas),
  };
}

// RGB interpolation brings Cinnamon close to the Leonardo-generated Design-Data values.
const oklchScale: ColorScale = { ...cinnamon, interpolation: "oklch" };
const oklch = deltaStats(cinnamonColors(oklchScale));
const rgbScale: ColorScale = { ...cinnamon, interpolation: "rgb" };
const rgbColors = cinnamonColors(rgbScale);
const rgb = deltaStats(rgbColors);
assert.ok(rgb.mean < 0.5, `RGB mean ΔE2000 ${rgb.mean}`);
assert.ok(rgb.max < 1.2, `RGB max ΔE2000 ${rgb.max}`);
assert.ok(rgb.mean < oklch.mean / 2, `RGB ${rgb.mean} vs OKLCh ${oklch.mean}`);

// Contrast targets still pass.
rgbColors.forEach((css, index) => {
  const target = document.contrasts[index].value;
  const measured = measureOutputContrast(css, "rgb(255 255 255)", "srgb");
  assert.ok(measured >= target - 0.01, `${css}: ${measured} < ${target}`);
});

// The RGB path passes through each key color exactly.
const rgbData = buildScaleData(rgbScale, output);
for (const stop of rgbScale.stops) {
  const key = new Color("oklch", [
    stop.lightness,
    (stop.chroma / 100) * 0.4,
    stop.hue,
  ])
    .to("srgb-linear")
    .coords.map(Number);
  assert.ok(
    rgbData.anchors.some((anchor) =>
      anchor.linear.every(
        (channel, index) => Math.abs(channel - key[index]) < 1e-3,
      ),
    ),
    `missing key anchor for stop ${stop.id}`,
  );
}
assert.ok(rgbData.anchors.length <= 16, "RGB anchors stay bounded");
assert.notDeepEqual(
  buildScaleData(oklchScale, output).anchors,
  rgbData.anchors,
  "cache distinguishes interpolation",
);

// Validation accepts the two supported values only.
assert.ok(
  isColorSystemDocument({
    ...original.colorSystem,
    scales: original.colorSystem.scales.map((scale) =>
      scale.id === cinnamon.id ? { ...scale, interpolation: "rgb" } : scale,
    ),
  }),
);
assert.ok(
  !isColorSystemDocument({
    ...original.colorSystem,
    scales: original.colorSystem.scales.map((scale) =>
      scale.id === cinnamon.id ? { ...scale, interpolation: "lab" } : scale,
    ),
  }),
);

// Editing, Changes, revert, and cancel.
const store = createStore();
store.set(restoreAuthoringSnapshotAtom, original);
store.set(editSessionSnapshotAtom, original);
store.set(editModeAtom, true);
const scale = () =>
  store
    .get(colorSystemDocumentAtom)
    .scales.find((item) => item.id === cinnamon.id)!;
const setInterpolation = (interpolation: "oklch" | "rgb") =>
  store.set(updateColorScaleInterpolationAtom, {
    scaleId: cinnamon.id,
    interpolation,
  });

setInterpolation("oklch");
assert.equal(scaleInterpolation(scale()), "oklch");
assert.deepEqual(
  store
    .get(colorSystemDocumentAtom)
    .scales.filter((item) => item.id !== cinnamon.id),
  original.colorSystem.scales.filter((item) => item.id !== cinnamon.id),
  "Changing one scale preserves every unrelated scale.",
);
const edited = structuredClone(captureSnapshot(store.get));
assertStoredSnapshot(edited);
store.set(restoreAuthoringSnapshotAtom, edited);
assert.equal(
  scaleInterpolation(scale()),
  "oklch",
  "Restore retains the saved interpolation.",
);
assert.ok(
  colorFoundationParameters(edited.colorSystem).some(
    (record) =>
      record.id === `scale/${cinnamon.id}/interpolation` && record.edited,
  ),
);
assert.notEqual(
  buildColorLibrary(edited.colorSystem, [], [], undefined, edited.rules),
  buildColorLibrary(original.colorSystem, [], [], undefined, original.rules),
  "CSS output follows the interpolation setting",
);
const change = store
  .get(changeGroupsAtom)
  .flatMap((group) => group.items)
  .find(
    (item) =>
      item.sourceKind === "scale" && item.id.includes(`"${cinnamon.id}"`),
  )!;
assert.ok(change.fields.some((field) => /interpolation/i.test(field.key)));
store.set(applyChangeResetPlanAtom, itemResetPlan(change));
assert.equal(scale().interpolation, "rgb");

setInterpolation("oklch");
assert.ok(!("interpolation" in scale()), "OKLCh is stored as the default");

store.set(cancelEditAtom);
assert.equal(scale().interpolation, "rgb");

console.log(
  `Color scale interpolation tests passed (Cinnamon RGB ΔE2000 mean ${rgb.mean.toFixed(2)}, max ${rgb.max.toFixed(2)}; OKLCh mean ${oklch.mean.toFixed(2)}).`,
);
