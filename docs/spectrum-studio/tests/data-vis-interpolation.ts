// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import Color from "colorjs.io";
import {
  compileContinuousScale,
  continuousSamples,
} from "../src/features/color-system/data-vis/continuous";
import type { ResolvedDataVisPoint } from "../src/features/color-system/data-vis/resolution";

const point = (
  id: string,
  position: number,
  value: string,
): ResolvedDataVisPoint => ({
  id,
  position,
  value,
  source: { kind: "primitive-token", tokenId: id },
  actualContrast: 1,
  manuallyOverridden: false,
});
function sequence(first: string, second: string) {
  return compileContinuousScale(
    { id: "sequence", kind: "sequential" },
    [point("start", 0, first), point("end", 1, second)],
    "oklch",
  );
}
function assertColor(
  value: string,
  lightness: number,
  chroma: number,
  hue: number,
  alpha = 1,
) {
  const color = new Color(value).to("oklch");
  assert.ok(
    Math.abs(Number(color.coords[0]) - lightness) < 0.000002,
    `Unexpected lightness: ${value}`,
  );
  assert.ok(
    Math.abs(Number(color.coords[1]) - chroma) < 0.000002,
    `Unexpected chroma: ${value}`,
  );
  if (chroma >= 0.000004) {
    assert.ok(
      Math.abs(((Number(color.coords[2]) - hue + 540) % 360) - 180) < 0.0002,
      `Unexpected hue: ${value}`,
    );
  }
  assert.ok(Math.abs(color.alpha - alpha) < 0.000002);
}

const colorful = sequence("oklch(0.6 0.08 20)", "oklch(0.8 0.08 100)");
for (const position of [0.125, 0.25, 0.5, 0.75, 0.875]) {
  assertColor(
    colorful.evaluate(position),
    0.6 + 0.2 * position,
    0.08,
    20 + 80 * position,
  );
}
assert.equal(colorful.evaluate(0), "oklch(0.6 0.08 20)");
assert.equal(colorful.evaluate(1), "oklch(0.8 0.08 100)");
for (const [first, second] of [
  [350, 10],
  [10, 350],
]) {
  assertColor(
    sequence(`oklch(0.7 0.08 ${first})`, `oklch(0.7 0.08 ${second})`).evaluate(
      0.5,
    ),
    0.7,
    0.08,
    0,
  );
}
assertColor(
  sequence("oklch(0.6 0 0)", "oklch(0.8 0.08 300)").evaluate(0.5),
  0.7,
  0.04,
  300,
);
assertColor(
  sequence("oklch(0.8 0.08 300)", "oklch(0.6 0 0)").evaluate(0.5),
  0.7,
  0.04,
  300,
);
assertColor(
  sequence("oklch(0.6 0 0)", "oklch(0.8 0 0)").evaluate(0.5),
  0.7,
  0,
  0,
);
assertColor(
  sequence("oklch(0.4 0.04 350 / 0.25)", "oklch(0.8 0.08 10 / 0.75)").evaluate(
    0.5,
  ),
  0.7,
  0.07,
  0,
  0.5,
);
assert.equal(
  sequence("rgb(255 0 0 / 0)", "rgb(0 0 255 / 0)").evaluate(0.5),
  "oklch(0% 0% 0 / 0)",
);

const positions = [
  point("start", 0, "oklch(0.2 0.03 200)"),
  point("middle", 0.25, "oklch(0.4 0.06 220)"),
  point("end", 1, "oklch(0.8 0.09 280)"),
];
const before = structuredClone(positions);
const piecewise = compileContinuousScale(
  { id: "piecewise", kind: "sequential" },
  positions,
  "oklch",
);
assert.equal(piecewise.evaluate(0.25), positions[1].value);
assertColor(piecewise.evaluate(0.625), 0.6, 0.075, 250);
continuousSamples(piecewise, 65);
assert.deepEqual(
  positions,
  before,
  "Sampling/interpolation cannot modify authored stops or identities.",
);

const diverging = compileContinuousScale(
  { id: "diverging", kind: "diverging" },
  [
    point("left", 0, "oklch(0.6 0.08 20)"),
    point("center", 0.5, "oklch(0.8 0.08 100)"),
    point("right", 1, "oklch(0.6 0.08 20)"),
  ],
  "oklch",
);
assertColor(diverging.evaluate(0.25), 0.7, 0.06128, 60);
assert.equal(diverging.evaluate(0.5), "oklch(0.8 0.08 100)");
for (const output of ["srgb", "display-p3", "oklch"] as const) {
  const wide = compileContinuousScale(
    { id: "wide", kind: "sequential" },
    [
      point("start", 0, "color(display-p3 1 0 0 / 0.4)"),
      point("end", 1, "color(display-p3 0 0 1 / 0.8)"),
    ],
    output,
  );
  assert.equal(wide.evaluate(0), "color(display-p3 1 0 0 / 0.4)");
  for (const position of [0.1, 0.5, 0.9]) {
    const value = wide.evaluate(position),
      color = new Color(value);
    assert.ok(
      color.coords.every((channel) => Number.isFinite(Number(channel))),
    );
    assert.ok(
      color.inGamut(output === "display-p3" ? "p3" : "srgb", {
        epsilon: 0.000001,
      }),
      `${output} sample at ${position} escaped the output gamut: ${value}`,
    );
    const alpha = 0.4 + 0.4 * position;
    const expectedAlpha =
      output === "srgb"
        ? Math.round(alpha * 255) / 255
        : Number(alpha.toFixed(2));
    assert.ok(Math.abs(color.alpha - expectedAlpha) < 1e-10);
  }
}
console.log(
  "Data vis interpolation: sequential OKLCh, shorter hue, neutral/alpha handling, piecewise sampling, gamut bounds and unchanged diverging OKLab passed.",
);
