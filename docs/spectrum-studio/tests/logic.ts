// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { createStore } from "jotai";
import { roundToFactor } from "../src/features/foundations/rounding";
import {
  applyRoundingRule,
  evaluateConditions,
  lintConditions,
  resolveRule,
  roundingFactorFor,
} from "../src/features/logic/evaluate";
import { RULE_DEFAULTS } from "../src/features/logic/defaults";
import {
  createCondition,
  createRule,
  isRule,
  isRuleList,
  NO_ROUNDING_RULE_ID,
  SPACING_ROUNDING_RULE_ID,
  TEXT_SIZE_ROUNDING_RULE_ID,
  WHOLE_NUMBERS_RULE_ID,
  type RoundingRule,
} from "../src/features/logic/model";
import { summarizeRoundingRule } from "../src/features/logic/registry";
import {
  legacySpacingRounding,
  legacyTextRounding,
} from "../src/features/logic/legacy";
import { consumersOf, draftRuleImpact } from "../src/features/logic/consumers";
import { normalizeRuleState } from "../src/features/logic/integrity";
import {
  addRuleAtom,
  removeRuleAtom,
  replaceRuleAtom,
  restoreRuleAtom,
  ruleConsumersAtom,
  rulesAtom,
  setRuleReferenceAtom,
} from "../src/features/logic/state";
import { TYPOGRAPHY_DEFAULTS } from "../src/features/typography/defaults";
import { typographyDocumentAtom } from "../src/features/typography/state";
import { SPACING_DEFAULTS } from "../src/features/spacing/defaults";
import {
  spacingDocumentAtom,
  generatedSpacingAtom,
} from "../src/features/spacing/state";
import { designSystemDefaults } from "../src/data/defaults";

const rule = (id: string) =>
  RULE_DEFAULTS.find((candidate) => candidate.id === id) as RoundingRule;
assert.ok(isRuleList(RULE_DEFAULTS));

// The shipped spacing rule is the reference getRoundingFactor() ladder.
function getRoundingFactor(raw: number) {
  if (raw < 2) return 1;
  if (raw < 10) return 2;
  if (raw < 28) return 4;
  if (raw < 56) return 8;
  if (raw < 96) return 16;
  if (raw < 256) return 24;
  return 32;
}
const spacing = rule(SPACING_ROUNDING_RULE_ID);
for (let raw = -5; raw <= 600; raw += 0.25)
  assert.equal(
    roundingFactorFor(spacing, raw),
    getRoundingFactor(raw),
    `factor at ${raw}`,
  );
for (const [raw, factor] of [
  [1.99, 1],
  [2, 2],
  [9.99, 2],
  [10, 4],
  [27.99, 4],
  [28, 8],
  [55.99, 8],
  [56, 16],
  [95.99, 16],
  [96, 24],
  [255.99, 24],
  [256, 32],
  [10_000, 32],
]) {
  assert.equal(roundingFactorFor(spacing, raw), factor, `boundary ${raw}`);
}

// Comparators at their threshold, first match wins, default otherwise.
const body = (comparator: "lt" | "lte" | "gt" | "gte") => ({
  defaultOutcome: { factor: 9 },
  conditions: [{ id: "c", comparator, threshold: 10, outcome: { factor: 1 } }],
});
assert.equal(evaluateConditions(body("lt"), 10).outcome.factor, 9);
assert.equal(evaluateConditions(body("lte"), 10).outcome.factor, 1);
assert.equal(evaluateConditions(body("gt"), 10).outcome.factor, 9);
assert.equal(evaluateConditions(body("gte"), 10).outcome.factor, 1);
assert.equal(evaluateConditions(body("gt"), 11).conditionId, "c");
assert.equal(
  evaluateConditions(
    {
      defaultOutcome: { factor: 9 },
      conditions: [
        { id: "a", comparator: "lt", threshold: 5, outcome: { factor: 1 } },
        { id: "b", comparator: "lt", threshold: 50, outcome: { factor: 2 } },
      ],
    },
    3,
  ).conditionId,
  "a",
);

