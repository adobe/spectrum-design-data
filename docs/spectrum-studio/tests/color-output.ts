// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import Color from "colorjs.io";
import {
  COLOR_FORMATS,
  COLOR_GAMUTS,
  DEFAULT_COLOR_OUTPUT,
  isColorOutputSettings,
  isFormatAvailable,
  migrateLegacyColorOutput,
  outputGamut,
  updateColorOutputSettings,
  type ColorOutputSettings,
} from "../src/features/color-system/outputSettings";
import { serializeOutputColor } from "../src/features/color-system/outputSerialization";
import {
  convertLinearGamut,
  gamutClamp,
  linearToXyzD65,
  luminance,
  toGamma,
  toLinear,
  xyzD65ToLinear,
} from "../src/features/color-system/colorMath";
import { createColorDefaults } from "../src/data/defaults";
import {
  buildRamp,
  scaleHueChromaAt,
} from "../src/features/color-system/scaleGeneration";
import {
  MAX_CHROMA,
  paletteColorLinear,
} from "../src/features/color-system/paletteValue";

const defaults = createColorDefaults();
for (const authoringGamut of COLOR_GAMUTS)
  for (const outputFormat of COLOR_FORMATS) {
    const settings: ColorOutputSettings = {
      authoringGamut,
      outputFormat,
      mapOutputsToSrgb: false,
    };
    if (!isColorOutputSettings(settings)) continue;
    for (const scale of defaults.scales)
      for (const sample of buildRamp(scale, settings)) {
        const { hue, chroma } = scaleHueChromaAt(scale.stops, sample.lightness);
        assert.deepEqual(
          sample.linear,
          gamutClamp(
            sample.lightness,
            (chroma / 100) * MAX_CHROMA,
            hue,
            authoringGamut,
          ),
          "Formatting must not replace the existing native-gamut ramp algorithm.",
        );
      }
    for (const color of defaults.palette) {
      assert.deepEqual(
        paletteColorLinear(color, settings),
        gamutClamp(
          color.lightness,
          (color.chroma / 100) * MAX_CHROMA,
          color.hue,
          authoringGamut,
        ),
        "Formatting must not replace the existing native-gamut palette algorithm.",
      );
    }
  }
for (const authoringGamut of ["display-p3", "rec2020"] as const) {
  const settings: ColorOutputSettings = {
    authoringGamut,
    outputFormat: "hex",
    mapOutputsToSrgb: true,
  };
  for (const scale of defaults.scales)
    for (const sample of buildRamp(scale, settings)) {
      const { hue, chroma } = scaleHueChromaAt(scale.stops, sample.lightness);
      assert.deepEqual(
        sample.linear,
        gamutClamp(
          sample.lightness,
          (chroma / 100) * MAX_CHROMA,
          hue,
          "srgb",
          true,
        ),
        "Explicit wide-to-sRGB output mapping uses the pinned appearance-preserving algorithm.",
      );
    }
}
for (const gamut of COLOR_GAMUTS) {
  assert.deepEqual(gamutClamp(0, 0.5, 140, gamut), [0, 0, 0]);
  assert.deepEqual(gamutClamp(1, 0.5, 140, gamut), [1, 1, 1]);
}

for (const authoringGamut of COLOR_GAMUTS)
  for (const mapOutputsToSrgb of [false, true])
    for (const outputFormat of COLOR_FORMATS) {
      const settings: ColorOutputSettings = {
        authoringGamut,
        mapOutputsToSrgb,
        outputFormat,
      };
      const available =
        authoringGamut === "srgb" ||
        mapOutputsToSrgb ||
        outputFormat === "rgb" ||
        outputFormat === "oklch";
      assert.equal(isColorOutputSettings(settings), available);
      assert.equal(isFormatAvailable(settings, outputFormat), available);
      assert.equal(
        outputGamut(settings),
        mapOutputsToSrgb ? "srgb" : authoringGamut,
      );
      if (!available) {
        assert.throws(
          () => serializeOutputColor(new Color("#fff"), settings),
          /Invalid color output/,
        );
        continue;
      }
      for (const input of [
        "#000000",
        "#ffffff",
        "#168bc4",
        "color(display-p3 0 1 0)",
        "color(rec2020 1 0 0)",
        "rgb(20 40 60 / 0.5)",
      ]) {
        const original = new Color(input);
        const before = original.toString({ inGamut: false, precision: 15 });
        const serialized = serializeOutputColor(original, settings);
        const parsed = new Color(serialized);
        assert(
          parsed.inGamut(
            outputGamut(settings) === "display-p3"
              ? "p3"
              : outputGamut(settings),
            { epsilon: 1e-8 },
          ),
          serialized,
        );
        assert.equal(
          original.toString({ inGamut: false, precision: 15 }),
          before,
          "Output mapping never mutates an authored color.",
        );
        assert(
          Math.abs(Number(parsed.alpha) - Number(original.alpha)) <=
            (outputFormat === "hex" ? 1 / 255 : 1e-10),
        );
      }
    }
