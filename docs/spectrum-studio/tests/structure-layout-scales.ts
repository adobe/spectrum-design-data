// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { createStore } from "jotai";
import {
  captureSnapshot,
  enterEditModeAtom,
  cancelEditAtom,
  saveEditAtom,
  resetAllAuthoringAtom,
  editSessionSnapshotAtom,
} from "../src/features/edit-session/state";
import {
  createStructure,
  assignStructure,
  structureBindingId,
  structureGeneration,
} from "../src/features/structures/model";
import { SIZE_TERM_IDS } from "../src/features/taxonomy/variantVocabulary";
import { isTshirtRule } from "../src/features/logic/model";
import {
  createLayoutScale,
  layoutScaleQuestions,
  resolveLayoutScaleProposal,
} from "../src/features/structures/layoutScales";
import { generateDimensionScale } from "../src/features/scales/foundation";
import { primitiveReferenceId } from "../src/features/tokens/primitiveIdentity";
import {
  answerLayoutScaleAtom,
  pendingLayoutScaleAtom,
  requestLayoutScaleAtom,
} from "../src/features/structures/layoutScaleState";
import {
  assignStructureAtom,
  applyStructureRuleAtom,
} from "../src/features/structures/state";
import { UNMEASURED_LAYOUT } from "../src/features/structures/resolution";
import { createScaleType } from "../src/features/scales/scaleType";
import { scaleTypesAtom } from "../src/features/logic/scaleTypeLibrary";
import { removeSpacingScaleAtom } from "../src/features/spacing/state";
import {
  addRuleAtom,
  replaceRuleAtom,
  saveGeneratorDraftAtom,
} from "../src/features/logic/state";
import { emptyGeneratorEdit } from "../src/features/logic/generatorEdit";

const store = createStore();
store.set(enterEditModeAtom);
const original = captureSnapshot(store.get);
const rule = original.rules!.find(
  (item) => isTshirtRule(item) && item.movement !== "ratio",
)!;
assert(isTshirtRule(rule));
const application = {
  id: crypto.randomUUID(),
  ruleId: rule.id,
  targets: { kind: "all" as const },
};
const structure = {
  ...createStructure("Layout"),
  generation: {
    sizeTermIds: Object.values(SIZE_TERM_IDS),
    applications: [application],
  },
};
const snapshot = {
  ...original,
  structures: { ...original.structures!, structures: [structure] },
  rules: original.rules!.map((item) =>
    item.id === rule.id
      ? { ...rule, applicability: { kind: "all" as const } }
      : item,
  ),
};
const edit = {
  structureId: structure.conceptId,
  changes: {
    paddingLeft: {
      value: { kind: "number" as const, value: 11, unit: "px" as const },
    },
    paddingRight: {
      value: { kind: "number" as const, value: 11, unit: "px" as const },
    },
  },
};
const questions = layoutScaleQuestions(snapshot, edit);
assert.equal(questions.length, 1);
assert.deepEqual(questions[0].slots, ["paddingLeft", "paddingRight"]);
assert.deepEqual(
  layoutScaleQuestions(snapshot, {
    ...edit,
    changes: {
      paddingLeft: {
        value: { kind: "number", value: 1.5, unit: "multiplier" },
      },
    },
  }),
  [],
  "Unitless multipliers are not converted into pixel scales.",
);
const before = structuredClone(snapshot);
const retired = {
  ...rule,
  movement: "ratio" as const,
  ratio: { kind: "value" as const, value: 1.125 },
};
for (const action of [
  () => store.set(addRuleAtom, retired),
  () => store.set(replaceRuleAtom, retired),
  () =>
    store.set(saveGeneratorDraftAtom, {
      rule: retired,
      edit: emptyGeneratorEdit(),
    }),
])
  assert.throws(action, /retired/);
