// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import {
  createBooleanProperty,
  createVariantProperty,
  mergeClassifications,
} from "../src/features/option-groups/model";
import {
  createStructure,
  structureSelection,
  isStructuresDocument,
  upgradeStructuresDocument,
  STRUCTURES_SCHEMA_VERSION,
} from "../src/features/structures/model";
import {
  createElement,
  elementBindingId,
} from "../src/features/structures/elements";
import {
  emptyStructureEditor,
  resolveStructureOptions,
  reconcileVariantLayers,
  optionSlotChanges,
  EMPTY_STRUCTURE_PREVIEW,
  structureVariantIssues,
} from "../src/features/structures/variants";
import { STRUCTURE_TERM_IDS } from "../src/features/structures/vocabulary";
import { hasCustomElementTargets } from "../src/features/structures/elementResolution";
import { primitiveReferenceId } from "../src/features/tokens/primitiveIdentity";
import { SIZE_TERM_IDS } from "../src/features/taxonomy/variantVocabulary";
import type { TaxonomyDocument } from "../src/features/taxonomy/model";
import {
  duplicateVariantOption,
  removeBooleanProperty,
  removeVariantOption,
  reorderLayers,
  renameVariantOption,
  restoreEditorRemoval,
  updateOptionOverrides,
  planLayerInsertion,
  editorAfterLayerInsertion,
} from "../src/features/structures/variantOperations";

