// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import Color from "colorjs.io";
import {
  colorJsSpace,
  outputGamut,
  type ColorOutputSettings,
} from "../src/features/color-system/outputSettings";
import {
  serializeLinearOutputColor,
  serializeOutputColor,
} from "../src/features/color-system/outputSerialization";
import {
  contrastRatio,
  luminance,
  mapLinearRgb,
  outputColorCss,
  toGamma,
  toLinear,
  type LinearRgb,
  type RgbGamut,
} from "../src/features/color-system/colorMath";
import {
  enforceOutputContrast,
  parsedOutputLinear,
  renderedOutputLinear,
} from "../src/features/color-system/outputContrast";

function uncachedContrast(
  candidate: LinearRgb,
  background: string,
  target: number,
  settings: ColorOutputSettings,
  dark: boolean,
) {
  const gamut = outputGamut(settings);
  const evaluate = (linear: LinearRgb) => {
    const css = serializeOutputColor(
      new Color(`${colorJsSpace(gamut)}-linear`, [...linear]),
      settings,
    );
    return {
      css,
      linear: uncachedLinear(css, gamut),
      measuredContrast: contrastRatio(
        luminance(uncachedRendered(css, background, gamut), gamut),
        luminance(uncachedLinear(background, gamut), gamut),
      ),
    };
  };
  const initial = evaluate(candidate);
  if (initial.measuredContrast >= target) return initial;
  const endpoint: LinearRgb = dark ? [0, 0, 0] : [1, 1, 1];
  let best = evaluate(endpoint),
    low = 0,
    high = 1;
  assert.ok(best.measuredContrast >= target);
  for (let iteration = 0; iteration < 46; iteration++) {
    const fraction = (low + high) / 2;
    const result = evaluate(
      mapLinearRgb(
        candidate,
        (channel, index) => channel + fraction * (endpoint[index] - channel),
      ),
    );
    if (result.measuredContrast >= target) {
      high = fraction;
      best = result;
    } else low = fraction;
  }
  return best;
}

function uncachedLinear(css: string, gamut: RgbGamut): LinearRgb {
  const parsed = new Color(css);
  if (parsed.space.id === "oklch" && Number(parsed.coords[1]) === 0) {
    const neutral = Number(parsed.coords[0]) ** 3;
    return [neutral, neutral, neutral];
  }
  const values = parsed.to(`${colorJsSpace(gamut)}-linear`).coords.map(Number);
  return [values[0], values[1], values[2]];
}
function uncachedRendered(
  css: string,
  backgroundCss: string,
  gamut: RgbGamut,
): LinearRgb {
  const foreground = new Color(css),
    background = new Color(backgroundCss);
  const encoded = (color: Color) => {
    if (color.space.id === "oklch" && Number(color.coords[1]) === 0) {
      const neutral = toGamma(Number(color.coords[0]) ** 3, gamut);
      return [neutral, neutral, neutral];
    }
    return color.to(colorJsSpace(gamut)).coords.map(Number);
  };
  const fg = encoded(foreground),
    bg = encoded(background);
  const channels = fg.map(
    (value, index) =>
      value * Number(foreground.alpha) +
      bg[index] * (1 - Number(foreground.alpha)),
  );
  return [
    toLinear(channels[0], gamut),
    toLinear(channels[1], gamut),
    toLinear(channels[2], gamut),
  ];
}
for (const gamut of ["srgb", "display-p3", "rec2020"] as const) {
  for (const css of [
    "#fe3491",
    "rgb(15 25 35 / 0.17)",
    "rgb(15 25 35 / -1)",
    "rgb(15 25 35 / 3)",
    "hsl(280 70% 40%)",
    "lab(50% 20 30)",
    "lch(50% 20 200)",
    "hwb(60 20% 30%)",
    "oklch(0.6 0.12 200)",
    "oklch(0.8 0 none)",
    "color(srgb-linear 0.5 0.2 0.1)",
    "color(display-p3 0.2 1 0.3)",
    "color(rec2020 0.8 0.1 0.3)",
  ]) {
    const expected = uncachedLinear(css, gamut),
      composited = uncachedRendered(css, "#abcdef", gamut);
    for (let repeat = 0; repeat < 3; repeat++) {
      assert.deepEqual(parsedOutputLinear(css, gamut), expected);
      assert.deepEqual(renderedOutputLinear(css, "#abcdef", gamut), composited);
    }
    const mutable = parsedOutputLinear(css, gamut);
    mutable[0] = 999;
    assert.deepEqual(
      parsedOutputLinear(css, gamut),
      expected,
      "Returned coordinates cannot corrupt reuse.",
    );
  }
}
const original = Color.Space.prototype.to;
let conversions = 0;
Color.Space.prototype.to = new Proxy(original, {
  apply(target, receiver, args) {
    conversions += 1;
    return Reflect.apply(target, receiver, args);
  },
});
try {
  const css = "rgb(13.37% 22.09% 70.002%)";
  parsedOutputLinear(css, "srgb");
  renderedOutputLinear(css, "#abcdef", "srgb");
  const initial = conversions;
  for (let index = 0; index < 100; index++) {
    parsedOutputLinear(css, "srgb");
    renderedOutputLinear(css, "#abcdef", "srgb");
  }
  assert.equal(
    conversions,
    initial,
    "Identical immutable strings reuse both conversion paths.",
  );
  for (let index = 0; index < 5000; index++)
    parsedOutputLinear(`#${index.toString(16).padStart(6, "0")}`, "srgb");
  const afterEviction = conversions;
  assert.deepEqual(
    parsedOutputLinear(css, "srgb"),
    uncachedLinear(css, "srgb"),
  );
  assert(
    conversions > afterEviction + 1,
    "Evicted colors are recomputed exactly.",
  );
  const oversized = `${" ".repeat(600)}#123456`;
  assert.deepEqual(
    parsedOutputLinear(oversized, "srgb"),
    uncachedLinear(oversized, "srgb"),
  );
  const beforeOversized = conversions;
  parsedOutputLinear(oversized, "srgb");
  assert.equal(
    conversions,
    beforeOversized + 1,
    "Oversized inputs bypass storage.",
  );
} finally {
  Color.Space.prototype.to = original;
}
for (let repeat = 0; repeat < 2; repeat++) {
  assert.throws(() => parsedOutputLinear("not-a-color", "srgb"));
  assert.throws(
    () => renderedOutputLinear("#fff", "rgb(0 0 0 / 0.5)", "srgb"),
    /opaque/,
  );
  assert.throws(
    () => renderedOutputLinear("rgb(0 0 0 / none)", "#fff", "srgb"),
    /invalid opacity/,
  );
  assert.throws(
    () => renderedOutputLinear("rgb(none 0 0)", "#fff", "srgb"),
    /Cannot measure/,
  );
}

