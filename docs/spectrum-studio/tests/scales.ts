// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { RULE_DEFAULTS } from "../src/features/logic/defaults";
import { applyRoundingRule, resolveRule } from "../src/features/logic/evaluate";
import { TYPOGRAPHY_DEFAULTS } from "../src/features/typography/defaults";
import type { TypographyDocument } from "../src/features/typography/model";
import {
  componentSizeIndex,
  TEXT_ZOOM_MAX,
  TEXT_ZOOM_MIN,
} from "../src/features/typography/model";
import {
  generateTypography,
  TEXT_ZOOM_STEP_RATIO,
} from "../src/features/typography/typographyGeneration";
import { typeScaleWithRatios } from "./typography-fixtures";
import {
  evaluateInterpolation,
  evaluateInterpolationMapping,
  interpolationIssues,
  type Interpolation,
} from "../src/features/scales/interpolationDefinition";
import {
  evaluateExpression,
  parseExpression,
} from "../src/features/scales/expression";
import {
  belowStepSize,
  generateDerivedScale,
  generateScale,
  scaleIssues,
  scaleStepName,
  type ScaleSettings,
} from "../src/features/scales/generate";
import {
  interpolate,
  isParameterBinding,
  resolveBinding,
  type ParameterBinding,
} from "../src/features/scales/interpolation";
import {
  createScaleType,
  GEOMETRIC_SCALE_TYPE_ID,
  SIZE_SCALE_TYPE_ID,
  resolveScaleType,
  SCALE_TYPE_DEFAULTS,
  scaleTypeIssues,
  type ScaleType,
} from "../src/features/scales/scaleType";

function evaluate(source: string, variables: Record<string, number> = {}) {
  const parsed = parseExpression(source, Object.keys(variables));
  if (!parsed.ok) throw new Error(`"${source}" should parse: ${parsed.error}`);
  return evaluateExpression(parsed.node, variables);
}

function rejects(source: string, variables: string[] = []) {
  assert.equal(
    parseExpression(source, variables).ok,
    false,
    `"${source}" should be rejected`,
  );
}

// Expression grammar.
assert.equal(evaluate("1 + 2 * 3"), 7);
assert.equal(evaluate("(1 + 2) * 3"), 9);
assert.equal(evaluate("2 ^ 3 ^ 2"), 512, "power is right associative");
assert.equal(evaluate("-2 ^ 2"), -4, "unary minus binds looser than power");
assert.equal(evaluate("pow(2, 10) - max(1, 2, 3)"), 1021);
assert.equal(evaluate("clamp(x, 0, 10)", { x: 15 }), 10);
assert.equal(evaluate("(size - line) / 2", { size: 16, line: 24 }), -4);
assert.equal(evaluate("1.5e1 + .5"), 15.5);
for (const bad of [
  "",
  "1 +",
  "foo",
  "unknown(1)",
  "pow(1)",
  "1 2",
  "(1",
  "1 $ 2",
  "constructor",
  "__proto__",
  "x.y",
  "a ? b : c",
  "abs()",
  `${"(".repeat(60)}1${")".repeat(60)}`,
  "1".repeat(501),
])
  rejects(bad);
rejects("constructor(1)", ["constructor"]);
rejects("toString + 1");
assert.ok(parseExpression("size * 2", ["size"]).ok);

// Below-base names.
const NAMES: Record<number, number[]> = {
  0: [],
  1: [50],
  2: [50, 75],
  3: [25, 50, 75],
  4: [20, 40, 60, 80],
  5: [50, 60, 70, 80, 90],
  9: [10, 20, 30, 40, 50, 60, 70, 80, 90],
};
for (const [count, expected] of Object.entries(NAMES)) {
  const below = Number(count);
  const names = Array.from({ length: below }, (_, offset) =>
    scaleStepName(offset - below, below),
  );
  assert.deepEqual(names, expected, `names for ${below} smaller values`);
}
assert.equal(scaleStepName(0, 4), 100);
assert.equal(scaleStepName(3, 4), 400);
assert.equal(belowStepSize(19), 5);
assert.equal(belowStepSize(60), 1);
for (let below = 1; below <= 99; below++) {
  const names = Array.from({ length: below }, (_, offset) =>
    scaleStepName(offset - below, below),
  );
  assert.equal(new Set(names).size, below, `names are distinct for ${below}`);
  assert.ok(
    names.every((name) => Number.isInteger(name) && name > 0 && name < 100),
    `names stay between 0 and 100 for ${below}`,
  );
}