const structure = createStructure("Example");
const text = createElement("text");
const icon = createElement("workflowIcon");
const independent = createVariantProperty(
  "Other appearance",
  { [crypto.randomUUID()]: crypto.randomUUID() },
  [
    {
      name: "First",
      classification: { [crypto.randomUUID()]: crypto.randomUUID() },
    },
    {
      name: "Second",
      classification: { [crypto.randomUUID()]: crypto.randomUUID() },
    },
  ],
);
const boolean = createBooleanProperty("Has icon");
const category = crypto.randomUUID();
const property = createVariantProperty(
  "Icon position",
  { [crypto.randomUUID()]: crypto.randomUUID() },
  [
    { name: "Start", classification: { [category]: crypto.randomUUID() } },
    { name: "End", classification: { [category]: crypto.randomUUID() } },
  ],
);
const independentResult = resolveStructureOptions(
  {
    ...structure,
    elements: [icon],
    editor: {
      ...emptyStructureEditor(),
      properties: [property, independent],
      overrides: {
        [property.options[1].id]: {
          elements: {
            [icon.id]: {
              ...icon,
              bindings: [
                {
                  id: elementBindingId(icon.id, "size"),
                  slot: "size",
                  family: "size",
                  $ref: primitiveReferenceId("size", "example", 0),
                },
              ],
            },
          },
        },
        [independent.options[1].id]: {
          elements: { [icon.id]: { ...icon, glyph: "Add" } },
        },
      },
    },
  },
  {
    ...EMPTY_STRUCTURE_PREVIEW,
    options: {
      [property.id]: property.options[1].id,
      [independent.id]: independent.options[1].id,
    },
  },
);
assert.deepEqual(
  independentResult.issues,
  [],
  "Separate properties may change separate fields on the same leaf.",
);
assert.equal(
  independentResult.structure.elements?.[0].kind !== "structureReference" &&
    independentResult.structure.elements?.[0].bindings.length,
  1,
);
assert.equal(
  independentResult.structure.elements?.[0].kind !== "structureReference" &&
    independentResult.structure.elements?.[0].glyph,
  "Add",
);
const editor = emptyStructureEditor();
editor.properties = [property, boolean];
editor.overrides[property.options[1].id] = { order: [icon.id, text.id] };
editor.visibilityBindings[icon.id] = {
  propertyId: boolean.id,
  inverted: false,
};
const authored = { ...structure, elements: [text, icon], editor };
const before = structuredClone(authored);
const preview = {
  ...EMPTY_STRUCTURE_PREVIEW,
  activePropertyId: property.id,
  options: { [property.id]: property.options[1].id },
};
const result = resolveStructureOptions(authored, preview);
assert.deepEqual(result.issues, []);
assert.deepEqual(
  result.structure.elements?.map((item) => item.id),
  [icon.id, text.id],
);
assert.deepEqual(authored, before, "Resolution cannot mutate authored data.");
assert.deepEqual(
  resolveStructureOptions(authored, {
    ...preview,
    booleans: { [boolean.id]: false },
  }).structure.elements?.map((item) => item.id),
  [text.id],
);
const inverted = structuredClone(authored);
inverted.editor.visibilityBindings[icon.id].inverted = true;
assert.deepEqual(
  resolveStructureOptions(inverted, preview).structure.elements?.map(
    (item) => item.id,
  ),
  [text.id],
);
inverted.editor.visibilityBindings[text.id] = {
  propertyId: boolean.id,
  inverted: false,
};
assert.equal(
  resolveStructureOptions(inverted, {
    ...preview,
    booleans: { [boolean.id]: false },
  }).structure.elements?.[0].id,
  icon.id,
);
inverted.editor.visibility[icon.id] = false;
assert.equal(
  resolveStructureOptions(inverted, {
    ...preview,
    booleans: { [boolean.id]: false },
  }).structure.elements?.length,
  0,
  "Saved hidden state takes precedence over booleans.",
);
const retained = reconcileVariantLayers({ ...authored, elements: [text] });
assert.deepEqual(retained.editor?.overrides[property.options[1].id].order, [
  text.id,
]);
assert.deepEqual(retained.editor?.visibilityBindings, {});
const added = createElement("bar");
assert.deepEqual(
  reconcileVariantLayers({
    ...authored,
    elements: [text, icon, added],
  }).editor?.overrides[property.options[1].id].order,
  [icon.id, text.id, added.id],
);
const same = optionSlotChanges(
  authored,
  {},
  { width: structureSelection(authored, "width") },
);
assert.deepEqual(
  same.slots,
  {},
  "Equal default selections inherit instead of copying.",
);
const direction = {
  value: { kind: "term" as const, termId: STRUCTURE_TERM_IDS.vertical },
};
const changed = optionSlotChanges(authored, {}, { direction });
assert.deepEqual(changed.slots, { direction });
const other = createVariantProperty(
  "Orientation",
  { [crypto.randomUUID()]: crypto.randomUUID() },
  [
    { name: "First", classification: { [category]: crypto.randomUUID() } },
    { name: "Second", classification: { [category]: crypto.randomUUID() } },
  ],
);
const conflict = structuredClone(authored);
conflict.editor.properties.push(other);
conflict.editor.overrides[other.options[1].id] = { order: [text.id, icon.id] };
assert.equal(
  resolveStructureOptions(conflict, {
    ...preview,
    options: { ...preview.options, [other.id]: other.options[1].id },
  }).issues.length,
  1,
);
assert.equal(
  mergeClassifications({ [category]: "a" }, { [category]: "b" }).issues.length,
  1,
);
assert.equal(
  mergeClassifications({ [category]: "a" }, { [category]: "a" }).issues.length,
  0,
);
assert.equal(
  isStructuresDocument({ schemaVersion: 4, structures: [authored] }),
  true,
);
assert.equal(
  isStructuresDocument({
    schemaVersion: 4,
    structures: [
      { ...authored, editor: { ...editor, visibility: { [text.id]: "no" } } },
    ],
  }),
  false,
);
assert.throws(() => createVariantProperty("Missing terms", {}, []), /Registry/);

