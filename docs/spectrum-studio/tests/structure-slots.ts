// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { createStore } from "jotai";
import {
  authoringSnapshotAtom,
  assertStoredSnapshot,
  cancelEditAtom,
  createDefaultSnapshot,
  enterEditModeAtom,
  restoreAuthoringSnapshotAtom,
  saveEditAtom,
} from "../src/features/edit-session/state";
import {
  createElement,
  elementLabel,
  isStructureElement,
} from "../src/features/structures/elements";
import {
  insertElementAtom,
  removeElementAtom,
  restoreElementAtom,
  updateElementAtom,
} from "../src/features/structures/elementState";
import { structuresDocumentAtom } from "../src/features/structures/state";
import { resolveElements } from "../src/features/structures/elementResolution";
import {
  structureChanges,
  structureFields,
} from "../src/features/structures/changes";
import { compareAuthoring } from "../src/features/changelog/registry";
import { restorePath } from "../src/features/changelog/contract";
import { buildTshirtArtifacts } from "../src/features/design-data/tshirtArtifacts";
import { primitiveReferencesAtom } from "../src/features/tokens/primitiveReferenceState";
import { taxonomyDocumentAtom } from "../src/features/taxonomy/state";
import { ELEMENT_TYPES } from "../src/features/structures/elements";
import { createVariantProperty } from "../src/features/option-groups/model";
import { createStructure } from "../src/features/structures/model";
import {
  EMPTY_STRUCTURE_PREVIEW,
  emptyStructureEditor,
  resolveStructureOptions,
} from "../src/features/structures/variants";

const slot = createElement("slot");
assert.equal(slot.name, "Slot");
assert.equal(isStructureElement(slot), true);
assert.equal(isStructureElement({ ...slot, name: "" }), false);
assert.equal(isStructureElement({ ...slot, name: " " }), false);
assert.equal(isStructureElement({ ...slot, glyph: "Home" }), false);
assert.equal(
  isStructureElement({ ...createElement("text"), name: "Not a slot" }),
  false,
);
assert.equal(
  elementLabel({ ...slot, name: "Selection indicator" }),
  "Selection indicator",
);
const contentProperty = createVariantProperty(
  "Content",
  {
    [crypto.randomUUID()]: crypto.randomUUID(),
  },
  [
    {
      name: "Selection",
      classification: { [crypto.randomUUID()]: crypto.randomUUID() },
    },
    {
      name: "Buttons",
      classification: { [crypto.randomUUID()]: crypto.randomUUID() },
    },
  ],
);
const variantStructure = {
  ...createStructure("Slot variant"),
  elements: [{ ...slot, name: "Selection indicator" }],
  editor: {
    ...emptyStructureEditor(),
    properties: [contentProperty],
    overrides: {
      [contentProperty.options[1].id]: {
        elements: { [slot.id]: { ...slot, name: "Buttons" } },
      },
    },
  },
};
const authoredVariant = structuredClone(variantStructure);
const variant = resolveStructureOptions(variantStructure, {
  ...EMPTY_STRUCTURE_PREVIEW,
  options: { [contentProperty.id]: contentProperty.options[1].id },
});
assert.deepEqual(variant.issues, []);
assert.equal(variant.structure.elements?.[0].kind, "slot");
assert.equal(
  variant.structure.elements?.[0].kind === "slot" &&
    variant.structure.elements[0].name,
  "Buttons",
  "A selected option resolves its Slot name, not the shared name.",
);
assert.deepEqual(variantStructure, authoredVariant);
const defaultVariant = resolveStructureOptions(variantStructure);
assert.equal(
  defaultVariant.structure.elements?.[0].kind === "slot" &&
    defaultVariant.structure.elements[0].name,
  "Selection indicator",
);
const store = createStore();
const baseline = createDefaultSnapshot();
const ownerId = baseline.structures!.structures[0].conceptId;
const before = buildTshirtArtifacts(baseline, "shipped");
assert.throws(
  () =>
    store.set(insertElementAtom, {
      structureId: ownerId,
      kind: "slot",
      index: 0,
    }),
  /edit mode/,
);
store.set(enterEditModeAtom);
const id = store.set(insertElementAtom, {
  structureId: ownerId,
  kind: "slot",
  index: 0,
});
const owner = () =>
  store
    .get(structuresDocumentAtom)
    .structures.find((item) => item.conceptId === ownerId)!;