assert.deepEqual(migrateLegacyColorOutput("srgb"), DEFAULT_COLOR_OUTPUT);
assert.equal(migrateLegacyColorOutput("oklch").authoringGamut, "srgb");
assert.equal(migrateLegacyColorOutput("oklch").outputFormat, "oklch");
assert.throws(() => migrateLegacyColorOutput("unknown"), /Unsupported legacy/);
assert.equal(
  isColorOutputSettings({ ...DEFAULT_COLOR_OUTPUT, extra: true }),
  false,
);
assert.equal(
  isColorOutputSettings({ ...DEFAULT_COLOR_OUTPUT, authoringGamut: "oklch" }),
  false,
);
const changed = updateColorOutputSettings(
  { ...DEFAULT_COLOR_OUTPUT },
  { authoringGamut: "rec2020" },
);
assert.equal(changed.settings.outputFormat, "rgb");
assert.match(changed.message!, /changed to RGB/);
assert.throws(
  () => updateColorOutputSettings(changed.settings, { outputFormat: "hex" }),
  /requires sRGB/,
);
const masked = updateColorOutputSettings(changed.settings, {
  mapOutputsToSrgb: true,
  outputFormat: "hex",
});
assert.equal(masked.settings.authoringGamut, "rec2020");
assert.equal(outputGamut(masked.settings), "srgb");
assert.equal(
  serializeOutputColor(new Color("#000"), {
    ...DEFAULT_COLOR_OUTPUT,
    outputFormat: "rgb",
  }),
  "rgb(0 0 0)",
);
assert.equal(
  serializeOutputColor(new Color("#fff"), {
    ...DEFAULT_COLOR_OUTPUT,
    outputFormat: "hex",
  }),
  "#ffffff",
);
assert.equal(
  serializeOutputColor(new Color("#000"), {
    ...DEFAULT_COLOR_OUTPUT,
    outputFormat: "hsl",
  }),
  "hsl(0 0% 0%)",
);
for (const gamut of COLOR_GAMUTS) {
  const space = gamut === "display-p3" ? "p3" : gamut;
  for (const channels of [
    [0, 0, 0],
    [1, 1, 1],
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
    [0.15, 0.5, 0.8],
  ] as const) {
    const reference = new Color(`${space}-linear`, [...channels]).to(
      "xyz-d65",
    ).coords;
    const actual = linearToXyzD65(channels, gamut);
    actual.forEach((value, index) =>
      assert(
        Math.abs(value - Number(reference[index])) < 2e-4,
        `${gamut} XYZ channel ${index}: ${value} versus ${reference[index]}`,
      ),
    );
    const restored = xyzD65ToLinear(actual, gamut);
    restored.forEach((value, index) =>
      assert(Math.abs(value - channels[index]) < 2e-4),
    );
    assert(Math.abs(luminance(channels, gamut) - Number(reference[1])) < 5e-5);
    const srgb = convertLinearGamut(channels, gamut, "srgb");
    const roundtrip = convertLinearGamut(srgb, "srgb", gamut);
    roundtrip.forEach((value, index) =>
      assert(Math.abs(value - channels[index]) < 2e-4),
    );
  }
  for (const channel of [-0.1, 0, 0.01, 0.018053968510807, 0.1, 0.5, 1]) {
    assert(
      Math.abs(toLinear(toGamma(channel, gamut), gamut) - channel) < 1e-10,
    );
  }
}
console.log(
  "Color output: format/gamut matrix, atomic transitions, legacy semantics, CSS syntax, alpha and source preservation passed.",
);
