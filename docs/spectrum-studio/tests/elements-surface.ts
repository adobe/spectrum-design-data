// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { createStore } from "jotai";
import {
  elementsSurfaceStyle,
  elementsSurfaceStyleAtom,
} from "../src/state/view/elementsSurface";
import {
  colorSystemDocumentAtom,
  resolvedBackgroundAtom,
} from "../src/features/color-system/state";
import { luminance } from "../src/features/color-system/colorMath";
import { modeSetsAtom } from "../src/features/modes/state";
import { modeSelectionAtom } from "../src/features/modes/selection";
import { previewOverridesAtom } from "../src/features/modes/previewState";

assert.equal(
  elementsSurfaceStyle({ css: "#ffffff", linear: [1, 1, 1], gamut: "srgb" })
    .color,
  "#000000",
);
assert.equal(
  elementsSurfaceStyle({ css: "#000000", linear: [0, 0, 0], gamut: "srgb" })
    .color,
  "#ffffff",
);

const store = createStore();
const base = structuredClone(store.get(colorSystemDocumentAtom));
const modes = structuredClone(store.get(modeSetsAtom));
const lightStyle = store.get(elementsSurfaceStyleAtom);
assert.equal(lightStyle.backgroundColor, store.get(resolvedBackgroundAtom).css);
store.set(modeSelectionAtom, { colorScheme: "mode-dark" });
const darkStyle = store.get(elementsSurfaceStyleAtom);
assert.notEqual(darkStyle.backgroundColor, lightStyle.backgroundColor);
assert.equal(darkStyle.color, "#ffffff");
assert.equal(darkStyle["--elements-preview-foreground"], darkStyle.color);
assert.equal(darkStyle["--elements-preview-divider"], "rgb(255 255 255 / 20%)");
store.set(modeSelectionAtom, {});
assert.deepEqual(store.get(elementsSurfaceStyleAtom), lightStyle);

for (const outputGamut of ["srgb", "display-p3", "oklch"] as const) {
  store.set(colorSystemDocumentAtom, {
    ...structuredClone(base),
    backgroundLightness: 0.6,
    backgroundScaleId: base.scales.find((scale) => scale.name === "Red")!.id,
    settings: { ...base.settings, outputGamut },
  });
  const authored = structuredClone(store.get(colorSystemDocumentAtom));
  store.set(previewOverridesAtom, { "color.backgroundLightness": 0.15 });
  const background = store.get(resolvedBackgroundAtom);
  const style = store.get(elementsSurfaceStyleAtom);
  assert.equal(
    style.backgroundColor,
    background.css,
    `${outputGamut} retains the generator's CSS format.`,
  );
  const contrast =
    style.color === "#000000"
      ? (luminance(background.linear, background.gamut) + 0.05) / 0.05
      : 1.05 / (luminance(background.linear, background.gamut) + 0.05);
  assert(
    contrast >= 4.5,
    "Foreground selection follows the actual background.",
  );
  assert.deepEqual(
    store.get(colorSystemDocumentAtom),
    authored,
    "Reading a preview does not save changes.",
  );
}
store.set(previewOverridesAtom, {});
store.set(colorSystemDocumentAtom, {
  ...structuredClone(base),
  backgroundLightness: 0.35,
});
store.set(modeSelectionAtom, { colorScheme: "mode-dark" });
store.set(
  modeSetsAtom,
  modes.filter((set) => set.key !== "colorScheme"),
);
const fallback = store.get(elementsSurfaceStyleAtom);
assert.equal(fallback.backgroundColor, store.get(resolvedBackgroundAtom).css);
store.set(modeSelectionAtom, {});
assert.deepEqual(
  store.get(elementsSurfaceStyleAtom),
  fallback,
  "A stale color choice cannot replace the authored default.",
);
store.set(modeSetsAtom, []);
assert.deepEqual(
  store.get(elementsSurfaceStyleAtom),
  fallback,
  "No mode sets still uses the authored background.",
);

store.set(
  modeSetsAtom,
  modes.map((set) => ({
    ...set,
    authoringCapabilities: set.authoringCapabilities?.filter(
      (capability) => !capability.startsWith("color."),
    ),
  })),
);
store.set(modeSelectionAtom, { colorScheme: "mode-dark" });
assert.deepEqual(
  store.get(elementsSurfaceStyleAtom),
  fallback,
  "Modes without color ownership cannot apply stale background patches.",
);

console.log(
  "Elements surface background, contrast, gamut, preview and no-color-mode checks passed.",
);