const current = () => {
  const element = owner().elements!.find((item) => item.id === id);
  assert.ok(isStructureElement(element));
  return element;
};
store.set(updateElementAtom, {
  structureId: ownerId,
  elementId: id,
  name: "Selection indicator",
});
assert.deepEqual(current(), { ...slot, id, name: "Selection indicator" });
assert.throws(
  () =>
    store.set(updateElementAtom, {
      structureId: ownerId,
      elementId: id,
      name: " ",
    }),
  /invalid/,
);
const edited = store.get(authoringSnapshotAtom);
assertStoredSnapshot(edited);
assert.equal(
  structureFields(owner()).get(`element/${id}/name`),
  '"Selection indicator"',
);
assert.ok(
  structureChanges(edited.structures!, edited.taxonomy!, baseline.structures)
    .flatMap((change) => change.fields)
    .some(
      (field) =>
        field.key.endsWith("Slot name") &&
        field.after === "Selection indicator",
    ),
);
const comparison = compareAuthoring(baseline, edited);
assert.ok(comparison.slots.some((entry) => entry.changed));
assert.deepEqual(
  buildTshirtArtifacts(edited, "shipped").semantics,
  before.semantics,
);
const resolved = resolveElements(
  owner(),
  store.get(primitiveReferencesAtom),
  edited.rules,
).find((item) => item.element.id === id)!;
assert.deepEqual(resolved.issues, []);
assert.equal(resolved.styles.width, 96);
assert.equal(resolved.styles.height, 24);
store.set(saveEditAtom);
store.set(updateElementAtom, {
  structureId: ownerId,
  elementId: id,
  name: "Buttons",
});
const renamed = store.get(authoringSnapshotAtom);
const nameField = compareAuthoring(edited, renamed)
  .groups.flatMap((group) => group.items)
  .flatMap((item) => item.fields)
  .find((field) => field.address?.path.at(-1) === "elements");
assert.ok(
  nameField?.address,
  "Slot names participate in the existing element-collection reset.",
);
const reset = restorePath(renamed, edited, nameField.address);
store.set(restoreAuthoringSnapshotAtom, reset);
assert.deepEqual(store.get(authoringSnapshotAtom), edited);
store.set(cancelEditAtom);
assert.ok(
  current() && "name" in current() && current().name === "Selection indicator",
);
store.set(enterEditModeAtom);
const removed = store.set(removeElementAtom, {
  structureId: ownerId,
  elementId: id,
  confirmed: false,
});
store.set(restoreElementAtom, removed);
assert.ok(
  current() && "name" in current() && current().name === "Selection indicator",
);
assertStoredSnapshot(store.get(authoringSnapshotAtom));
console.log(
  "Named Slots: validation, insertion, renaming, blank preview, zero semantic growth, Changes, element reset, Save/Cancel and removal Undo passed.",
);

const existingDesign = createStore();
const legacyBefore = structuredClone(existingDesign.get(authoringSnapshotAtom));
const listItemStructureNames = new Set([
  "List-item",
  "Vertical padding",
  "Content layout",
  "Content start",
  "Content end",
]);
legacyBefore.structures!.structures =
  legacyBefore.structures!.structures.filter(
    (structure) => !listItemStructureNames.has(structure.name),
  );
existingDesign.set(restoreAuthoringSnapshotAtom, legacyBefore);
existingDesign.set(taxonomyDocumentAtom, {
  ...existingDesign.get(taxonomyDocumentAtom),
  terms: existingDesign
    .get(taxonomyDocumentAtom)
    .terms.filter((term) => term.id !== ELEMENT_TYPES.slot.termId),
});
const legacySnapshot = structuredClone(
  existingDesign.get(authoringSnapshotAtom),
);
existingDesign.set(enterEditModeAtom);
existingDesign.set(insertElementAtom, {
  structureId: ownerId,
  kind: "slot",
  index: 0,
});
assert.ok(
  existingDesign
    .get(taxonomyDocumentAtom)
    .terms.some((term) => term.id === ELEMENT_TYPES.slot.termId),
);
assertStoredSnapshot(existingDesign.get(authoringSnapshotAtom));
assert.deepEqual(
  buildTshirtArtifacts(existingDesign.get(authoringSnapshotAtom), "shipped")
    .semantics,
  buildTshirtArtifacts(legacySnapshot, "shipped").semantics,
);
existingDesign.set(cancelEditAtom);
assert.deepEqual(existingDesign.get(authoringSnapshotAtom), legacySnapshot);