// Spacing default: base 8, ratio 1.2025, offset -6 keeps the reference values.
const spacingSettings: ScaleSettings = {
  scaleTypeId: GEOMETRIC_SCALE_TYPE_ID,
  base: 8,
  below: 4,
  above: 13,
  parameters: { ratio: 1.2025, offset: -6 },
  roundingRuleId: "rule-spacing-rounding",
};
const EXPECTED_SPACING: number[] = JSON.parse(
  readFileSync(
    new URL("./fixtures/spacing-global.json", import.meta.url),
    "utf8",
  ),
);
const spacing = generateScale(spacingSettings);
assert.deepEqual(
  spacing.map((entry) => entry.value),
  EXPECTED_SPACING,
);
assert.equal(
  spacing.find((entry) => entry.index === 0)!.value,
  8,
  "the base is the value at index 0",
);
assert.deepEqual(
  spacing.slice(0, 4).map((entry) => entry.step),
  [20, 40, 60, 80],
);
assert.deepEqual(scaleIssues(spacing), []);
assert.equal(
  generateScale({ ...spacingSettings, below: 0, above: 3 }).length,
  4,
);
assert.equal(
  generateScale({ ...spacingSettings, below: 99, above: 999 }).length,
  9 + 1 + 40,
  "range is clamped",
);

// Linear and custom expression scale types.
const linear = generateScale({
  scaleTypeId: SIZE_SCALE_TYPE_ID,
  base: 8,
  below: 1,
  above: 3,
  parameters: { step: 4 },
  roundingRuleId: "rule-whole-numbers",
});
assert.deepEqual(
  linear.map((entry) => entry.value),
  [4, 8, 12, 16, 20],
);
const custom: ScaleType = {
  ...createScaleType(),
  id: "scale-type-test",
  expression: "base * (1 + i * step / 10)",
  base: { default: 10, step: 1, adaptable: false, overridable: true },
  parameters: [
    {
      id: "step",
      label: "Step",
      default: 5,
      step: 1,
      adaptable: true,
      overridable: true,
    },
  ],
};
assert.deepEqual(scaleTypeIssues(custom), []);
assert.deepEqual(
  generateScale(
    {
      scaleTypeId: custom.id,
      base: 10,
      below: 0,
      above: 2,
      parameters: {},
      roundingRuleId: "rule-no-rounding",
    },
    { scaleTypes: [...SCALE_TYPE_DEFAULTS, custom] },
  ).map((entry) => entry.value),
  [10, 15, 20],
);
assert.ok(scaleTypeIssues({ ...custom, expression: "base +" }).length > 0);
assert.ok(
  scaleTypeIssues({ ...custom, expression: "base + other" }).length > 0,
  "unknown names are rejected",
);
assert.ok(
  scaleTypeIssues({
    ...custom,
    parameters: [{ ...custom.parameters[0], id: "base" }],
  }).length > 0,
  "reserved parameter names are rejected",
);
assert.ok(
  scaleTypeIssues({
    ...custom,
    parameters: [...custom.parameters, ...custom.parameters],
  }).length > 0,
  "duplicate parameters are rejected",
);
const invalid = generateScale(
  {
    scaleTypeId: custom.id,
    base: 10,
    below: 0,
    above: 1,
    parameters: {},
    roundingRuleId: "rule-no-rounding",
  },
  { scaleTypes: [{ ...custom, expression: "base +" }] },
);
assert.deepEqual(
  scaleIssues(invalid),
  ["invalid"],
  "an invalid expression is reported rather than thrown",
);
assert.equal(
  resolveScaleType(SCALE_TYPE_DEFAULTS, "missing").id,
  GEOMETRIC_SCALE_TYPE_ID,
  "missing types fall back to Geometric",
);
assert.deepEqual(scaleIssues([{ value: 0 }, { value: 4 }, { value: 4 }]), [
  "non-positive",
  "duplicate",
]);

// Overrides are clamped to the parameter range.
assert.equal(
  generateScale({
    ...spacingSettings,
    below: 0,
    above: 1,
    parameters: { ratio: 99, offset: 0 },
    roundingRuleId: "rule-no-rounding",
  })[1].value,
  8 * 3,
);

