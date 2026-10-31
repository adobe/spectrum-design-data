// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { createStore } from "jotai";
import {
  conditionSources,
  conditionText,
  conditionalIssues,
  evaluateConditionalRule,
  offsetAvailableToken,
  updateConditionTree,
} from "../src/features/logic/conditional";
import { conditionalColorTokens } from "../src/features/logic/conditionalPreview";
import {
  createRule,
  createRuleGroup,
  INTERACTION_COLORS_RULE_ID,
  isRule,
  type ConditionalRule,
  type RuleCondition,
} from "../src/features/logic/model";
import { designSystemDefaults } from "../src/data/defaults";
import { createDefaultSnapshot } from "../src/features/edit-session/state";
import { upgradeConditionalRulesSnapshot } from "../src/features/edit-session/conditionalRulesUpgrade";
import { compareAuthoring } from "../src/features/changelog/registry";
import { readPath, restorePath } from "../src/features/changelog/contract";
import {
  addRuleAtom,
  replaceRuleAtom,
  removeRuleAtom,
  restoreRuleAtom,
  rulesAtom,
} from "../src/features/logic/state";
import { resolveRule } from "../src/features/logic/evaluate";
import { draftRuleImpact } from "../src/features/logic/consumers";
import { ruleFields } from "../src/features/changelog/changes";
import {
  AUTHORING_RECORD_VERSION,
  AUTHORING_STORAGE_KEY,
  readAuthoringRecord,
} from "../src/features/edit-session/storage";
import { isSnapshot } from "../src/features/edit-session/state";

const shipped = createDefaultSnapshot();
const example = shipped.rules.find(
  (rule): rule is ConditionalRule =>
    rule.id === INTERACTION_COLORS_RULE_ID && rule.type === "conditional",
)!;
assert.ok(example && isRule(example));
const sources = conditionSources(shipped.taxonomy, shipped.modeSets);
assert.deepEqual(conditionalIssues(example, sources), []);
const background = example.when.children[0] as RuleCondition;
const emphasized = example.when.children[1] as RuleCondition;
const states = example.when.children[2];
assert.equal(states.kind, "group");
if (states.kind !== "group") throw new Error("Missing state group.");
const hover = states.children[0] as RuleCondition;
const focus = states.children[1] as RuleCondition;
const mode = example.branches[0].when.children[0] as RuleCondition;
const context = {
  classification: {
    [background.sourceId]: background.valueId,
    [emphasized.sourceId]: emphasized.valueId,
    [hover.sourceId]: hover.valueId,
  },
  modes: { [mode.sourceId]: "mode-light" },
};
for (const state of [hover.valueId, focus.valueId])
  for (const [modeId, offset] of [
    ["mode-light", 1],
    ["mode-dark", -1],
  ] as const) {
    const result = evaluateConditionalRule(
      example,
      {
        classification: { ...context.classification, [hover.sourceId]: state },
        modes: { [mode.sourceId]: modeId },
      },
      sources,
    );
    assert.equal(result.status, "ready");
    if (result.status === "ready") {
      assert.equal(result.matched, true);
      assert.equal(result.offset, offset);
    }
  }
