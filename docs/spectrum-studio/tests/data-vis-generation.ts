// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import Color from "colorjs.io";
import { createColorDefaults } from "../src/data/defaults";
import { resolveColorDocument } from "../src/features/color-system/resolution";
import { resolvedBackgroundLinear } from "../src/features/color-system/surfaceGeneration";
import { generateColorTokensForScale } from "../src/features/tokens/generation";
import { resolveToken } from "../src/features/tokens/model";
import {
  compileContinuousScale,
  continuousSamples,
} from "../src/features/color-system/data-vis/continuous";
import {
  finalUiSwatches,
  resolveDataVisPoints,
  type ResolvedDataVisPoint,
} from "../src/features/color-system/data-vis/resolution";
import {
  deltaE2000,
  MeasurementCache,
} from "../src/features/color-system/data-vis/measurements";
import {
  renderedColor,
  concreteColor,
  linearSrgb,
} from "../src/features/color-system/data-vis/colors";
import {
  simulateColor,
  simulateLinearSrgb,
} from "../src/features/color-system/data-vis/cvd";
import { toGamma, toLinear } from "../src/features/color-system/colorMath";
import type { ContinuousDataVisScale } from "../src/features/color-system/data-vis/model";
import { ColorOutputError } from "../src/features/color-system/outputContrast";

const base = createColorDefaults();
const scale: ContinuousDataVisScale = {
  id: "sequence",
  name: "Sequence",
  kind: "sequential",
  points: [
    {
      id: "start",
      position: 0,
      source: { kind: "ui-scale", scaleId: base.scales[1].id },
      contrast: { value: 2.4, oppositeValue: 3.23 },
    },
    {
      id: "end",
      position: 1,
      source: {
        kind: "key-color",
        color: { lightness: 0.6, hue: 260, chroma: 40 },
      },
      contrast: { value: 8.47 },
    },
  ],
};
base.dataVisScales = [scale];
const raw = resolveColorDocument(base, [], undefined, {
  applyMultiplier: false,
  applyPolarity: false,
});
const ui = resolveColorDocument(base, []);
const tokens = ui.scales
  .flatMap((input) =>
    generateColorTokensForScale(
      input,
      ui.contrasts,
      resolvedBackgroundLinear(ui),
      ui.settings,
      ui.settings.colorOutput,
    ),
  )
  .map((token) => resolveToken(token, undefined));
const swatches = finalUiSwatches(ui, tokens);
assert.ok(!base.contrasts.some((step) => step.value === 2.4));
const points = resolveDataVisPoints(raw, scale, swatches);
assert.equal(points[0].targetContrast, 2.4);
assert.ok(points[0].targetReached);
const stronger = {
  ...raw,
  settings: { ...raw.settings, contrastMultiplier: 1.5 },
};
assert.ok(
  Math.abs(
    resolveDataVisPoints(stronger, scale, swatches)[0].targetContrast! - 3.1,
  ) < 1e-12,
);
assert.equal(
  resolveDataVisPoints(
    { ...raw, settings: { ...raw.settings, contrastMultiplier: 0 } },
    scale,
    swatches,
  )[0].targetContrast,
  1,
);
const dark = { ...raw, backgroundLightness: 0 };
assert.equal(
  resolveDataVisPoints(dark, scale, swatches)[0].targetContrast,
  3.23,
);
const unreachable = {
  ...raw,
  backgroundLightness: 0.6,
  settings: { ...raw.settings, side: "light" as const },
};
const extreme = {
  ...scale,
  points: scale.points.map((point) => ({ ...point, contrast: { value: 21 } })),
};
assert.throws(
  () => resolveDataVisPoints(unreachable, extreme, swatches),
  ColorOutputError,
);
const manual = {
  ...swatches[0],
  value: "rgb(10 20 30 / 0.6)",
  manuallyOverridden: true,
};
const named: ContinuousDataVisScale = {
  ...scale,
  points: [
    { id: "named", position: 0, source: manual.source },
    scale.points[1],
  ],
};
assert.equal(
  resolveDataVisPoints(stronger, named, [manual])[0].value,
  manual.value,
  "Named final colors cannot receive a second contrast adjustment.",
);
assert.throws(() => resolveDataVisPoints(raw, named, []), /replacement/);
assert.throws(() => concreteColor("var(--missing)"), /concrete color/);
const parsedP3 = concreteColor("color(display-p3 0.2 0.4 0.8)");
assert.deepEqual(parsedP3.coords, [0.2, 0.4, 0.8]);
assert.ok(parsedP3.coords.every((channel) => typeof channel === "number"));
assert.throws(
  () => concreteColor("color(display-p3 none 0.4 0.8)"),
  /unavailable channels/,
);
assert.throws(() => concreteColor("rgb(0 0 0 / none)"), /unavailable channels/);