// Bindings: piecewise, clamped, with the interpolation method per binding.
const ratioBinding: ParameterBinding = {
  modeParameterId: "typography.textZoom",
  method: "linear",
  points: [
    { at: -4, value: 1.1 },
    { at: 0, value: 1.2 },
    { at: 8, value: 1.4 },
  ],
};
assert.ok(isParameterBinding(ratioBinding));
assert.ok(
  !isParameterBinding({ ...ratioBinding, points: [ratioBinding.points[0]] }),
);
assert.ok(
  !isParameterBinding({
    ...ratioBinding,
    points: [
      { at: 1, value: 1 },
      { at: 1, value: 2 },
    ],
  }),
);
assert.equal(resolveBinding(ratioBinding, -99), 1.1);
assert.equal(resolveBinding(ratioBinding, 99), 1.4);
assert.ok(Math.abs(resolveBinding(ratioBinding, -2) - 1.15) < 1e-12);
assert.ok(Math.abs(resolveBinding(ratioBinding, 4) - 1.3) < 1e-12);
assert.equal(resolveBinding(ratioBinding, 0), 1.2);
assert.equal(
  interpolate("exponential", 0, 4, 0.5),
  2,
  "exponential falls back to linear for non-positive endpoints",
);
assert.ok(Math.abs(interpolate("exponential", 1, 4, 0.5) - 2) < 1e-12);
assert.ok(Math.abs(interpolate("cosine", 0, 10, 0.5) - 5) < 1e-12);

// Unbound mode parameters leave the scale unchanged.
const bound: ScaleSettings = {
  ...spacingSettings,
  below: 0,
  above: 2,
  parameters: { ratio: 1.2, offset: 0 },
  bindings: { ratio: ratioBinding },
  roundingRuleId: "rule-no-rounding",
};
assert.deepEqual(
  generateScale(bound).map((entry) => entry.raw),
  generateScale({ ...bound, bindings: undefined }).map((entry) => entry.raw),
);
assert.notDeepEqual(
  generateScale(bound, {}, { "typography.textZoom": 8 }).map(
    (entry) => entry.raw,
  ),
  generateScale(bound).map((entry) => entry.raw),
);

// Typography parity: font sizes from the shared engine match the closed-form formula typography used before scale types.
function expectedFontSizes(
  document: TypographyDocument,
  formulas: readonly ScaleType[],
  zoom: number,
) {
  const lerp = (start: number, end: number, percent: number) =>
    start * (1 - percent) + end * percent;
  const percentage = (value: number, min: number, max: number) =>
    (value - min) / (max - min);
  const formula = formulas.find((item) => item.id === document.scaleTypeId)!;
  const ends = [
    formula.textSizeAdaptation!.ratioAtSmallest,
    formula.parameters[0].default,
    formula.textSizeAdaptation!.ratioAtLargest,
  ];
  const ratio =
    zoom > 0
      ? lerp(ends[1], ends[2], percentage(zoom, 0, TEXT_ZOOM_MAX))
      : lerp(ends[0], ends[1], percentage(zoom, TEXT_ZOOM_MIN, 0));
  const base =
    formula.base.default *
    Math.pow(
      TEXT_ZOOM_STEP_RATIO,
      componentSizeIndex(document.componentSize) + zoom,
    );
  const rule = resolveRule(RULE_DEFAULTS, document.textRoundingRuleId);
  const sizes: { position: number; fontSize: number }[] = [];
  for (
    let position = -document.smallSizes;
    position <= Math.min(14, document.largeSizes);
    position++
  ) {
    const rounded = applyRoundingRule(rule, base * Math.pow(ratio, position));
    sizes.push({
      position,
      fontSize: Math.min(
        document.maxTextSize,
        Math.max(document.minTextSize, rounded),
      ),
    });
  }
  return sizes;
}

