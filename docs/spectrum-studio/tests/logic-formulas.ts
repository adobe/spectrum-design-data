// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { parseExpression } from "../src/features/scales/expression";
import { expressionToLatex } from "../src/features/scales/expressionLatex";
import {
  createInterpolation,
  type Interpolation,
} from "../src/features/scales/interpolationDefinition";
import {
  interpolationPreview,
  scalePreviewPoints,
} from "../src/features/scales/previews";
import {
  createScaleType,
  overridablePartLabels,
  SCALE_TYPE_DEFAULTS,
  scaleTypeBadgeLabel,
  scaleTypeLatex,
  type ScaleType,
} from "../src/features/scales/scaleType";
import { generateScale } from "../src/features/scales/generate";
import { ignoredOverrides } from "../src/features/logic/scaleTypeReferences";
import { SIZE_DEFAULTS } from "../src/features/size/defaults";
import { SPACING_DEFAULTS } from "../src/features/spacing/defaults";
import { TYPOGRAPHY_DEFAULTS } from "../src/features/typography/defaults";

function latex(
  source: string,
  variables: string[] = ["a", "b", "c", "x", "i", "base", "step", "my_val"],
) {
  const parsed = parseExpression(source, variables);
  assert.ok(parsed.ok, `${source} parses`);
  return expressionToLatex(parsed.node);
}

// Expression to LaTeX: grouping only where it changes the meaning.
assert.equal(
  latex("base + i * step"),
  String.raw`\mathrm{base} + i \cdot \mathrm{step}`,
);
assert.equal(latex("a / b"), String.raw`\frac{a}{b}`);
assert.equal(latex("x ^ 2 + 1"), String.raw`{x}^{2} + 1`);
assert.equal(latex("(a + b) * c"), String.raw`\left(a + b\right) \cdot c`);
assert.equal(latex("a - b - c"), "a - b - c");
assert.equal(latex("a - (b - c)"), String.raw`a - \left(b - c\right)`);
assert.equal(latex("a * (b * c)"), String.raw`a \cdot \left(b \cdot c\right)`);
assert.equal(latex("-(a + b)"), String.raw`-\left(a + b\right)`);
assert.equal(latex("(a + b) ^ 2"), String.raw`{\left(a + b\right)}^{2}`);
assert.equal(latex("sqrt(x)"), String.raw`\sqrt{x}`);
assert.equal(latex("abs(a - b)"), String.raw`\left|a - b\right|`);
assert.equal(latex("pow(x, 2)"), String.raw`{x}^{2}`);
assert.equal(
  latex("max(a, b)"),
  String.raw`\operatorname{max}\left(a,\,b\right)`,
);
assert.equal(latex("my_val + 1"), String.raw`\mathrm{my\_val} + 1`);

// Identifiers cannot carry LaTeX commands into the output.
assert.equal(parseExpression(String.raw`\textbf{x}`, ["x"]).ok, false);

// Shipped formulas, and custom ones only when they parse.
assert.equal(
  scaleTypeLatex(SCALE_TYPE_DEFAULTS[0]),
  String.raw`\mathrm{base} \cdot \mathrm{ratio}^{i}`,
);
assert.equal(
  scaleTypeLatex(SCALE_TYPE_DEFAULTS[1]),
  String.raw`(\mathrm{base} - \mathrm{offset}) \cdot \mathrm{ratio}^{i} + \mathrm{offset}`,
);
assert.equal(
  scaleTypeLatex(SCALE_TYPE_DEFAULTS[2]),
  String.raw`\mathrm{base} + i \cdot \mathrm{step}`,
);
assert.equal(
  scaleTypeLatex({ ...createScaleType(), expression: "base * 2 + i" }),
  String.raw`\mathrm{base} \cdot 2 + i`,
);
assert.equal(
  scaleTypeLatex({ ...createScaleType(), expression: "base +" }),
  null,
);
assert.deepEqual(
  SCALE_TYPE_DEFAULTS.map((scaleType) => scaleTypeBadgeLabel(scaleType.kind)),
  ["Type scale", "Geometric", "Linear", "Linear", "Geometric", "Linear"],
);
assert.equal(scaleTypeBadgeLabel("expression"), "Custom");

// Formula previews cover indices -4 to 8 from the formula's own base.
for (const scaleType of SCALE_TYPE_DEFAULTS) {
  const points = scalePreviewPoints(scaleType);
  assert.deepEqual(
    points.map((point) => point.index),
    Array.from({ length: 13 }, (_, offset) => offset - 4),
  );
  assert.equal(
    points.find((point) => point.index === 0)!.value,
    scaleType.base.default,
    `${scaleType.name} starts at its base`,
  );
}
const sizeFormula = SCALE_TYPE_DEFAULTS[2];
assert.equal(
  scalePreviewPoints(sizeFormula).at(-1)!.value,
  sizeFormula.base.default + 8 * sizeFormula.parameters[0].default,
);
assert.ok(
  scalePreviewPoints({ ...createScaleType(), expression: "base +" }).every(
    (point) => Number.isNaN(point.value),
  ),
);