const duplicate = {
  id: crypto.randomUUID(),
  name: "Above",
  classification: { [category]: crypto.randomUUID() },
};
const copied = duplicateVariantOption(
  editor,
  property.id,
  property.options[1].id,
  duplicate,
);
assert.deepEqual(
  copied.overrides[duplicate.id],
  editor.overrides[property.options[1].id],
);
assert.notEqual(
  copied.overrides[duplicate.id],
  editor.overrides[property.options[1].id],
);
assert.throws(
  () => updateOptionOverrides(editor, property.defaultOptionId, {}),
  /non-default/,
);
assert.throws(
  () => duplicateVariantOption(editor, property.id, "removed", duplicate),
  /unavailable/,
);
assert.throws(
  () => removeVariantOption(editor, property.id, property.defaultOptionId),
  /default option/,
);
assert.throws(
  () => removeVariantOption(editor, property.id, "removed"),
  /unavailable/,
);
const deletedOption = removeVariantOption(
  editor,
  property.id,
  property.options[1].id,
);
assert.equal(deletedOption.overrides[property.options[1].id], undefined);
assert.equal(
  deletedOption.properties[0].kind === "variant" &&
    deletedOption.properties[0].options.length,
  1,
);
const subsequent = createBooleanProperty("Later edit");
const restoredOption = restoreEditorRemoval(
  {
    ...deletedOption,
    properties: [...deletedOption.properties, subsequent],
  },
  editor,
  deletedOption,
);
assert.deepEqual(restoredOption.properties, [...editor.properties, subsequent]);
assert.deepEqual(restoredOption.overrides, editor.overrides);
const deletedBoolean = removeBooleanProperty(editor, boolean.id);
assert.deepEqual(deletedBoolean.visibilityBindings, {});
const restoredBoolean = restoreEditorRemoval(
  {
    ...deletedBoolean,
    visibility: { [text.id]: false },
  },
  editor,
  deletedBoolean,
);
assert.deepEqual(restoredBoolean.visibilityBindings, editor.visibilityBindings);
assert.deepEqual(restoredBoolean.visibility, { [text.id]: false });
assert.throws(
  () =>
    restoreEditorRemoval(
      {
        ...deletedBoolean,
        visibilityBindings: {
          [icon.id]: { propertyId: subsequent.id, inverted: true },
        },
      },
      editor,
      deletedBoolean,
    ),
  /later edit/,
);
assert.deepEqual(
  editor,
  before.editor,
  "Operations must preserve their immutable inputs.",
);

assert.deepEqual(reorderLayers(["a", "b", "c"], new Set(["a"]), "c", "after"), [
  "b",
  "c",
  "a",
]);
assert.deepEqual(
  reorderLayers(["a", "b", "c", "d"], new Set(["c", "a"]), "d", "after"),
  ["b", "d", "a", "c"],
);
assert.throws(
  () => reorderLayers(["a", "b"], new Set(["a"]), "a", "before"),
  /another layer/,
);
assert.throws(
  () => reorderLayers(["a", "b"], new Set(["removed"]), "b", "after"),
  /no longer available/,
);
assert.throws(
  () => reorderLayers(["a", "b"], new Set(), "b", "after"),
  /no longer available/,
);
const insertion = planLayerInsertion(
  authored,
  1,
  {
    childIds: [icon.id, text.id],
    direction: "horizontal",
  },
  preview,
);
assert.equal(
  insertion.sharedIndex,
  0,
  "Variant insertion maps its visible boundary to shared topology.",
);
assert.deepEqual(
  editorAfterLayerInsertion(authored, insertion, added.id).overrides[
    property.options[1].id
  ].order,
  [icon.id, added.id, text.id],
);
const hiddenInsertion = planLayerInsertion(
  authored,
  0,
  {
    childIds: [text.id],
    direction: "horizontal",
  },
  { ...preview, booleans: { [boolean.id]: false } },
);
assert.deepEqual(
  editorAfterLayerInsertion(authored, hiddenInsertion, added.id).overrides[
    property.options[1].id
  ].order,
  [icon.id, added.id, text.id],
  "Inserting beside a visible layer keeps hidden layers in the shared order.",
);
assert.throws(
  () =>
    planLayerInsertion(
      authored,
      1,
      {
        childIds: [text.id, icon.id],
        direction: "horizontal",
      },
      preview,
    ),
  /picker was open/,
);
assert.throws(
  () =>
    planLayerInsertion(
      authored,
      1,
      {
        childIds: [icon.id, text.id],
        direction: "vertical",
      },
      preview,
    ),
  /picker was open/,
);