const compiled = compileContinuousScale(scale, points);
assert.equal(compiled.evaluate(0), points[0].value);
assert.equal(compiled.evaluate(1), points[1].value);
assert.equal(compiled.evaluate(-100), points[0].value);
assert.equal(compiled.evaluate(100), points[1].value);
assert.throws(() => compiled.evaluate(Number.NaN), /finite normalized/);
assert.throws(() => compiled.evaluate(Infinity), /finite normalized/);
const before = compiled.evaluate(0.37);
continuousSamples(compiled, 9);
continuousSamples(compiled, 65);
assert.equal(compiled.evaluate(0.37), before);
assert.equal(scale.points.length, 2);
const point = (
  id: string,
  position: number,
  value: string,
): ResolvedDataVisPoint => ({
  id,
  position,
  value,
  source: manual.source,
  actualContrast: 1,
  manuallyOverridden: false,
});
const diverging = compileContinuousScale(
  { id: "diverging", kind: "diverging" },
  [
    point("left", 0, "#123456"),
    point("center", 0.5, "#888888"),
    point("right", 1, "#654321"),
  ],
);
assert.equal(diverging.evaluate(0.5), "#888888");
assert.notEqual(diverging.evaluate(0.25), diverging.evaluate(0.75));
assert.notEqual(diverging.evaluate(0), "#ffffff");
assert.equal(
  continuousSamples(diverging, 8).filter((sample) => sample.position === 0.5)
    .length,
  1,
);
const alpha = compileContinuousScale({ id: "alpha", kind: "sequential" }, [
  point("a", 0, "rgb(255 0 0 / 0)"),
  point("b", 1, "rgb(0 0 255 / 1)"),
]);
assert.ok(Math.abs(concreteColor(alpha.evaluate(0.5)).alpha - 0.5) < 1e-6);
const collapsed = compileContinuousScale(
  { id: "collapsed", kind: "sequential" },
  [point("a", 0, "#555555"), point("b", 1, "#555555")],
);
assert.ok(
  collapsed.diagnostics.some((diagnostic) => diagnostic.includes("collapsed")),
);
const nonmonotonic = compileContinuousScale(
  { id: "zigzag", kind: "sequential" },
  [
    point("a", 0, "#111111"),
    point("b", 0.3, "#cccccc"),
    point("c", 0.6, "#333333"),
    point("d", 1, "#ffffff"),
  ],
);
assert.ok(
  nonmonotonic.diagnostics.some((diagnostic) =>
    diagnostic.includes("changes direction"),
  ),
);

// Published Sharma CIEDE2000 Lab pairs, independent of generated UI colors.
for (const [first, second, expected] of [
  [[50, 2.6772, -79.7751], [50, 0, -82.7485], 2.0425],
  [[50, 3.1571, -77.2803], [50, 0, -82.7485], 2.8615],
  [[50, 2.8361, -74.02], [50, 0, -82.7485], 3.4412],
  [[50, -1.3802, -84.2814], [50, 0, -82.7485], 1],
] as const) {
  const a = new Color("lab", [...first]),
    b = new Color("lab", [...second]);
  assert.ok(Math.abs(deltaE2000(a, b) - expected) < 0.00005);
  assert.ok(Math.abs(deltaE2000(a, b) - deltaE2000(b, a)) < 1e-12);
}
assert.deepEqual(
  simulateLinearSrgb([1, 0, 0], "protanopia"),
  [0.152286, 0.114503, -0.003882],
);
assert.deepEqual(
  simulateLinearSrgb([1, 0, 0], "deuteranopia"),
  [0.367322, 0.280085, -0.01182],
);
assert.deepEqual(
  simulateLinearSrgb([0, 0, 1], "tritanopia"),
  [-0.178779, 0.147602, 0.3039],
);
for (const profile of ["protanopia", "deuteranopia", "tritanopia"] as const) {
  const neutral = simulateLinearSrgb([0.2, 0.2, 0.2], profile);
  assert.ok(neutral.every((channel) => Math.abs(channel - 0.2) < 0.000001));
}
const simulated = simulateColor(new Color("rgb(128 0 0)"), "protanopia").to(
  "srgb",
);
assert.ok(
  Math.abs(simulated.coords[0] - toGamma(toLinear(128 / 255) * 0.152286)) <
    1e-9,
  "The matrix must run in linear light, before gamma encoding.",
);
assert.equal(
  simulated.coords[2],
  0,
  "Clip the simulated display result, not the matrix coefficients.",
);
assert.deepEqual(
  simulateLinearSrgb([1, 0, 0], "achromatopsia"),
  [0.2126, 0.2126, 0.2126],
);
const flattened = renderedColor("rgb(0 0 0 / 0.5)", "#ffffff");
assert.ok(
  flattened
    .to("srgb")
    .coords.every((channel) => Math.abs(channel - 0.5) < 1e-12),
);
assert.ok(
  linearSrgb(new Color("color(display-p3 1 0 0)")).every(
    (channel) => channel >= 0 && channel <= 1,
  ),
);
const cache = new MeasurementCache();
const forward = cache.pair("#123456", "#abcdef", "#ffffff");
const conversions = cache.conversions,
  comparisons = cache.comparisons;
const reverse = cache.pair("#abcdef", "#123456", "#ffffff");
assert.equal(reverse.deltaE, forward.deltaE);
assert.equal(reverse.firstBackgroundContrast, forward.secondBackgroundContrast);
assert.equal(cache.conversions, conversions);
assert.equal(cache.comparisons, comparisons);
assert.ok(cache.hits > 0);
const nearThreshold = forward.deltaE + Number.EPSILON * 32;
assert.ok(
  forward.deltaE < nearThreshold,
  "Thresholds compare full precision, never a rounded label.",
);
console.log(
  "Data vis generation: free targets, exact links, bounded functions, alpha, CIEDE2000 and linear CVD vectors passed.",
);