// Universal formula with depth; factor 0 is no rounding; depth 1 keeps exact arithmetic.
assert.equal(roundToFactor(3.1, 2, 1), 4);
assert.equal(roundToFactor(0.031, 2, 100), 0.04);
assert.equal(roundToFactor(3.14159, 1, 100), 3.14);
assert.equal(roundToFactor(7.3, 0, 10), 7.3);
assert.equal(applyRoundingRule(rule(NO_ROUNDING_RULE_ID), 7.3), 7.3);
assert.equal(applyRoundingRule(rule(TEXT_SIZE_ROUNDING_RULE_ID), 11.4), 11);
assert.equal(applyRoundingRule(rule(TEXT_SIZE_ROUNDING_RULE_ID), 13.1), 14);
for (const value of [0.1, 3.3, 15.75, 123.456])
  assert.equal(roundToFactor(value, 2), Math.round(value / 2) * 2);

// Lint: shadowed rows and an unreachable default.
const shadowed = lintConditions([
  { id: "wide", comparator: "lt", threshold: 10, outcome: { factor: 1 } },
  { id: "narrow", comparator: "lt", threshold: 2, outcome: { factor: 1 } },
  { id: "equal", comparator: "lt", threshold: 10, outcome: { factor: 1 } },
  { id: "reach", comparator: "lte", threshold: 10, outcome: { factor: 1 } },
]);
assert.deepEqual(shadowed.unreachable, ["narrow", "equal"]);
assert.equal(shadowed.defaultReachable, true);
const covering = lintConditions([
  { id: "low", comparator: "lt", threshold: 5, outcome: { factor: 1 } },
  { id: "high", comparator: "gte", threshold: 5, outcome: { factor: 2 } },
  { id: "dead", comparator: "gt", threshold: 100, outcome: { factor: 3 } },
]);
assert.deepEqual(covering.unreachable, ["dead"]);
assert.equal(covering.defaultReachable, false);
assert.deepEqual(lintConditions(spacing.conditions), {
  unreachable: [],
  defaultReachable: true,
});

assert.equal(
  summarizeRoundingRule(spacing),
  "< 2 → 1 · < 10 → 2 · < 28 → 4 · < 56 → 8 · < 96 → 16 · < 256 → 24 · otherwise 32",
);
assert.equal(summarizeRoundingRule(rule(NO_ROUNDING_RULE_ID)), "always None");
assert.equal(resolveRule(RULE_DEFAULTS, "missing").id, WHOLE_NUMBERS_RULE_ID);
assert.ok(isRule(createRule()));
assert.ok(!isRule({ ...createRule(), depth: 5 }));
assert.ok(!isRule({ ...createRule(), defaultOutcome: { factor: -1 } }));

// Legacy inline settings map to shipped rules, or to equivalent migrated rules.
assert.deepEqual(legacyTextRounding(2, 12, 1), {
  ruleId: TEXT_SIZE_ROUNDING_RULE_ID,
});
const customText = legacyTextRounding(1, 16, 2).pendingRule as RoundingRule;
assert.equal(roundingFactorFor(customText, 15), 2);
assert.equal(roundingFactorFor(customText, 16), 1);
const legacySteps = [
  { below: 2, factor: 1 },
  { below: 10, factor: 2 },
  { below: 28, factor: 4 },
  { below: 56, factor: 8 },
  { below: 96, factor: 16 },
  { below: 256, factor: 24 },
  { below: null, factor: 32 },
];
assert.deepEqual(legacySpacingRounding("s", "Global", legacySteps), {
  ruleId: SPACING_ROUNDING_RULE_ID,
});
const customSpacing = legacySpacingRounding("s", "Tight", [
  { below: 4, factor: 1 },
  { below: null, factor: 4 },
]).pendingRule as RoundingRule;
assert.equal(roundingFactorFor(customSpacing, 3), 1);
assert.equal(roundingFactorFor(customSpacing, 30), 4);

const stagedSpacingRule = {
  ...customSpacing,
  id: "rule-migrated-spacing-custom",
};
const migratedSpacing = {
  ...SPACING_DEFAULTS,
  scales: [
    SPACING_DEFAULTS.scales[0],
    {
      ...SPACING_DEFAULTS.scales[0],
      id: "custom",
      name: "Tight",
      roundingRuleId: stagedSpacingRule.id,
    },
  ],
  pendingRules: [stagedSpacingRule],
};

