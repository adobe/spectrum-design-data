// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import { COLOR_SYSTEM_DEFAULTS } from "../src/features/color-system/defaults";
import { buildColorLibrary } from "../src/features/color-system/cssLibrary";
import {
  contrastRatio,
  convertLinearGamut,
  hexToLinear,
  luminance,
} from "../src/features/color-system/colorMath";
import { hydrateColorSystem } from "../src/features/color-system/model";
import { generateColors } from "../src/features/color-system/dynamicGeneration";
import {
  buildScaleData,
  resolveScaleColorAtLightness,
} from "../src/features/color-system/scaleGeneration";
import { surfaceLinear } from "../src/features/color-system/surfaceGeneration";

const document = hydrateColorSystem(COLOR_SYSTEM_DEFAULTS);

if (document.settings.extOffset !== 0.36 || document.settings.extSteep !== -1) {
  throw new Error(
    "Color generation defaults must use 0.36 background blend and -1 source curve offset",
  );
}
const scaleData = document.scales.map((scale) => buildScaleData(scale));
const backgroundScale = document.scales.find(
  (scale) => scale.id === document.backgroundScaleId,
)!;
const backgroundAtBlack = resolveScaleColorAtLightness(
  backgroundScale,
  0,
  "srgb",
);
const backgroundAtWhite = resolveScaleColorAtLightness(
  backgroundScale,
  1,
  "srgb",
);
assert.ok(backgroundAtBlack.lightness === 0);
assert.ok(backgroundAtWhite.lightness === 1);
assert.equal(document.backgroundScaleId, document.scales[0].id);
assert.equal(document.backgroundLightness, 1);

const start = performance.now();
let css = "";
for (let iteration = 0; iteration < 10; iteration += 1) {
  css = buildColorLibrary(document);
}
const elapsedMs = performance.now() - start;
const averageBuildMs = elapsedMs / 10;

assert.match(css, /color\(from var\(--bg\) srgb-linear/);
assert.match(css, /--_luma/);
assert.match(css, /--_lsrc/);
assert.match(css, /\.surface-raised/);
assert.doesNotMatch(css, /--color-system-tint:\s*#/);
assert.ok(
  averageBuildMs < 250,
  `Average CSS generation exceeded 250ms: ${averageBuildMs.toFixed(1)}ms`,
);

const white = hexToLinear("#ffffff");
const targets = [1.06, 1.6, 4.79, 10];
for (const data of scaleData) {
  for (const target of targets) {
    const generated = generateColors(data, white, target, document.settings);
    assert.ok(Math.abs(generated.dynamic.measuredContrast - target) <= 0.02);
    const dynamicSource = generated.dynamic.linear.map(
      (channel, index) =>
        (channel - white[index] * (1 - generated.alpha)) / generated.alpha,
    );
    generated.sourceLinear.forEach((channel, index) => {
      assert.ok(Math.abs(channel - dynamicSource[index]) <= 1e-9);
      assert.ok(Math.abs(channel - generated.sourceLinear[index]) <= 1e-9);
    });
    const transparentSource = hexToLinear(generated.transparent.sourceHex);
    const sourceInSrgb = convertLinearGamut(
      generated.sourceLinear,
      data.gamut,
      "srgb",
    );
    sourceInSrgb.forEach((channel, index) => {
      assert.ok(Math.abs(channel - transparentSource[index]) <= 0.01);
    });
  }
}

const raised = document.surfaces.find((surface) => surface.name === "raised")!;
const floatingSurface = document.surfaces.find(
  (surface) => surface.name === "Floating surface",
)!;
assert(
  floatingSurface,
  "Hydrated input defaults include the renamed Floating surface.",
);
const info = document.surfaces.find((surface) => surface.name === "info")!;
const ratioAgainstReference = (surface: typeof raised) => {
  const reference =
    surface.reference === "base" ? hexToLinear(document.background) : white;
  return contrastRatio(
    luminance(surfaceLinear(surface, document, white)),
    luminance(reference),
  );
};
assert.ok(Math.abs(ratioAgainstReference(raised) - 1.1) <= 0.03);
assert.ok(Math.abs(ratioAgainstReference(info) - 1.15) <= 0.03);
assert.ok(ratioAgainstReference(floatingSurface) >= 1);

console.log(
  JSON.stringify(
    {
      averageBuildMs: Number(averageBuildMs.toFixed(2)),
      cssLength: css.length,
      scales: document.scales.length,
      contrasts: document.contrasts.length,
      surfaceRatios: {
        raised: ratioAgainstReference(raised),
        floatingSurface: ratioAgainstReference(floatingSurface),
        info: ratioAgainstReference(info),
      },
    },
    null,
    2,
  ),
);
