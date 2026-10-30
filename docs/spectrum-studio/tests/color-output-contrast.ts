// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import Color from "colorjs.io";
import {
  COLOR_FORMATS,
  COLOR_GAMUTS,
  DEFAULT_COLOR_OUTPUT,
  isFormatAvailable,
  outputGamut,
  type ColorOutputSettings,
} from "../src/features/color-system/outputSettings";
import { buildScaleData } from "../src/features/color-system/scaleGeneration";
import { generateColors } from "../src/features/color-system/dynamicGeneration";
import {
  ColorOutputError,
  measureOutputContrast,
  parsedOutputLinear,
} from "../src/features/color-system/outputContrast";
import { serializeOutputColor } from "../src/features/color-system/outputSerialization";
import {
  contrastRatio,
  luminance,
} from "../src/features/color-system/colorMath";
import type { ColorScale } from "../src/features/color-system/model";

const scale: ColorScale = {
  id: "output-reference",
  name: "Output reference",
  stops: [{ id: "key", lightness: 0.6, chroma: 90, hue: 150 }],
};
const source = JSON.stringify(scale);
let checks = 0;
for (const authoringGamut of COLOR_GAMUTS)
  for (const outputFormat of COLOR_FORMATS)
    for (const mapOutputsToSrgb of [false, true]) {
      const settings: ColorOutputSettings = {
        authoringGamut,
        outputFormat,
        mapOutputsToSrgb,
      };
      if (!isFormatAvailable(settings, outputFormat)) continue;
      const gamut = outputGamut(settings),
        data = buildScaleData(scale, settings);
      for (const css of ["#ffffff", "#000000", "oklch(0.6 0.16 40)"]) {
        const backgroundCss = serializeOutputColor(new Color(css), settings);
        const background = parsedOutputLinear(backgroundCss, gamut);
        for (const side of ["dark", "light"] as const)
          for (const target of [1, 1.05, 3, 4.5, 7, 21]) {
            const maximum = contrastRatio(
              side === "dark" ? 0 : 1,
              luminance(background, gamut),
            );
            const generate = () =>
              generateColors(data, background, target, {
                side,
                extOffset: 0.2,
                extSteep: 0.3,
              });
            const colors = generate();
            for (const variant of [
              colors.dynamic,
              colors.opaque,
              colors.transparent,
            ]) {
              const actual = measureOutputContrast(
                variant.css,
                backgroundCss,
                gamut,
              );
              if (target <= maximum) {
                assert(
                  actual >= target,
                  `${gamut}/${outputFormat}: ${variant.css} achieved ${actual}, requested ${target}`,
                );
              } else {
                // When target exceeds achievable contrast, return highest possible contrasting color
                assert(
                  Math.abs(actual - maximum) < 1e-3 || actual >= maximum,
                  `${gamut}/${outputFormat}: ${variant.css} achieved ${actual}, expected closest achievable ${maximum}`,
                );
              }
              assert(Math.abs(actual - variant.measuredContrast) < 1e-10);
              assert(
                new Color(variant.css).inGamut(
                  gamut === "display-p3" ? "p3" : gamut,
                  { epsilon: 1e-8 },
                ),
              );
              checks++;
            }
          }
      }
    }
assert.equal(JSON.stringify(scale), source);

// Verify that custom scale contrast stops (like Gray's 21:1 target) against #181818
// return the closest achievable contrast without throwing ColorOutputError.
const grayScale = {
  id: "scale-gray",
  name: "Gray",
  stops: [{ id: "key", lightness: 50, hue: 0, chroma: 0 }],
  customContrasts: {
    steps: [{ id: "step-1000", value: 21 }],
    baseContrastId: "step-1000",
    namingRuleId: "rule-standard-scale-naming",
  },
};
const grayData = buildScaleData(grayScale as any, DEFAULT_COLOR_OUTPUT);
const bg181818 = parsedOutputLinear("#181818", "srgb");
const grayOutput = generateColors(grayData, bg181818, 21, {
  side: "light",
  extOffset: 0.2,
  extSteep: 0.3,
});
assert.ok(grayOutput.opaque.css);
assert.equal(grayOutput.opaque.css, "rgb(255, 255, 255)");
const grayContrast = measureOutputContrast(
  grayOutput.opaque.css,
  "#181818",
  "srgb",
);
assert.ok(
  grayContrast > 17 && grayContrast < 18,
  `Expected ~17.76:1 contrast, got ${grayContrast}`,
);
assert.equal(grayOutput.opaque.measuredContrast, grayContrast);

console.log(
  `Color output: ${checks} final opaque/alpha contrasts meet feasible targets; impossible targets return closest achievable contrast and authored keys remain unchanged.`,
);
