// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import {
  checkerboardColors,
  checkerboardSurfaceStyle,
  contrastingLightness,
} from "../src/features/color-system/previewSurface";
import { concreteColor } from "../src/features/color-system/data-vis/colors";
import { DEFAULT_COLOR_OUTPUT } from "../src/features/color-system/outputSettings";

assert.equal(contrastingLightness(0.5), 0.4);
assert.equal(contrastingLightness(0), 0.1);
assert.equal(contrastingLightness(1), 0.9);
assert.equal(contrastingLightness(0.49), 0.59);
for (const lightness of [-1, 2, Number.NaN, Number.POSITIVE_INFINITY])
  assert.throws(() => contrastingLightness(lightness), /between 0 and 1/);

const settings = { ...DEFAULT_COLOR_OUTPUT, outputFormat: "oklch" as const };
for (const background of [
  "#fff",
  "#000",
  "oklch(0.49 0 0)",
  "oklch(0.5 0 0)",
  "oklch(0.8 0.06 240)",
  "oklch(0.2 0.02 120)",
]) {
  const colors = checkerboardColors(background, settings);
  assert.equal(colors.background, background);
  const base = concreteColor(background).to("oklch");
  const alternate = concreteColor(colors.alternate).to("oklch");
  const expected = contrastingLightness(Number(base.coords[0]));
  assert.ok(Math.abs(Number(alternate.coords[0]) - expected) < 0.005);
  assert.equal(alternate.alpha, 1);
  assert.ok(alternate.inGamut("srgb"));
  if (Number(base.coords[1]) > 0.01) {
    assert.ok(
      Math.abs(Number(alternate.coords[1]) - Number(base.coords[1])) < 1e-8,
    );
    assert.ok(
      Math.abs(Number(alternate.coords[2]) - Number(base.coords[2])) < 1e-8,
    );
  }
}
const mapped = checkerboardColors("color(display-p3 1 0 0)", settings);
assert.ok(concreteColor(mapped.alternate).inGamut("srgb"));
assert.ok(
  Number(concreteColor(mapped.alternate).to("oklch").coords[0]) <
    Number(concreteColor(mapped.background).to("oklch").coords[0]),
  "Wide-gamut mapping preserves the darker direction.",
);
assert.throws(
  () => checkerboardColors("rgb(0 0 0 / 0.5)", settings),
  /must be opaque/,
);
assert.throws(() => checkerboardColors("var(--missing)", settings));
const style = checkerboardSurfaceStyle("#fff", settings);
assert.equal(style["--checkerboard-base"], "#fff");
assert.notEqual(style["--checkerboard-alternate"], "#fff");
console.log("Preview surface lightness, gamut and local color checks passed.");