for (const category of [
  background.sourceId,
  emphasized.sourceId,
  hover.sourceId,
]) {
  const classification = { ...context.classification };
  delete classification[category];
  assert.deepEqual(
    evaluateConditionalRule(example, { ...context, classification }, sources),
    { status: "ready", matched: false, branchId: null, offset: 0 },
  );
}
const dark = { ...context, modes: { [mode.sourceId]: "mode-dark" } };
const invalidSource = sources.filter(
  (source) => source.id !== background.sourceId,
);
assert.equal(
  evaluateConditionalRule(example, context, invalidSource).status,
  "unavailable",
);
assert.equal(
  evaluateConditionalRule(example, { ...context, modes: {} }, sources).status,
  "unavailable",
);
assert.equal(
  evaluateConditionalRule(
    example,
    {
      ...context,
      classification: {
        ...context.classification,
        [background.sourceId]: "deleted",
      },
    },
    sources,
  ).status,
  "unavailable",
);
const renamed = sources.map((source) => ({
  ...source,
  label: "Renamed",
  values: source.values.map((value) => ({ ...value, label: "Renamed value" })),
}));
assert.deepEqual(
  evaluateConditionalRule(example, dark, sources),
  evaluateConditionalRule(example, dark, renamed),
);
assert.match(conditionText(background, renamed), /Renamed is Renamed value/);
const customModeSources = sources.map((source) =>
  source.id === mode.sourceId
    ? {
        ...source,
        values: [...source.values, { id: "custom", label: "Custom" }],
      }
    : source,
);
const custom = evaluateConditionalRule(
  example,
  { ...context, modes: { [mode.sourceId]: "custom" } },
  customModeSources,
);
assert.equal(
  custom.status === "ready" && custom.offset,
  1,
  "Otherwise applies beyond explicitly Light.",
);
assert.ok(conditionalIssues(createRule("conditional"), sources).length);
const duplicate = structuredClone(example);
duplicate.when.children.push({ ...background });
assert.equal(isRule(duplicate), false);
assert.equal(isRule({ ...example, otherwise: { offset: 0.1 } }), false);
assert.equal(
  isRule({ ...example, when: { ...example.when, operator: "xor" } }),
  false,
);
const empty = { ...example, when: createRuleGroup("or") };
assert.equal(
  evaluateConditionalRule(empty, context, sources).status,
  "unavailable",
);
const inverted = {
  ...example,
  when: {
    ...example.when,
    children: [{ ...background, matcher: "is-not" as const }],
  },
};
const invertedResult = evaluateConditionalRule(inverted, context, sources);
assert.equal(
  invertedResult.status === "ready" && invertedResult.matched,
  false,
);
const memberContext = {
  ...context,
  classification: {
    ...context.classification,
    [hover.sourceId]: [hover.valueId, focus.valueId],
  },
};
assert.equal(
  evaluateConditionalRule(example, memberContext, sources).status,
  "ready",
);
const addedGroup = createRuleGroup();
const tree = updateConditionTree(example.when, states.id, (node) =>
  node.kind === "group"
    ? { ...node, children: [...node.children, addedGroup] }
    : node,
);
assert.notDeepEqual(tree, example.when);
assert.equal(states.children.length, 2, "Tree updates are immutable.");
const removed = updateConditionTree(tree, addedGroup.id, () => null);
assert.deepEqual(removed, example.when);
const firstWins = structuredClone(example);
firstWins.branches.push({
  ...structuredClone(firstWins.branches[0]),
  id: "later",
  when: {
    ...structuredClone(firstWins.branches[0].when),
    id: "later-group",
    children: [{ ...mode, id: "later-condition" }],
  },
  then: { offset: -3 },
});
const first = evaluateConditionalRule(firstWins, dark, sources);
assert.equal(first.status === "ready" && first.offset, -1);

const tokens = [10, 75, 900].map((index, i) => ({
  id: String(index),
  sourceId: "blue",
  index: i,
  name: `Blue ${index}`,
  value: "#123456",
}));
assert.equal(offsetAvailableToken("75", tokens, 1).token.id, "900");
assert.equal(
  offsetAvailableToken("75", [...tokens].reverse(), -1).token.id,
  "10",
);
assert.match(offsetAvailableToken("900", tokens, 1).warning!, /endpoint/);
assert.match(offsetAvailableToken("10", tokens, -1).warning!, /endpoint/);
assert.equal(offsetAvailableToken("75", tokens, 0).warning, undefined);
assert.throws(() => offsetAvailableToken("missing", tokens, 1), /available/);
assert.throws(() => offsetAvailableToken("75", tokens, NaN), /integer/);
assert.throws(
  () => offsetAvailableToken("75", [...tokens, tokens[0]], 1),
  /ambiguous/,
);

const legacy = {
  ...shipped,
  rules: shipped.rules.filter((rule) => rule.id !== example.id),
};
const upgraded = upgradeConditionalRulesSnapshot(legacy);
assert.deepEqual(upgraded.rules.at(-1), example);
assert.equal(upgradeConditionalRulesSnapshot(upgraded), upgraded);
assert.equal(
  legacy.rules.some((rule) => rule.id === example.id),
  false,
);
const authored = { ...example, name: "My edited example" };
const preserved = {
  ...shipped,
  rules: shipped.rules.map((rule) =>
    rule.id === authored.id ? authored : rule,
  ),
};
assert.equal(upgradeConditionalRulesSnapshot(preserved), preserved);
const stored = new Map<string, string>();
Object.defineProperty(globalThis, "window", {
  configurable: true,
  value: {
    localStorage: { getItem: (key: string) => stored.get(key) ?? null },
  },
});
function validateSnapshot(value: unknown): asserts value is typeof shipped {
  assert.ok(isSnapshot(value) && value);
}
stored.set(
  AUTHORING_STORAGE_KEY,
  JSON.stringify({
    version: 18,
    working: legacy,
    saved: {
      ...legacy,
      rules: legacy.rules.map((rule) => ({
        ...rule,
        description: `${rule.description} Saved`,
      })),
    },
    isEditing: true,
    attachments: {},
    savedAttachments: {},
  }),
);
const record = readAuthoringRecord(validateSnapshot, (value) => {
  validateSnapshot(value);
  return upgradeConditionalRulesSnapshot(value);
})!;
assert.equal(record.version, AUTHORING_RECORD_VERSION);
assert.ok(record.working.rules.some((rule) => rule.id === example.id));
assert.ok(record.saved.rules.some((rule) => rule.id === example.id));
assert.notEqual(
  record.working.rules[0].description,
  record.saved.rules[0].description,
);
stored.set(
  AUTHORING_STORAGE_KEY,
  JSON.stringify({
    ...record,
    working: legacy,
    saved: legacy,
    version: AUTHORING_RECORD_VERSION,
  }),
);
const deletion = readAuthoringRecord(validateSnapshot, () => {
  throw new Error("Current records must not upgrade.");
})!;
assert.ok(!deletion.working.rules.some((rule) => rule.id === example.id));
Reflect.deleteProperty(globalThis, "window");

