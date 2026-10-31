// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { createStore } from "jotai";
import {
  authoringSnapshotAtom,
  cancelEditAtom,
  enterEditModeAtom,
  saveEditAtom,
  assertStoredSnapshot,
} from "../src/features/edit-session/state";
import {
  selectedStructureIdAtom,
  structurePreviewStateAtom,
  structuresDocumentAtom,
} from "../src/features/structures/documentState";
import {
  restoreStructureEditorRemovalAtom,
  updateStructureEditorAtom,
} from "../src/features/structures/variantState";
import {
  emptyStructureEditor,
  structureEditor,
} from "../src/features/structures/variants";
import { removeBooleanProperty } from "../src/features/structures/variantOperations";
import {
  createBooleanProperty,
  createVariantProperty,
} from "../src/features/option-groups/model";
import { buildTshirtArtifacts } from "../src/features/design-data/tshirtArtifacts";
import { compareAuthoring } from "../src/features/changelog/registry";
import { restorePath } from "../src/features/changelog/contract";
import {
  prepareChangeReset,
  sourceResetPlan,
} from "../src/features/changelog/resetPlans";
import { FOUNDATION_MODE_ATTACHMENT_DEFAULTS } from "../src/state/view/foundationModeAttachments";
import {
  insertElementAtom,
  updateElementAtom,
} from "../src/features/structures/elementState";
import { primitiveReferencesAtom } from "../src/features/tokens/primitiveReferenceState";
import { resolveElements } from "../src/features/structures/elementResolution";
import { isStructureElement } from "../src/features/structures/elements";

const store = createStore();
const structureId = store.get(structuresDocumentAtom).structures[0].conceptId;
store.set(selectedStructureIdAtom, structureId);
const original = structuredClone(store.get(authoringSnapshotAtom));
const property = createBooleanProperty("Has icon");
const editor = { ...emptyStructureEditor(), properties: [property] };
assert.throws(
  () => store.set(updateStructureEditorAtom, { structureId, editor }),
  /edit mode/,
);
store.set(enterEditModeAtom);
store.set(updateStructureEditorAtom, {
  structureId,
  editor,
  description: "An example structure.",
});
const authored = structuredClone(store.get(authoringSnapshotAtom));
const propertyField = compareAuthoring(original, authored)
  .groups.flatMap((group) => group.items)
  .flatMap((item) => item.fields)
  .find(
    (field) =>
      field.address?.path.includes("editor") &&
      field.address.path.at(-1) === "properties",
  )!;
const resetProperty = prepareChangeReset(
  { ...authored, attachments: FOUNDATION_MODE_ATTACHMENT_DEFAULTS },
  sourceResetPlan("Remove property", [propertyField.address!]),
);
assert.equal(
  resetProperty.structures!.structures[0].editor,
  undefined,
  "Resetting the last property removes its empty editor rather than leaving invalid data.",
);
assert.equal(
  resetProperty.structures!.structures[0].description,
  authored.structures!.structures[0].description,
);
const generated = buildTshirtArtifacts(authored);
assert.deepEqual(
  generated.tokens,
  buildTshirtArtifacts(original).tokens,
  "Boolean and metadata edits cannot create or change tokens.",
);
store.set(structurePreviewStateAtom, { booleans: { [property.id]: false } });
assert.equal(store.get(structurePreviewStateAtom).booleans[property.id], false);
assert.deepEqual(
  store.get(authoringSnapshotAtom),
  authored,
  "Preview switches are not authored data.",
);
const removed = removeBooleanProperty(editor, property.id);
store.set(updateStructureEditorAtom, { structureId, editor: removed });
const later = createBooleanProperty("Has label");
store.set(updateStructureEditorAtom, {
  structureId,
  editor: { ...removed, properties: [later] },
});
store.set(restoreStructureEditorRemovalAtom, {
  structureId,
  before: editor,
  after: removed,
});
assert.deepEqual(
  structureEditor(
    store.get(structuresDocumentAtom).structures[0],
  ).properties.map((item) => item.id),
  [property.id, later.id],
  "Undo restores only the removed property and keeps subsequent edits.",
);
store.set(cancelEditAtom);
assert.deepEqual(
  store.get(authoringSnapshotAtom),
  original,
  "Cancel restores all authored fields.",
);
assert.deepEqual(
  store.get(structurePreviewStateAtom).booleans,
  {},
  "Cancel clears temporary preview choices.",
);
store.set(enterEditModeAtom);
store.set(updateStructureEditorAtom, { structureId, editor });
store.set(updateStructureEditorAtom, {
  structureId,
  editor: emptyStructureEditor(),
});
assert.deepEqual(
  store.get(authoringSnapshotAtom),
  original,
  "Removing the last property cannot leave an empty editor counted as an authored change.",
);
store.set(updateStructureEditorAtom, { structureId, editor });
assert.equal(store.get(structurePreviewStateAtom).booleans[property.id], true);
store.set(structurePreviewStateAtom, { booleans: { [property.id]: false } });
store.set(saveEditAtom);
assert.equal(
  structureEditor(store.get(structuresDocumentAtom).structures[0]).properties[0]
    .id,
  property.id,
);
const savedProperty = store.get(authoringSnapshotAtom).structures?.structures[0]
  .editor?.properties[0];