const documents: {
  document: TypographyDocument;
  formulas: readonly ScaleType[];
}[] = [
  { document: TYPOGRAPHY_DEFAULTS, formulas: SCALE_TYPE_DEFAULTS },
  {
    document: TYPOGRAPHY_DEFAULTS,
    formulas: typeScaleWithRatios(1.118, 1.069),
  },
  {
    document: { ...TYPOGRAPHY_DEFAULTS, smallSizes: 3, largeSizes: 10 },
    formulas: typeScaleWithRatios(1.2, 1.333, 16, 1.25),
  },
  {
    document: {
      ...TYPOGRAPHY_DEFAULTS,
      componentSize: "l",
      smallSizes: 1,
      largeSizes: 6,
    },
    formulas: typeScaleWithRatios(1.1, 1.2),
  },
];
for (const { document, formulas } of documents) {
  for (let zoom = TEXT_ZOOM_MIN; zoom <= TEXT_ZOOM_MAX; zoom++) {
    const expected = expectedFontSizes(document, formulas, zoom);
    const actual = generateTypography(document, zoom, RULE_DEFAULTS, formulas);
    assert.deepEqual(
      actual.map((token) => ({
        position: token.position,
        fontSize: token.fontSize,
      })),
      expected,
      `font sizes at zoom ${zoom}`,
    );
  }
}
assert.deepEqual(
  generateTypography({ ...TYPOGRAPHY_DEFAULTS, smallSizes: 1 }, 0)
    .map((token) => token.name)
    .slice(0, 2),
  ["font-size-50", "font-size-100"],
  "one smaller size is named 50",
);
assert.deepEqual(
  generateTypography(TYPOGRAPHY_DEFAULTS, 0)
    .map((token) => token.name)
    .slice(0, 3),
  ["font-size-50", "font-size-75", "font-size-100"],
  "two smaller sizes keep today's names",
);

// Interpolation parity: an interpolation reproduces the line-height blend.
function lineHeightPercent(
  method: "linear" | "cosine",
  from: number,
  to: number,
  smallest: number,
  largest: number,
  fontSize: number,
) {
  const clamp = (value: number, min: number, max: number) =>
    Math.min(max, Math.max(min, value));
  const percent = clamp(
    from === to && fontSize === from ? 1 : (fontSize - from) / (to - from),
    0,
    1,
  );
  const lerp = (a: number, b: number, t: number) => a * (1 - t) + b * t;
  return method === "linear"
    ? lerp(smallest, largest, percent)
    : lerp(smallest, largest, 0.5 * (1 - Math.cos(percent * Math.PI)));
}
for (const method of ["linear", "cosine"] as const) {
  const interpolation: Interpolation = {
    id: "c",
    name: "Body line height",
    description: "",
    kind: "method",
    method,
  };
  const mapping = {
    interpolationId: "c",
    from: 12,
    to: 40,
    outputAtFrom: 160,
    outputAtTo: 120,
  };
  for (const size of [1, 8, 12, 14, 20, 33.5, 40, 80, 200]) {
    assert.equal(
      evaluateInterpolationMapping(interpolation, mapping, size),
      lineHeightPercent(method, 12, 40, 160, 120, size),
      `${method} interpolation at ${size}`,
    );
  }
}
{
  const flat: Interpolation = {
    id: "c",
    name: "Flat",
    description: "",
    kind: "method",
    method: "linear",
  };
  assert.throws(
    () =>
      evaluateInterpolationMapping(
        flat,
        {
          interpolationId: "c",
          from: 16,
          to: 16,
          outputAtFrom: 100,
          outputAtTo: 200,
        },
        16,
      ),
    /valid interpolation range/,
  );
}

// Expression interpolations and derived scales.
const half: Interpolation = {
  id: "half",
  name: "Linear progress",
  description: "",
  kind: "expression",
  parameters: [
    { id: "power", label: "Power", default: 1, step: 0.1, adaptable: false },
  ],
  expression: "pow(x, power)",
};
assert.deepEqual(interpolationIssues(half), []);
assert.ok(interpolationIssues({ ...half, expression: "y * 2" }).length > 0);
assert.equal(evaluateInterpolation(half, 0.5), 0.5);
assert.equal(evaluateInterpolation(half, 0.5, { power: 2 }), 0.25);
const source = generateScale({
  scaleTypeId: SIZE_SCALE_TYPE_ID,
  base: 16,
  below: 1,
  above: 2,
  parameters: { step: 8 },
  roundingRuleId: "rule-whole-numbers",
});
const derived = generateDerivedScale(
  source,
  half,
  {
    interpolationId: half.id,
    from: 8,
    to: 32,
    outputAtFrom: 4,
    outputAtTo: 16,
  },
  "rule-whole-numbers",
);
assert.deepEqual(
  derived.map((entry) => [entry.index, entry.step, entry.value]),
  [
    [-1, 50, 4],
    [0, 100, 8],
    [1, 200, 12],
    [2, 300, 16],
  ],
  "derived scales follow the source range and names",
);

console.log("scales: all checks passed");
