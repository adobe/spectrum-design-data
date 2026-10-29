// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { createStore } from "jotai";
import {
  applyRoundingRule,
  roundingFactorFor,
} from "../src/features/logic/evaluate";
import { RULE_DEFAULTS } from "../src/features/logic/defaults";
import {
  comparisonSelection,
  comparisonSeries,
  defaultComparisonSelection,
} from "../src/features/scales/comparison";
import { buildDimensionComparisons } from "../src/features/scales/dimensionComparisons";
import { generateScale } from "../src/features/scales/generate";
import { SPACING_DEFAULTS } from "../src/features/spacing/defaults";
import { generateSpacingScale } from "../src/features/spacing/generate";
import { generatedSpacingAtom } from "../src/features/spacing/state";
import { browserTokensAtom } from "../src/features/tokens/browserState";
import { enterEditModeAtom } from "../src/features/edit-session/state";
import {
  replaceScaleTypeAtom,
  scaleTypesAtom,
} from "../src/features/logic/scaleTypeLibrary";
import {
  spacingDocumentAtom,
  updateSpacingScaleAtom,
} from "../src/features/spacing/state";
import { dimensionExampleInput } from "./fixtures/dimension-foundations";

const horizontal = SPACING_DEFAULTS.scales.find(
  (scale) => scale.name === "Base horizontal spacing",
)!;
const gap = SPACING_DEFAULTS.scales.find((scale) => scale.name === "Base gap")!;
assert(horizontal && gap);
for (const [scale, expected] of [
  [horizontal, [8, 8, 10, 12, 12]],
  [gap, [5, 5, 6, 7, 8]],
] as const) {
  const values = generateSpacingScale(scale);
  assert.deepEqual(
    values.map((value) => value.value),
    expected,
  );
  assert.deepEqual(
    values.map((value) => value.step),
    [50, 75, 100, 200, 300],
  );
  assert.deepEqual(scale.parameters, {}, "ratios remain inherited");
  assert.equal(scale.hideFromPublishing, true);
  assert.equal(
    scale.bindings,
    undefined,
    "using Type scale alone does not make spacing adaptive",
  );
}
const rule = RULE_DEFAULTS.find(
  (rule) => rule.id === horizontal.roundingRuleId,
)!;
for (const [value, factor, rounded] of [
  [4.99, 1, 5],
  [5, 2, 6],
  [5.01, 2, 6],
  [7, 2, 8],
]) {
  assert.equal(roundingFactorFor(rule, value), factor);
  assert.equal(applyRoundingRule(rule, value), rounded);
}
const store = createStore();
assert.equal(
  store.get(generatedSpacingAtom).length,
  3,
  "all scales are generated for authoring",
);
assert.equal(
  store.get(browserTokensAtom).filter((token) => token.type === "spacing")
    .length,
  18,
  "hidden examples do not become published dimension tokens",
);
store.set(enterEditModeAtom);
const typeScale = store
  .get(scaleTypesAtom)
  .find((formula) => formula.id === horizontal.scaleTypeId)!;
store.set(replaceScaleTypeAtom, {
  ...typeScale,
  parameters: typeScale.parameters.map((part) =>
    part.id === "ratio" ? { ...part, default: 1.2 } : part,
  ),
});
for (const scale of [horizontal, gap]) {
  const entry = store
    .get(generatedSpacingAtom)
    .find((entry) => entry.scale.id === scale.id)!;
  assert(
    Math.abs(entry.values.at(-1)!.raw - scale.base! * 1.2 ** 2) < 1e-9,
    "samples inherit the shared ratio",
  );
  assert.deepEqual(entry.scale.parameters, {});
}
store.set(updateSpacingScaleAtom, {
  id: horizontal.id,
  patch: { parameters: { ratio: 1.4 } },
});
assert.equal(
  store.get(spacingDocumentAtom).scales.find((scale) => scale.id === gap.id)!
    .parameters.ratio,
  undefined,
);
assert.equal(
  store
    .get(scaleTypesAtom)
    .find((formula) => formula.id === typeScale.id)!
    .parameters.find((part) => part.id === "ratio")!.default,
  1.2,
);
assert(
  Math.abs(
    store
      .get(generatedSpacingAtom)
      .find((entry) => entry.scale.id === horizontal.id)!
      .values.at(-1)!.raw -
      10 * 1.4 ** 2,
  ) < 1e-9,
);

const staticInput = dimensionExampleInput();
const staticData = buildDimensionComparisons(staticInput);
assert.deepEqual(staticData.parameterIds, []);
assert.equal(staticData.modes, undefined);
assert.equal(staticData.range.settings.length, 1);
assert.deepEqual(
  staticData.range.metrics[0].rows[0],
  staticInput.values.map(({ raw, value }) => ({ raw, value })),
);
assert.deepEqual(
  staticData.range.metrics[0].tokenNames,
  staticInput.values.map((value) => value.name),
);
const disabledConnection = dimensionExampleInput();
disabledConnection.scale.scaleTypeId = "scale-type-size";
disabledConnection.scale.bindings = {
  ratio: {
    modeParameterId: "typography.textZoom",
    method: "linear",
    points: [
      { at: 0, value: 1.125 },
      { at: 8, value: 1.5 },
    ],
  },
};
assert.deepEqual(
  buildDimensionComparisons(disabledConnection).parameterIds,
  [],
  "unused formula parts are not adaptive connections",
);
const flatConnection = dimensionExampleInput(true);
flatConnection.scale.bindings!.base.points = [
  { at: -4, value: 6 },
  { at: 8, value: 6 },
];
assert.deepEqual(
  buildDimensionComparisons(flatConnection).parameterIds,
  ["typography.textZoom"],
  "equal output values do not erase a declared connection",
);