const terms = property.options.map((option, index) => ({
  id: String(option.classification[category]),
  categoryId: category,
  value: index === 0 ? "start" : "end",
  description: "",
}));
const taxonomy: TaxonomyDocument = {
  schemaVersion: 1,
  categories: [
    {
      id: category,
      key: "placement",
      name: "Placement",
      description: "",
      valueType: "string",
      cardinality: "one",
      scopes: ["structures"],
      required: false,
      includeInProjections: true,
    },
  ],
  terms,
  order: [category],
  classifications: {},
};
const renamed = renameVariantOption(
  editor,
  property.id,
  property.options[0].id,
  "end",
  taxonomy,
);
assert.equal(
  renamed.taxonomy,
  taxonomy,
  "Selecting an existing term cannot create vocabulary.",
);
assert.equal(
  renamed.editor.properties[0].kind === "variant" &&
    renamed.editor.properties[0].options[0].classification[category],
  terms[1].id,
);
assert.throws(
  () =>
    renameVariantOption(
      editor,
      property.id,
      property.options[1].id,
      "above",
      taxonomy,
    ),
  /create this term/,
);
const created = renameVariantOption(
  editor,
  property.id,
  property.options[1].id,
  "above",
  taxonomy,
  true,
);
assert.equal(created.taxonomy.terms.length, taxonomy.terms.length + 1);
assert.equal(
  taxonomy.terms.length,
  2,
  "Creating a term keeps the original Registry immutable.",
);
const duplicateNames = structuredClone(authored);
duplicateNames.editor.properties.push({ ...boolean, id: crypto.randomUUID() });
assert.ok(
  structureVariantIssues(duplicateNames).some((issue) =>
    issue.includes("distinct name"),
  ),
);
const defaultOverride = structuredClone(authored);
defaultOverride.editor.overrides[property.defaultOptionId] = {};
assert.ok(
  structureVariantIssues(defaultOverride).some((issue) =>
    issue.includes("default option"),
  ),
);

const legacy = {
  schemaVersion: 4,
  structures: [
    {
      ...structure,
      generation: {
        sizeTermIds: [SIZE_TERM_IDS.m, SIZE_TERM_IDS.l],
        applications: [],
      },
    },
  ],
};
const upgraded = upgradeStructuresDocument(legacy);
assert.equal(upgraded.schemaVersion, STRUCTURES_SCHEMA_VERSION);
assert.deepEqual(
  upgraded.structures[0].generation?.sizeTermIds,
  Object.values(SIZE_TERM_IDS),
);
assert.deepEqual(
  upgradeStructuresDocument(upgraded),
  upgraded,
  "Migration must be idempotent.",
);
assert.deepEqual(legacy.structures[0].generation.sizeTermIds, [
  SIZE_TERM_IDS.m,
  SIZE_TERM_IDS.l,
]);
const disabled = upgradeStructuresDocument({
  schemaVersion: 4,
  structures: [structure],
});
assert.deepEqual(disabled.structures[0].generation?.sizeTermIds, [
  SIZE_TERM_IDS.m,
]);
const customTargets = structuredClone(authored);
const bindingId = crypto.randomUUID();
customTargets.elements[0].bindings = [
  {
    id: bindingId,
    slot: "fontSize",
    $ref: crypto.randomUUID(),
    family: "typography",
  },
];
customTargets.generation = {
  sizeTermIds: [SIZE_TERM_IDS.m],
  applications: [
    {
      id: crypto.randomUUID(),
      ruleId: crypto.randomUUID(),
      targets: { kind: "all" },
      previewTargets: { kind: "custom", bindingIds: [bindingId] },
    },
  ],
};
assert.equal(hasCustomElementTargets(customTargets, text.id), true);
assert.equal(hasCustomElementTargets(customTargets, icon.id), false);
assert.equal(hasCustomElementTargets(customTargets, "removed"), false);
customTargets.generation.applications[0].previewTargets = { kind: "all" };
assert.equal(
  hasCustomElementTargets(customTargets, text.id),
  false,
  "All-target rules do not require destructive selection cleanup.",
);
console.log(
  "Structure variants, Registry edits, scoped Undo, layer operations, and migration passed.",
);