assert.equal(
  savedProperty?.kind === "boolean" && savedProperty.defaultValue,
  true,
  "Saving a preview never changes a boolean's authored default.",
);
const variantSnapshot = structuredClone(original);
const taxonomy = variantSnapshot.taxonomy!;
const categories = taxonomy.categories.filter((category) =>
  category.scopes.includes("structures"),
);
const propertyCategory = categories.find((category) =>
  taxonomy.terms.some((term) => term.categoryId === category.id),
)!;
const optionCategory = categories.find(
  (category) =>
    category.id !== propertyCategory.id &&
    taxonomy.terms.filter((term) => term.categoryId === category.id).length >=
      2,
)!;
const propertyTerm = taxonomy.terms.find(
  (term) => term.categoryId === propertyCategory.id,
)!;
const options = taxonomy.terms
  .filter((term) => term.categoryId === optionCategory.id)
  .slice(0, 2);
const variantProperty = createVariantProperty(
  String(propertyTerm.value),
  {
    [propertyCategory.id]: propertyTerm.id,
  },
  options.map((term) => ({
    name: String(term.value),
    classification: { [optionCategory.id]: term.id },
  })),
);
const root = variantSnapshot.structures!.structures[0];
const layerId = root.elements![0].id;
root.editor = {
  ...emptyStructureEditor(),
  properties: [variantProperty],
  overrides: {
    [variantProperty.options[1].id]: { visibility: { [layerId]: false } },
  },
};
assertStoredSnapshot(variantSnapshot);
const comparison = compareAuthoring(original, variantSnapshot);
const changed = comparison.slots.filter(
  (slot) => slot.category === "structures" && slot.changed,
);
assert.equal(
  changed.length,
  2,
  "One property definition and one visibility difference are two authored fields.",
);
assert.equal(
  changed.some((slot) => slot.manual),
  false,
  "Authored variant differences are not manual generated-token overrides.",
);
const visibilityField = comparison.groups
  .flatMap((group) => group.items)
  .flatMap((item) => item.fields)
  .find((field) => field.address?.path.includes("visibility"))!;
const reset = restorePath(variantSnapshot, original, visibilityField.address!);
assertStoredSnapshot(reset);
assert.deepEqual(
  reset.structures!.structures[0].editor!.properties,
  root.editor.properties,
  "Resetting visibility preserves independently authored properties.",
);
assert.equal(
  reset.structures!.structures[0].editor!.overrides[
    variantProperty.options[1].id
  ].visibility?.[layerId],
  undefined,
);
const coverageBase = structuredClone(variantSnapshot);
const coverageRoot = coverageBase.structures!.structures[0];
coverageRoot.editor = {
  ...emptyStructureEditor(),
  properties: [variantProperty, property],
};
const coverageCases: {
  name: string;
  count: number;
  mutate: (editor: typeof coverageRoot.editor) => void;
}[] = [
  {
    name: "property label",
    count: 1,
    mutate: (editor) => {
      editor.properties[0].name = "Updated label";
    },
  },
  {
    name: "option label",
    count: 1,
    mutate: (editor) => {
      const definition = editor.properties[0];
      if (definition.kind === "variant")
        definition.options[1].name = "Updated option";
    },
  },
  {
    name: "boolean default",
    count: 1,
    mutate: (editor) => {
      const definition = editor.properties[1];
      if (definition.kind === "boolean") definition.defaultValue = false;
    },
  },
  {
    name: "saved visibility",
    count: 1,
    mutate: (editor) => {
      editor.visibility[layerId] = false;
    },
  },
  {
    name: "boolean binding and inversion",
    count: 1,
    mutate: (editor) => {
      editor.visibilityBindings[layerId] = {
        propertyId: property.id,
        inverted: true,
      };
    },
  },
  {
    name: "option order",
    count: 1,
    mutate: (editor) => {
      editor.overrides[variantProperty.options[1].id] = {
        order: coverageRoot.elements!.map((element) => element.id).reverse(),
      };
    },
  },
  {
    name: "option visibility",
    count: 1,
    mutate: (editor) => {
      editor.overrides[variantProperty.options[1].id] = {
        visibility: { [layerId]: false },
      };
    },
  },
];
for (const testCase of coverageCases) {
  const proposal = structuredClone(coverageBase);
  testCase.mutate(proposal.structures!.structures[0].editor!);
  assertStoredSnapshot(proposal);
  const result = compareAuthoring(coverageBase, proposal);
  assert.equal(
    result.slots.filter((slot) => slot.changed).length,
    testCase.count,
    testCase.name,
  );
  let restored = proposal;
  for (const field of result.groups
    .flatMap((group) => group.items)
    .flatMap((item) => item.fields))
    restored = restorePath(restored, coverageBase, field.address!);
  assertStoredSnapshot(restored);
  assert.equal(
    compareAuthoring(coverageBase, restored).slots.filter(
      (slot) => slot.changed,
    ).length,
    0,
    `${testCase.name} resets without leaving an authored change.`,
  );
}
const sizingStore = createStore();
sizingStore.set(enterEditModeAtom);
const ownerId = sizingStore.get(structuresDocumentAtom).structures[0].conceptId;
sizingStore.set(insertElementAtom, {
  structureId: ownerId,
  kind: "visual",
  index: 0,
});
const sizingOwner = () => sizingStore.get(structuresDocumentAtom).structures[0];
const visual = sizingOwner().elements![0];
const sizes = sizingStore
  .get(primitiveReferencesAtom)
  .filter(
    (reference) =>
      reference.family === "size" && typeof reference.value === "number",
  )
  .sort((left, right) => Number(left.value) - Number(right.value));