for (const authoringGamut of ["srgb", "display-p3", "rec2020"] as const) {
  for (const outputFormat of ["hex", "rgb", "hsl", "oklch"] as const) {
    for (const mapOutputsToSrgb of [false, true]) {
      if (
        !mapOutputsToSrgb &&
        authoringGamut !== "srgb" &&
        (outputFormat === "hex" || outputFormat === "hsl")
      )
        continue;
      const settings: ColorOutputSettings = {
        authoringGamut,
        outputFormat,
        mapOutputsToSrgb,
      };
      const space = colorJsSpace(outputGamut(settings));
      const candidates: LinearRgb[] = [
        [0, 0, 0],
        [1, 1, 1],
        [-0, 0, 1],
        [-0.001, 0.5, 1.1],
      ];
      let state = 43;
      for (let index = 0; index < 200; index++) {
        const next = () => {
          state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
          return state / 2 ** 32;
        };
        candidates.push([next(), next(), next()]);
      }
      for (let channel = 0; channel < 255; channel++) {
        const value = Color.Space.get(space).to(`${space}-linear`, [
          (channel + 0.5) / 255,
          0.5,
          0.5,
        ]);
        candidates.push([Number(value[0]), Number(value[1]), Number(value[2])]);
      }
      for (const candidate of candidates) {
        const original = [...candidate];
        assert.equal(
          serializeLinearOutputColor(candidate, settings),
          serializeOutputColor(
            new Color(`${space}-linear`, [...candidate]),
            settings,
          ),
          `Linear serialization must be byte-identical: ${JSON.stringify({ settings, candidate })}`,
        );
        assert.equal(
          outputColorCss(candidate, settings, outputGamut(settings)),
          serializeOutputColor(
            new Color(`${space}-linear`, [...candidate]),
            settings,
          ),
        );
        assert.deepEqual(candidate, original);
      }
      for (const candidate of [
        [0.95, 0.8, 0.7],
        [0.01, 0.02, 0.03],
        [0.2, 0.4, 0.6],
      ] as const) {
        for (const dark of [false, true])
          for (const target of [1, 1.1, 3, 7]) {
            const background = dark ? "#ffffff" : "#000000";
            assert.deepEqual(
              enforceOutputContrast(
                candidate,
                background,
                target,
                settings,
                dark,
                "Parity",
              ),
              uncachedContrast(candidate, background, target, settings, dark),
            );
          }
      }
      for (const candidate of [
        [NaN, 0, 0],
        [0, Infinity, 0],
      ] as const) {
        assert.throws(
          () => serializeLinearOutputColor(candidate, settings),
          /unavailable channel/,
        );
      }
    }
  }
}

console.log(
  "Output color reuse: exact conversion/compositing/serialization, all gamuts, quantization boundaries, alpha, mutation safety, eviction and errors passed.",
);