const resolved = resolveLayoutScaleProposal({
  source: snapshot,
  edit,
  questions,
  answers: [{ kind: "formula", formulaId: "scale-type-typography" }],
});
assert.deepEqual(
  snapshot,
  before,
  "Draft resolution does not mutate its source.",
);
assert.equal(
  resolved.spacing!.scales.length,
  snapshot.spacing!.scales.length + 1,
);
const scale = resolved.spacing!.scales[0];
const numericSnapshot = {
  ...snapshot,
  rules: snapshot.rules!.map((item) =>
    item.id === rule.id
      ? {
          ...rule,
          applicability: { kind: "all" as const },
          movement: "scale-index" as const,
          mappings: rule.mappings.map((mapping) => ({
            ...mapping,
            offset: mapping.offset * 100,
          })),
        }
      : item,
  ),
};
const numericResolved = resolveLayoutScaleProposal({
  source: numericSnapshot,
  edit,
  questions: layoutScaleQuestions(numericSnapshot, edit),
  answers: [{ kind: "formula", formulaId: "scale-type-typography" }],
});
assert.equal(numericResolved.spacing!.scales[0].below, 2);
assert.equal(
  numericResolved.spacing!.scales[0].above,
  2,
  "Numeric-index offsets are not mistaken for hundreds of formula steps.",
);
assert.equal(scale.base, 11);
assert.equal(scale.scaleTypeId, "scale-type-typography");
const bindings = resolved.structures!.structures[0].properties.filter((item) =>
  [
    structureBindingId(structure.conceptId, "paddingLeft"),
    structureBindingId(structure.conceptId, "paddingRight"),
  ].includes(item.id),
);
assert.equal(bindings.length, 2);
for (const binding of bindings) {
  assert("$ref" in binding);
  assert.equal(binding.$ref, primitiveReferenceId("spacing", scale.id, 0));
}
assert.equal(
  generateDimensionScale(
    "spacing",
    scale,
    resolved.rules,
    resolved.scaleTypes,
  ).find((item) => item.index === 0)!.value,
  11,
);
const fixed = resolveLayoutScaleProposal({
  source: snapshot,
  edit,
  questions,
  answers: [{ kind: "static" }],
});
assert.equal(fixed.spacing, snapshot.spacing);
const fixedApplication = structureGeneration(fixed.structures!.structures[0])
  .applications[0];
assert.equal(fixedApplication.targets.kind, "custom");
if (fixedApplication.targets.kind === "custom") {
  assert(!fixedApplication.targets.bindingIds.includes(bindings[0].id));
}
assert.deepEqual(fixedApplication.previewTargets, { kind: "all" });
const tokenEdit = {
  ...edit,
  changes: {
    paddingLeft: { $ref: primitiveReferenceId("spacing", scale.id, 0) },
  },
};
assert.equal(layoutScaleQuestions(fixed, tokenEdit)[0].kind, "token");
assert.equal(layoutScaleQuestions(resolved, tokenEdit).length, 0);
const noRules = {
  ...snapshot,
  structures: {
    ...snapshot.structures,
    structures: [{ ...structure, generation: undefined }],
  },
};
assert.equal(layoutScaleQuestions(noRules, edit).length, 0);
assert.throws(
  () =>
    resolveLayoutScaleProposal({
      source: snapshot,
      edit,
      questions,
      answers: [],
    }),
  /every value/,
);
assert.throws(
  () =>
    createLayoutScale(
      snapshot,
      "spacing",
      11,
      "scale-type-typography",
      [-10, 0, 1],
      "rule-whole-numbers",
    ),
  /range/,
);
const locked = {
  ...snapshot,
  scaleTypes: snapshot.scaleTypes!.map((item) =>
    item.id === "scale-type-typography"
      ? { ...item, base: { ...item.base, overridable: false } }
      : item,
  ),
};
assert.throws(
  () =>
    createLayoutScale(
      locked,
      "spacing",
      11,
      "scale-type-typography",
      [-2, 0, 2],
      "rule-whole-numbers",
    ),
  /locks its base/,
);
const literalSource = assignStructure(structure, edit.changes);
assert.equal(
  layoutScaleQuestions(
    {
      ...snapshot,
      structures: { ...snapshot.structures, structures: [literalSource] },
    },
    edit,
    application,
  ).length,
  1,
);
const base = original.structures!.structures.find(
  (item) => item.name === "Base",
)!;
assert(base);
const baseEdit = { ...edit, structureId: base.conceptId };
assert.equal(store.set(requestLayoutScaleAtom, { edit: baseEdit }), true);
assert.deepEqual(
  captureSnapshot(store.get),
  original,
  "Opening the dialog is not an authored edit.",
);
store.set(pendingLayoutScaleAtom, null);
assert.deepEqual(
  captureSnapshot(store.get),
  original,
  "Cancel leaves no scale, formula, or Registry term.",
);
assert.equal(store.set(requestLayoutScaleAtom, { edit: baseEdit }), true);
store.set(answerLayoutScaleAtom, { kind: "static" });
assert.equal(store.get(pendingLayoutScaleAtom), null);
const committed = captureSnapshot(store.get);
assert.deepEqual(committed.spacing, original.spacing);
assert.deepEqual(committed.scaleTypes, original.scaleTypes);
const staticPadding = committed
  .structures!.structures.find((item) => item.conceptId === base.conceptId)!
  .properties.find(
    (item) => item.id === structureBindingId(base.conceptId, "paddingLeft"),
  )!;