const input = dimensionExampleInput(true, true);
input.documents.typography!.textZoom = 2;
input.current = {
  ...input.current,
  "typography.textZoom": 8,
  "color.contrastMultiplier": 2,
};
const original = structuredClone(input);
const data = buildDimensionComparisons(input, "typography.textZoom");
assert.deepEqual(data.parameterIds, [
  "typography.textZoom",
  "color.contrastMultiplier",
]);
const baseline = data.range.settings.findIndex((setting) => setting.isRequired);
assert.equal(
  data.range.settings[baseline].value,
  2,
  "authored default is neither zero nor the active preview",
);
assert.deepEqual(
  data.range.metrics[0].rows[baseline],
  generateScale(input.scale, input, {
    ...input.current,
    "typography.textZoom": 2,
  }).map(({ raw, value }) => ({ raw, value })),
);
assert.deepEqual(
  input,
  original,
  "comparison does not mutate sources or active parameter context",
);
const tokens = defaultComparisonSelection(data.range.steps, "tokens");
assert.equal(tokens.length, 5);
assert.deepEqual(
  comparisonSelection(data.range.steps, []),
  ["100"],
  "the base step is protected",
);
const series = comparisonSeries(
  data.range,
  data.range.metrics[0],
  "tokens",
  tokens,
);
assert.equal(series.length, 5);
assert.deepEqual(
  series[2].points.map((point) => point.value),
  data.range.metrics[0].rows.map((row) => row[2].value),
);

const set = input.modeSets.find((set) =>
  set.authoringCapabilities?.includes("typography.textZoom"),
)!;
const equal = {
  ...structuredClone(set.modes.at(-1)!),
  id: "dimension-equal-mode",
  key: "equal",
  name: "Equal",
};
set.modes.push(equal);
const named = buildDimensionComparisons(input).modes!;
assert.equal(
  named.settings.length,
  set.modes.length,
  "equal-valued named modes remain distinct",
);
assert(named.settings.some((setting) => setting.id === equal.id));
assert.equal(named.settings.find((setting) => setting.isRequired)!.value, 2);
assert.equal(defaultComparisonSelection(named.settings).length, 3);

const contrast = buildDimensionComparisons(input, "color.contrastMultiplier");
const contrastDefault = contrast.range.settings.findIndex(
  (setting) => setting.isRequired,
);
assert.deepEqual(
  contrast.range.metrics[0].rows[contrastDefault],
  generateScale(input.scale, input, {
    ...input.current,
    "color.contrastMultiplier": 1,
  }).map(({ raw, value }) => ({ raw, value })),
);

const sameVariable = dimensionExampleInput(true);
sameVariable.scale.bindings!.ratio = {
  modeParameterId: "typography.textZoom",
  method: "linear",
  points: [
    { at: -4, value: 1.01 },
    { at: 0, value: 1.125 },
    { at: 8, value: 1.3 },
  ],
};
const both = buildDimensionComparisons(sameVariable);
assert.deepEqual(both.parameterIds, ["typography.textZoom"]);
assert.deepEqual(
  both.range.metrics[0].rows.at(-1),
  generateScale(sameVariable.scale, sameVariable, {
    ...sameVariable.current,
    "typography.textZoom": 8,
  }).map(({ raw, value }) => ({ raw, value })),
);

input.documents.color!.settings.contrastMultiplier = 1.23;
const offGrid = buildDimensionComparisons(input, "color.contrastMultiplier");
assert.equal(
  offGrid.range.settings.find((setting) => setting.isRequired)!.value,
  1.23,
  "off-grid authored default is included",
);
const unowned = structuredClone(input);
unowned.modeSets.forEach((set) => {
  set.authoringCapabilities = set.authoringCapabilities?.filter(
    (id) => id !== "typography.textZoom",
  );
});
assert.equal(buildDimensionComparisons(unowned).modes, undefined);
const badDefault = structuredClone(input);
badDefault.modeSets.find((set) =>
  set.authoringCapabilities?.includes("typography.textZoom"),
)!.defaultModeId = "missing";
assert.throws(() => buildDimensionComparisons(badDefault), /default mode/);
assert.throws(
  () => buildDimensionComparisons({ ...staticInput, rules: [] }),
  /rounding rule/,
);
assert.throws(
  () => buildDimensionComparisons({ ...staticInput, scaleTypes: [] }),
  /formula/,
);
assert.throws(
  () =>
    buildDimensionComparisons({
      ...staticInput,
      values: staticInput.values.map((point) => ({ ...point, raw: NaN })),
    }),
  /could not be calculated/,
);
console.log(
  "Dimension examples, rounding boundaries, identities, comparison sources, baselines and transposition passed.",
);