// Interpolation previews are 0 to 1 shapes regardless of the real input and output ranges.
function method(
  partial: Partial<Extract<Interpolation, { kind: "method" }>>,
): Interpolation {
  return {
    id: "i",
    name: "Test",
    description: "",
    kind: "method",
    method: "linear",
    ...partial,
  };
}
const at = (interpolation: Interpolation, x: number) =>
  interpolationPreview(interpolation).points.find(
    (point) => Math.abs(point.x - x) < 1e-9,
  )!.y;
for (const kind of ["linear", "cosine", "exponential"] as const) {
  const interpolation = method({ method: kind });
  assert.ok(
    Math.abs(at(interpolation, 0)) < 1e-9 &&
      Math.abs(at(interpolation, 1) - 1) < 1e-9,
    `${kind} spans 0 to 1`,
  );
  assert.equal(interpolationPreview(interpolation).isFitted, false);
}
assert.ok(Math.abs(at(method({ method: "linear" }), 0.5) - 0.5) < 1e-9);
assert.ok(Math.abs(at(method({ method: "cosine" }), 0.5) - 0.5) < 1e-9);
assert.ok(at(method({ method: "cosine" }), 0.25) < 0.25, "cosine eases in");
assert.ok(
  at(method({ method: "exponential" }), 0.5) < 0.5,
  "exponential lags a straight line",
);
// Equal outputs have no shape to normalize, so the method itself is shown.
assert.ok(
  Math.abs(
    at(method({ method: "cosine" }), 0.25) -
      0.5 * (1 - Math.cos(Math.PI * 0.25)),
  ) < 1e-9,
);

// Custom expressions have no input range: x from 0 to 1, fitted vertically.
const half: Interpolation = {
  ...createInterpolation(),
  kind: "expression",
  parameters: [],
  expression: "x / 2",
};
const halfPreview = interpolationPreview(half);
assert.equal(halfPreview.isFitted, true);
assert.deepEqual(halfPreview.fittedRange, [0, 0.5]);
assert.ok(
  Math.abs(halfPreview.points[0].y) < 1e-9 &&
    Math.abs(halfPreview.points.at(-1)!.y - 1) < 1e-9,
);
assert.ok(
  interpolationPreview({ ...half, expression: "3" }).points.every(
    (point) => point.y === 0.5,
  ),
  "a constant sits mid-square",
);
assert.deepEqual(
  interpolationPreview({ ...half, expression: "x +" }).points,
  [],
);

// Parts that do not allow override use the formula's value, even when a foundation stores one.
const geometric = SCALE_TYPE_DEFAULTS[1];
const withLocks = (overridable: boolean): ScaleType => ({
  ...geometric,
  id: "scale-type-locks",
  base: { ...geometric.base, overridable },
  parameters: geometric.parameters.map((parameter) => ({
    ...parameter,
    overridable,
  })),
});
const settings = {
  scaleTypeId: "scale-type-locks",
  base: 100,
  below: 0,
  above: 1,
  parameters: { ratio: 2, offset: 0 },
  roundingRuleId: "rule-no-rounding",
};
const unlocked = generateScale(settings, { scaleTypes: [withLocks(true)] });
const locked = generateScale(settings, { scaleTypes: [withLocks(false)] });
assert.equal(
  unlocked[0].value,
  100,
  "an overridable base is taken from the foundation",
);
assert.equal(
  locked[0].value,
  geometric.base.default,
  "a locked base is the formula's",
);
assert.notEqual(
  locked[1].value,
  unlocked[1].value,
  "a locked ratio is the formula's",
);

// Switching off Allow override warns about foundations that override the part.
{
  const spacing = structuredClone(SPACING_DEFAULTS);
  spacing.scales[0] = {
    ...spacing.scales[0],
    base: 12,
    parameters: { ratio: 1.3 },
  };
  const draft = {
    ...geometric,
    base: { ...geometric.base, overridable: false },
    parameters: geometric.parameters.map((parameter) =>
      parameter.id === "ratio"
        ? { ...parameter, overridable: false }
        : parameter,
    ),
  };
  const ignored = ignoredOverrides(
    draft,
    TYPOGRAPHY_DEFAULTS,
    spacing,
    SIZE_DEFAULTS,
  );
  assert.deepEqual(
    ignored.map((item) => [item.consumer.label, item.parts]),
    [["Spacing › Global", ["Base", "Ratio"]]],
  );
  assert.deepEqual(
    ignoredOverrides(geometric, TYPOGRAPHY_DEFAULTS, spacing, SIZE_DEFAULTS),
    [],
    "allowed overrides are not flagged",
  );
  assert.deepEqual(overridablePartLabels(geometric), [
    "Base",
    "Ratio",
    "Offset",
  ]);
}

console.log("Logic formula checks passed.");