const working = structuredClone(shipped);
const changed = working.rules.find(
  (rule): rule is ConditionalRule =>
    rule.id === example.id && rule.type === "conditional",
)!;
changed.otherwise.offset = 2;
changed.branches[0].then.offset = -2;
const comparison = compareAuthoring(shipped, working);
const fields = comparison.groups
  .flatMap((group) => group.items)
  .filter((item) => item.title === example.name)
  .flatMap((item) => item.fields);
assert.equal(fields.length, 2);
assert.equal(
  comparison.slots.filter((slot) => slot.category === "rules" && slot.changed)
    .length,
  2,
);
const address = fields.find((field) =>
  field.address?.path.includes("otherwise"),
)!.address!;
const reset = restorePath(working, shipped, address);
const resetRule = reset.rules.find(
  (rule): rule is ConditionalRule =>
    rule.id === example.id && rule.type === "conditional",
)!;
assert.equal(resetRule.otherwise.offset, 1);
assert.equal(resetRule.branches[0].then.offset, -2);
assert.equal(readPath(working, address.path), 2);
assert.throws(
  () => restorePath({ ...working, rules: shipped.rules }, shipped, address),
  /updated/,
);
assert.ok(ruleFields(example).includes("branches"));
const mutated = structuredClone(shipped);
const mutatedRule = mutated.rules.find(
  (rule): rule is ConditionalRule =>
    rule.id === example.id && rule.type === "conditional",
)!;
const mutatedState = mutatedRule.when.children[2];
if (mutatedState.kind !== "group") throw new Error("Missing state group.");
mutatedState.children.reverse();
mutatedRule.name = "Renamed";
const reordered = compareAuthoring(shipped, mutated);
const reorderFields = reordered.groups
  .flatMap((group) => group.items)
  .flatMap((item) => item.fields);
const order = reorderFields.find((field) => field.address?.collectionOrder)!;
assert.ok(order);
const ordered = restorePath(mutated, shipped, order.address!);
const orderedRule = ordered.rules.find(
  (rule): rule is ConditionalRule =>
    rule.id === example.id && rule.type === "conditional",
)!;
assert.deepEqual(orderedRule.when, example.when);
assert.equal(orderedRule.name, "Renamed");
const beforeAddCount = compareAuthoring(shipped, shipped).slots.filter(
  (slot) => slot.category === "rules",
).length;
const added = {
  ...shipped,
  rules: [...shipped.rules, { ...example, id: "another-rule" }],
};
const addComparison = compareAuthoring(shipped, added);
assert.ok(
  addComparison.slots.filter((slot) => slot.category === "rules").length >
    beforeAddCount,
);
assert.ok(
  addComparison.groups
    .flatMap((group) => group.items)
    .some((item) => item.kind === "new"),
);

const store = createStore();
const draft = {
  ...structuredClone(example),
  id: "new-conditional",
  name: "Custom conditional",
};
store.set(addRuleAtom, draft);
assert.ok(store.get(rulesAtom).some((rule) => rule.id === draft.id));
store.set(replaceRuleAtom, { ...draft, otherwise: { offset: 3 } });
const deleted = store.set(removeRuleAtom, draft.id)!;
assert.ok(!store.get(rulesAtom).some((rule) => rule.id === draft.id));
store.set(restoreRuleAtom, deleted);
assert.ok(store.get(rulesAtom).some((rule) => rule.id === draft.id));
assert.throws(
  () => store.set(addRuleAtom, { ...createRule("conditional"), name: "Empty" }),
  /condition/,
);
assert.throws(
  () => resolveRule(store.get(rulesAtom), draft.id),
  /cannot round/,
);
assert.deepEqual(
  draftRuleImpact(draft, store.get(rulesAtom), {
    typography: shipped.typography,
    spacing: shipped.spacing,
    size: shipped.size,
    radius: shipped.radius,
  }),
  [],
);

const modeSelection = Object.fromEntries(
  shipped.modeSets.map((set) => [set.id, set.defaultModeId]),
);
const localColors = conditionalColorTokens(
  shipped.colorSystem,
  shipped.modeSets,
  modeSelection,
  shipped.rules,
);
assert.ok(localColors.length > 0);
assert.ok(
  localColors.every((token) => token.value && Number.isInteger(token.index)),
);
assert.deepEqual(
  designSystemDefaults.system.rules.find((rule) => rule.id === example.id),
  example,
);
console.log(
  "Conditional rule truth table, references, tree updates, offsets, upgrades, Changes, resets, and library lifecycle passed.",
);
