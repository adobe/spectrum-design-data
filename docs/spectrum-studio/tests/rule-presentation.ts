// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { createRule, type Rule } from "../src/features/logic/model";
import {
  TYPE_BADGE_VARIANTS,
  typeBadgeVariant,
} from "../src/components/typeBadgePresentation";
import type { ScaleTypeKind } from "../src/features/scales/scaleType";
import { INTERPOLATION_METHODS } from "../src/features/scales/interpolation";
import {
  groupRulesByType,
  rulePresentation,
  RULE_SECTIONS,
} from "../src/features/logic/rulePresentation";

const rounding = createRule("rounding");
const naming = createRule("scale-naming");
const generator = createRule("generator");
const conditional = createRule("conditional");
const legacy: Rule = { ...generator, type: "tshirt-sizing" };
const secondRounding = { ...rounding, id: "second-rounding" };
const input = [
  conditional,
  rounding,
  generator,
  naming,
  legacy,
  secondRounding,
];
const before = structuredClone(input);
const groups = groupRulesByType(input);
assert.deepEqual(
  groups.map((group) => group.label),
  ["Rounding rules", "Naming rules", "Generators", "Conditional rules"],
);
assert.deepEqual(
  groups.map((group) => group.rules),
  [[rounding, secondRounding], [naming], [generator, legacy], [conditional]],
);
assert.equal(
  new Set(RULE_SECTIONS.map((section) => typeBadgeVariant(section.type))).size,
  4,
);
assert.equal(rulePresentation("tshirt-sizing"), rulePresentation("generator"));
assert.deepEqual(
  groupRulesByType([]).map((group) => group.rules),
  [[], [], [], []],
);
assert.deepEqual(input, before);
const formulaTypes: ScaleTypeKind[] = [
  "type-scale",
  "geometric",
  "linear",
  "expression",
];
assert.equal(new Set(formulaTypes.map(typeBadgeVariant)).size, 4);
assert.equal(
  new Set([
    ...INTERPOLATION_METHODS.map(({ id }) => typeBadgeVariant(id)),
    typeBadgeVariant("expression"),
  ]).size,
  4,
);
assert.deepEqual(TYPE_BADGE_VARIANTS, {
  rounding: "blue",
  "scale-naming": "purple",
  generator: "cyan",
  conditional: "magenta",
  "type-scale": "blue",
  geometric: "purple",
  linear: "cyan",
  custom: "magenta",
  cosine: "indigo",
  exponential: "orange",
  "built-in": "neutral",
});
assert.equal(typeBadgeVariant("expression"), typeBadgeVariant("custom"));
assert.equal(typeBadgeVariant("tshirt-sizing"), typeBadgeVariant("generator"));
console.log(
  "Logic presentation: rule grouping, stable order, shared type colors, interpolation methods and legacy aliases passed.",
);