// Integrity: staged rules join the library, missing references fall back, built-ins are restored.
const normalized = normalizeRuleState({
  rules: RULE_DEFAULTS.filter(
    (candidate) => candidate.id !== WHOLE_NUMBERS_RULE_ID,
  ),
  typography: { ...TYPOGRAPHY_DEFAULTS, textRoundingRuleId: "gone" },
  spacing: migratedSpacing,
});
assert.ok(
  normalized.rules.some((candidate) => candidate.id === WHOLE_NUMBERS_RULE_ID),
);
assert.ok(
  normalized.rules.some(
    (candidate) => candidate.id === "rule-migrated-spacing-custom",
  ),
);
assert.equal(normalized.typography.textRoundingRuleId, WHOLE_NUMBERS_RULE_ID);
assert.equal(normalized.spacing.pendingRules, undefined);
assert.deepEqual(normalizeRuleState(normalized).corrections, [], "idempotent");
assert.deepEqual(
  normalizeRuleState({
    rules: [...RULE_DEFAULTS],
    typography: TYPOGRAPHY_DEFAULTS,
    spacing: SPACING_DEFAULTS,
  }).corrections,
  [],
  "shipped defaults need no correction",
);

// Consumers, impact, CRUD, deletion fallback, and undo.
const documents = {
  typography: TYPOGRAPHY_DEFAULTS,
  spacing: SPACING_DEFAULTS,
};
assert.deepEqual(
  consumersOf(SPACING_ROUNDING_RULE_ID, documents).map(
    (consumer) => consumer.label,
  ),
  ["Spacing › Global"],
);
const coarse = { ...spacing, conditions: [], defaultOutcome: { factor: 32 } };
const [impact] = draftRuleImpact(coarse, RULE_DEFAULTS, documents);
assert.ok(impact.changed > 0);
assert.ok(
  impact.issues.includes("duplicate"),
  "coarse rounding collapses spacing values",
);

const store = createStore();
const shipped = designSystemDefaults.system;
const shippedConsumerCount =
  2 +
  (["spacing", "size", "radius"] as const).reduce(
    (count, domain) => count + shipped.foundations[domain].scales.length,
    0,
  ) +
  shipped.foundations.color.scales.filter((scale) => scale.customContrasts)
    .length +
  shipped.structures.structures.reduce(
    (count, structure) =>
      count + (structure.generation?.applications.length ?? 0),
    0,
  );
assert.equal(store.get(ruleConsumersAtom).length, shippedConsumerCount);
const custom = {
  ...createRule(),
  name: "Quarters",
  depth: 100 as const,
  defaultOutcome: { factor: 25 },
};
store.set(addRuleAtom, custom);
const globalConsumer = store
  .get(ruleConsumersAtom)
  .find((consumer) => consumer.label === "Spacing › Global")!;
store.set(setRuleReferenceAtom, {
  consumer: globalConsumer,
  ruleId: custom.id,
});
assert.equal(
  store.get(spacingDocumentAtom).scales[0].roundingRuleId,
  custom.id,
);
store.set(replaceRuleAtom, { ...custom, defaultOutcome: { factor: 50 } });
assert.ok(
  store
    .get(generatedSpacingAtom)[0]
    .values.every(
      (value) => Math.abs(value.value * 2 - Math.round(value.value * 2)) < 1e-9,
    ),
);
store.set(replaceRuleAtom, {
  ...rule(WHOLE_NUMBERS_RULE_ID),
  defaultOutcome: { factor: 5 },
});
assert.equal(
  (
    store
      .get(rulesAtom)
      .find(
        (candidate) => candidate.id === WHOLE_NUMBERS_RULE_ID,
      ) as RoundingRule
  ).defaultOutcome.factor,
  1,
  "locked rules are read-only",
);
assert.equal(store.set(removeRuleAtom, WHOLE_NUMBERS_RULE_ID), null);
const removed = store.set(removeRuleAtom, custom.id)!;
assert.equal(
  store.get(spacingDocumentAtom).scales[0].roundingRuleId,
  WHOLE_NUMBERS_RULE_ID,
);
store.set(restoreRuleAtom, removed);
assert.equal(
  store.get(spacingDocumentAtom).scales[0].roundingRuleId,
  custom.id,
);
assert.ok(store.get(rulesAtom).some((candidate) => candidate.id === custom.id));
const textConsumer = store
  .get(ruleConsumersAtom)
  .find((consumer) => consumer.id === "typography/text-size")!;
store.set(setRuleReferenceAtom, {
  consumer: textConsumer,
  ruleId: "not-a-rule",
});
assert.equal(
  store.get(typographyDocumentAtom).textRoundingRuleId,
  TEXT_SIZE_ROUNDING_RULE_ID,
  "unknown rule ids are rejected",
);
assert.ok(createCondition(5, 2).id.startsWith("condition-"));

console.log("Rules checks passed.");