assert("value" in staticPadding && staticPadding.value.kind === "number");
assert.equal(staticPadding.value.value, 11);

store.set(applyStructureRuleAtom, {
  structureId: base.conceptId,
  application: {
    ...structureGeneration(
      committed.structures!.structures.find(
        (item) => item.conceptId === base.conceptId,
      )!,
    ).applications.find(
      (item) => item.ruleId === "279534c2-f430-480b-b408-6d0ed765f97a",
    )!,
    targets: {
      kind: "custom",
      bindingIds: [
        structureBindingId(base.conceptId, "paddingLeft"),
        structureBindingId(base.conceptId, "paddingRight"),
      ],
    },
  },
});
assert(
  store
    .get(pendingLayoutScaleAtom)
    ?.questions.some((question) => question.slots.includes("paddingLeft")),
);
assert.deepEqual(
  captureSnapshot(store.get),
  committed,
  "Applying a rule to literals is pending until every choice is accepted.",
);
store.set(pendingLayoutScaleAtom, null);

store.set(assignStructureAtom, {
  id: base.conceptId,
  changes: {
    paddingLeft: {
      $ref: primitiveReferenceId("spacing", original.spacing!.scales[0].id, 0),
    },
  },
  layout: UNMEASURED_LAYOUT,
});
assert.equal(store.get(pendingLayoutScaleAtom)!.questions[0].kind, "token");
assert.deepEqual(
  captureSnapshot(store.get),
  committed,
  "A token does not silently re-enroll a static property.",
);
store.set(answerLayoutScaleAtom, {
  kind: "follow",
  applicationId: structureGeneration(
    committed.structures!.structures.find(
      (item) => item.conceptId === base.conceptId,
    )!,
  ).applications.find(
    (item) => item.ruleId === "279534c2-f430-480b-b408-6d0ed765f97a",
  )!.id,
});
const reEnrolled = captureSnapshot(store.get).structures!.structures.find(
  (item) => item.conceptId === base.conceptId,
)!;
assert(
  structureGeneration(reEnrolled).applications.some(
    (item) =>
      item.targets.kind === "custom" &&
      item.targets.bindingIds.includes(staticPadding.id),
  ),
);