const small = sizes[0],
  large = sizes.at(-1)!;
assert.ok(Number(small.value) < Number(large.value));
const unbound = structuredClone(sizingStore.get(authoringSnapshotAtom));
for (const slot of [
  "minWidth",
  "minHeight",
  "maxWidth",
  "maxHeight",
] as const) {
  const reference = slot.startsWith("min") ? small : large;
  sizingStore.set(updateElementAtom, {
    structureId: ownerId,
    elementId: visual.id,
    slot,
    referenceId: reference.id,
  });
  const snapshot = sizingStore.get(authoringSnapshotAtom);
  assertStoredSnapshot(snapshot);
  assert.equal(isStructureElement(sizingOwner().elements![0]), true);
  const changes = compareAuthoring(unbound, snapshot);
  assert.equal(
    changes.slots.filter((item) => item.changed).length,
    1,
    "Element bindings remain one atomic authored field, including constraints.",
  );
}
let constrained = structuredClone(sizingStore.get(authoringSnapshotAtom));
const resolvedVisual = resolveElements(
  sizingOwner(),
  sizingStore.get(primitiveReferencesAtom),
  constrained.rules,
)[0];
assert.equal(resolvedVisual.styles.minWidth, small.value);
assert.equal(resolvedVisual.styles.maxHeight, large.value);
assert.deepEqual(resolvedVisual.issues, []);
sizingStore.set(updateElementAtom, {
  structureId: ownerId,
  elementId: visual.id,
  slot: "minWidth",
  referenceId: large.id,
});
const beforeRejected = structuredClone(sizingStore.get(authoringSnapshotAtom));
assert.throws(
  () =>
    sizingStore.set(updateElementAtom, {
      structureId: ownerId,
      elementId: visual.id,
      slot: "maxWidth",
      referenceId: small.id,
    }),
  /must not exceed/,
);
assert.deepEqual(sizingStore.get(authoringSnapshotAtom), beforeRejected);
sizingStore.set(updateElementAtom, {
  structureId: ownerId,
  elementId: visual.id,
  slot: "minWidth",
  referenceId: small.id,
});
constrained = structuredClone(sizingStore.get(authoringSnapshotAtom));
let resetConstraints = constrained;
for (const field of compareAuthoring(unbound, constrained)
  .groups.flatMap((group) => group.items)
  .flatMap((item) => item.fields))
  resetConstraints = restorePath(resetConstraints, unbound, field.address!);
assertStoredSnapshot(resetConstraints);
assert.deepEqual(resetConstraints, unbound);
sizingStore.set(saveEditAtom);
sizingStore.set(updateElementAtom, {
  structureId: ownerId,
  elementId: visual.id,
  slot: "minWidth",
  referenceId: null,
});
sizingStore.set(cancelEditAtom);
assert.deepEqual(sizingStore.get(authoringSnapshotAtom), constrained);
assertStoredSnapshot(JSON.parse(JSON.stringify(constrained)));
sizingStore.set(enterEditModeAtom);
sizingStore.set(updateStructureEditorAtom, {
  structureId: ownerId,
  editor: { ...emptyStructureEditor(), properties: [variantProperty] },
});
const sizingOption = variantProperty.options[1].id;
sizingStore.set(updateElementAtom, {
  structureId: ownerId,
  elementId: visual.id,
  optionId: sizingOption,
  slot: "minWidth",
  referenceId: large.id,
});
const beforeVariantRejected = structuredClone(
  sizingStore.get(authoringSnapshotAtom),
);
assert.throws(
  () =>
    sizingStore.set(updateElementAtom, {
      structureId: ownerId,
      elementId: visual.id,
      optionId: sizingOption,
      slot: "maxWidth",
      referenceId: small.id,
    }),
  /must not exceed/,
);
assert.deepEqual(sizingStore.get(authoringSnapshotAtom), beforeVariantRejected);
console.log(
  "Structure editor permissions, preview isolation, scoped Undo, Save, and Cancel passed.",
);