const formulaStore = createStore();
formulaStore.set(enterEditModeAtom);
const formulaBefore = captureSnapshot(formulaStore.get);
formulaStore.set(assignStructureAtom, {
  id: base.conceptId,
  changes: baseEdit.changes,
  layout: UNMEASURED_LAYOUT,
});
assert(formulaStore.get(pendingLayoutScaleAtom));
const template = createScaleType("expression");
const draft = {
  ...template,
  name: "Layout progression",
  base: { ...template.base, overridable: true },
};
formulaStore.set(answerLayoutScaleAtom, {
  kind: "formula",
  formulaId: draft.id,
  formula: draft,
});
const applied = captureSnapshot(formulaStore.get);
assert.equal(
  applied.spacing!.scales.length,
  formulaBefore.spacing!.scales.length + 1,
);
assert.equal(
  applied.scaleTypes!.find((item) => item.id === draft.id)?.name,
  draft.name,
);
assert.equal(applied.spacing!.scales[0].base, 11);
assert.equal(applied.spacing!.scales[0].componentSizeScaling, true);
assert.throws(
  () => formulaStore.set(removeSpacingScaleAtom, applied.spacing!.scales[0].id),
  /reference|Structure|used|bound/i,
  "A scale used by a Structure cannot be deleted.",
);
formulaStore.set(saveEditAtom);
assert.equal(
  formulaStore.get(editSessionSnapshotAtom)!.spacing!.scales[0].id,
  applied.spacing!.scales[0].id,
);
formulaStore.set(enterEditModeAtom);
formulaStore.set(requestLayoutScaleAtom, {
  edit: {
    ...baseEdit,
    changes: {
      paddingLeft: { value: { kind: "number", value: 17, unit: "px" } },
    },
  },
});
formulaStore.set(answerLayoutScaleAtom, {
  kind: "formula",
  formulaId: draft.id,
});
assert.equal(
  captureSnapshot(formulaStore.get).spacing!.scales.length,
  applied.spacing!.scales.length + 1,
  "A separate edit creates a separate scale even when it reuses a formula.",
);
formulaStore.set(cancelEditAtom);
assert.equal(
  captureSnapshot(formulaStore.get).spacing!.scales.length,
  applied.spacing!.scales.length,
);
assert.equal(formulaStore.get(pendingLayoutScaleAtom), null);
formulaStore.set(enterEditModeAtom);
formulaStore.set(requestLayoutScaleAtom, { edit: baseEdit });
formulaStore.set(scaleTypesAtom, [
  ...formulaStore.get(scaleTypesAtom),
  {
    ...createScaleType("linear"),
    name: "An unrelated edit",
  },
]);
const stale = captureSnapshot(formulaStore.get);
assert.throws(
  () => formulaStore.set(answerLayoutScaleAtom, { kind: "static" }),
  /data changed/,
);
assert.deepEqual(
  captureSnapshot(formulaStore.get),
  stale,
  "Stale choices fail without partial writes.",
);
formulaStore.set(resetAllAuthoringAtom);
assert.equal(formulaStore.get(pendingLayoutScaleAtom), null);
assert.deepEqual(captureSnapshot(formulaStore.get).spacing, original.spacing);
assert.deepEqual(
  captureSnapshot(formulaStore.get).scaleTypes,
  original.scaleTypes,
);

const multiStore = createStore();
multiStore.set(enterEditModeAtom);
const multiBefore = captureSnapshot(multiStore.get);
const multiEdit = {
  ...baseEdit,
  changes: {
    ...baseEdit.changes,
    paddingRight: {
      value: { kind: "number" as const, value: 12, unit: "px" as const },
    },
  },
};
multiStore.set(requestLayoutScaleAtom, { edit: multiEdit });
assert.equal(multiStore.get(pendingLayoutScaleAtom)!.questions.length, 2);
multiStore.set(answerLayoutScaleAtom, {
  kind: "formula",
  formulaId: draft.id,
  formula: draft,
});
assert.deepEqual(
  captureSnapshot(multiStore.get),
  multiBefore,
  "Earlier formula choices remain pending until all values are resolved.",
);
multiStore.set(pendingLayoutScaleAtom, null);
assert.deepEqual(
  captureSnapshot(multiStore.get),
  multiBefore,
  "Cancelling a multi-value edit leaves no formula, scale, or Registry terms.",
);
console.log("Structure layout scale decisions and source invariants passed.");
