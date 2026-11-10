// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { createStore } from "jotai";
import {
  assertStoredSnapshot,
  authoringSnapshotAtom,
  cancelEditAtom,
  createDefaultSnapshot,
  editSessionSnapshotAtom,
  enterEditModeAtom,
  restoreAuthoringSnapshotAtom,
  saveEditAtom,
} from "../src/features/edit-session/state";
import { createStructure } from "../src/features/structures/model";
import {
  createElement,
  isStructureElement,
} from "../src/features/structures/elements";
import {
  createBooleanProperty,
  createLocalVariantProperty,
} from "../src/features/option-groups/model";
import {
  emptyStructureEditor,
  EMPTY_STRUCTURE_PREVIEW,
} from "../src/features/structures/variants";
import {
  configuredStructure,
  ownedLayoutAt,
  structureConfigurationIssues,
} from "../src/features/structures/configuration";
import {
  duplicateVariantOption,
  makeVariantOptionDefault,
  removeBooleanProperty,
  removeVariantOption,
  restoreEditorRemoval,
} from "../src/features/structures/variantOperations";
import { primitiveReferencesAtom } from "../src/features/tokens/primitiveReferenceState";
import { updateStructureEditorAtom } from "../src/features/structures/variantState";
import { structuresDocumentAtom } from "../src/features/structures/documentState";
import {
  removeElementAtom,
  restoreElementAtom,
  updateElementAtom,
} from "../src/features/structures/elementState";
import { compareAuthoring } from "../src/features/changelog/registry";
import { structureChanges } from "../src/features/structures/changes";
import { buildTshirtArtifacts } from "../src/features/design-data/tshirtArtifacts";
import {
  prepareChangeReset,
  sourceResetPlan,
} from "../src/features/changelog/resetPlans";

const root = createStructure("Parent");
const layout = createStructure("Owned layout");
layout.parentStructureId = root.conceptId;
const visual = createElement("slot");
layout.elements = [visual];
const first = {
  id: crypto.randomUUID(),
  kind: "structureReference" as const,
  structureId: layout.conceptId,
};
const second = { ...first, id: crypto.randomUUID() };
root.elements = [first, second];
const visible = createBooleanProperty("Has content");
const variant = createLocalVariantProperty("Padding");
const none = variant.options[1];
const spacious = createLocalVariantProperty("Density");
const spacing = createStore()
  .get(primitiveReferencesAtom)
  .find((reference) => reference.family === "spacing" && !reference.error)!;
assert.ok(spacing);
root.editor = {
  ...emptyStructureEditor(),
  properties: [visible, variant, spacious],
  layouts: {
    [`/${first.id}`]: {
      visibilityBindings: {
        [visual.id]: { propertyId: visible.id, inverted: false },
      },
      overrides: {
        [none.id]: { slots: { paddingTop: null, paddingBottom: null } },
        [spacious.options[1].id]: {
          slots: {
            paddingTop: { $ref: spacing.id },
            paddingBottom: { $ref: spacing.id },
          },
        },
      },
    },
  },
};
const catalog = [root, layout];
assert.equal(ownedLayoutAt(root, `/${first.id}`, catalog), layout);
assert.deepEqual(structureConfigurationIssues(root, catalog), []);
const preview = {
  ...EMPTY_STRUCTURE_PREVIEW,
  options: { [variant.id]: none.id, [spacious.id]: spacious.options[1].id },
  booleans: { [visible.id]: false },
};
const resolved = configuredStructure(root, `/${first.id}`, catalog, {
  [root.conceptId]: preview,
});
assert.deepEqual(resolved.issues, []);
assert.equal(resolved.structure.elements?.length, 0);
assert.equal(
  resolved.structure.properties.some((binding) => "$ref" in binding),
  false,
);
assert.equal(
  configuredStructure(root, `/${second.id}`, catalog, {
    [root.conceptId]: preview,
  }).structure.elements?.length,
  1,
);
assert.equal(
  layout.elements.length,
  1,
  "Resolution never mutates the owned definition.",
);
assert.deepEqual(
  configuredStructure(
    {
      ...root,
      editor: {
        ...root.editor,
        properties: [...root.editor.properties].reverse(),
      },
    },
    `/${first.id}`,
    catalog,
    { [root.conceptId]: preview },
  ).structure,
  resolved.structure,
  "Explicit suppression is independent of property order.",
);
const external = createStructure("Shared");
root.elements.push({
  id: crypto.randomUUID(),
  kind: "structureReference",
  structureId: external.conceptId,
});
const externalPath = `/${root.elements.at(-1)!.id}`;
assert.equal(
  ownedLayoutAt(root, externalPath, [...catalog, external]),
  undefined,
);
assert.match(
  structureConfigurationIssues(
    { ...root, editor: { ...root.editor, layouts: { [externalPath]: {} } } },
    [...catalog, external],
  ).join(" "),
  /unavailable owned layout/,
);
const invalidBinding = structuredClone(root);
invalidBinding.editor!.layouts![`/${first.id}`].visibilityBindings![
  visual.id
].propertyId = crypto.randomUUID();
assert.match(
  structureConfigurationIssues(invalidBinding, catalog).join(" "),
  /unavailable boolean/,
);

const removedBoolean = removeBooleanProperty(root.editor, visible.id);
assert.deepEqual(
  removedBoolean.layouts![`/${first.id}`].visibilityBindings,
  {},
);
assert.deepEqual(
  restoreEditorRemoval(removedBoolean, root.editor, removedBoolean),
  root.editor,
);
const removedOption = removeVariantOption(root.editor, variant.id, none.id);
assert.equal(
  removedOption.layouts![`/${first.id}`].overrides?.[none.id],
  undefined,
);
assert.deepEqual(
  restoreEditorRemoval(removedOption, root.editor, removedOption),
  root.editor,
);
assert.throws(
  () => makeVariantOptionDefault(root.editor!, variant.id, none.id),
  /before saving differences/,
);
const duplicate = {
  id: crypto.randomUUID(),
  name: "Other",
  classification: {},
};
const duplicated = duplicateVariantOption(
  root.editor,
  variant.id,
  none.id,
  duplicate,
);
assert.deepEqual(
  duplicated.layouts![`/${first.id}`].overrides?.[duplicate.id],
  root.editor.layouts![`/${first.id}`].overrides![none.id],
);

const oldSnapshot = createDefaultSnapshot();
assert.ok(oldSnapshot.structures);
oldSnapshot.structures.structures.push(root, layout, external);
const store = createStore();
store.set(restoreAuthoringSnapshotAtom, oldSnapshot);
store.set(editSessionSnapshotAtom, oldSnapshot);
const before = structuredClone(store.get(authoringSnapshotAtom));
store.set(enterEditModeAtom);
const current = (id = root.conceptId) =>
  store
    .get(structuresDocumentAtom)
    .structures.find((item) => item.conceptId === id)!;
const update = (editor: NonNullable<typeof root.editor>) =>
  store.set(updateStructureEditorAtom, { structureId: root.conceptId, editor });
const renamed = structuredClone(root.editor);
renamed.properties[0].name = "Content visible";
update(renamed);
const updated = current().editor!;
assert.equal(updated.properties[0].name, "Content visible");
const beforeInvalid = store.get(structuresDocumentAtom);
assert.throws(
  () =>
    update({
      ...updated,
      layouts: {
        [externalPath]: {
          visibilityBindings: {
            [visual.id]: { propertyId: visible.id, inverted: false },
          },
        },
      },
    }),
  /unavailable owned layout/,
);
assert.equal(store.get(structuresDocumentAtom), beforeInvalid);
assert.ok(
  compareAuthoring(before, store.get(authoringSnapshotAtom)).groups.some(
    (group) => group.id === "structures",
  ),
);
assert.ok(
  structureChanges(
    store.get(structuresDocumentAtom),
    before.taxonomy!,
    before.structures,
  ).some(
    (change) =>
      change.conceptId === root.conceptId &&
      change.fields.some(
        (field) => field.key === "Properties and layer differences",
      ),
  ),
);

store.set(updateElementAtom, {
  structureId: layout.conceptId,
  elementId: visual.id,
  optionId: none.id,
  configuration: { rootId: root.conceptId, path: `/${first.id}` },
  name: "Variant content",
});
const unconfiguredVisual = current(layout.conceptId).elements![0];
assert.ok(isStructureElement(unconfiguredVisual));
assert.equal(unconfiguredVisual.name, visual.name);
assert.equal(
  current().editor!.layouts![`/${first.id}`].overrides![none.id].elements![
    visual.id
  ].name,
  "Variant content",
);
assert.throws(
  () =>
    store.set(updateElementAtom, {
      structureId: external.conceptId,
      elementId: visual.id,
      optionId: none.id,
      configuration: { rootId: root.conceptId, path: externalPath },
      name: "Not allowed",
    }),
  /not owned/,
);
const beforeRemoval = structuredClone(store.get(structuresDocumentAtom));
const removed = store.set(removeElementAtom, {
  structureId: layout.conceptId,
  elementId: visual.id,
  confirmed: true,
});
assert.deepEqual(
  current().editor!.layouts![`/${first.id}`].visibilityBindings,
  {},
);
assert.deepEqual(
  current().editor!.layouts![`/${first.id}`].overrides![none.id].elements,
  {},
);
store.set(restoreElementAtom, removed);
assert.deepEqual(store.get(structuresDocumentAtom), beforeRemoval);
const removedOccurrence = store.set(removeElementAtom, {
  structureId: root.conceptId,
  elementId: first.id,
  confirmed: true,
});
assert.equal(current().editor!.layouts![`/${first.id}`], undefined);
assert.ok(
  current(layout.conceptId),
  "Deleting one occurrence does not delete a repeated Layout definition.",
);
store.set(restoreElementAtom, removedOccurrence);
assert.deepEqual(store.get(structuresDocumentAtom), beforeRemoval);
const authored = structuredClone(store.get(authoringSnapshotAtom));
assertStoredSnapshot(authored);
assert.deepEqual(
  buildTshirtArtifacts(authored),
  buildTshirtArtifacts(before),
  "Unclassified parent effects add no semantic output.",
);
store.set(cancelEditAtom);
assert.deepEqual(store.get(authoringSnapshotAtom), before);
store.set(enterEditModeAtom);
update(
  authored.structures!.structures.find(
    (item) => item.conceptId === root.conceptId,
  )!.editor!,
);
store.set(saveEditAtom);
assert.deepEqual(
  store.get(editSessionSnapshotAtom),
  store.get(authoringSnapshotAtom),
);
const reloaded = createStore();
reloaded.set(
  restoreAuthoringSnapshotAtom,
  JSON.parse(JSON.stringify(store.get(authoringSnapshotAtom))),
);
assert.deepEqual(
  reloaded.get(authoringSnapshotAtom),
  store.get(authoringSnapshotAtom),
);

const resetFixture = createDefaultSnapshot();
const list = resetFixture.structures!.structures.find(
  (item) => item.name === "List-item",
)!;
const boundPath = Object.keys(list.editor!.layouts!).find(
  (path) =>
    Object.keys(list.editor!.layouts![path].visibilityBindings ?? {}).length,
)!;
const boundChild = Object.keys(
  list.editor!.layouts![boundPath].visibilityBindings!,
)[0];
list.editor!.layouts![boundPath].visibilityBindings![boundChild].inverted =
  true;
list.description = "Keep this unrelated edit.";
const changes = compareAuthoring(createDefaultSnapshot(), resetFixture);
assert.equal(
  changes.slots.filter((slot) => slot.changed).length,
  2,
  "Changes counts the binding edit and the independent description edit.",
);
const reset = prepareChangeReset(
  { ...resetFixture, attachments: {} },
  sourceResetPlan("Parent binding", [
    {
      path: [
        "structures",
        "structures",
        { key: "conceptId", id: list.conceptId },
        "editor",
        "layouts",
        boundPath,
        "visibilityBindings",
        boundChild,
        "inverted",
      ],
      expected: true,
    },
  ]),
);
const resetList = reset.structures!.structures.find(
  (item) => item.conceptId === list.conceptId,
)!;
assert.equal(
  resetList.editor!.layouts![boundPath].visibilityBindings![boundChild]
    .inverted,
  false,
);
assert.equal(resetList.description, list.description);
console.log(
  "Parent configuration: nested effects, occurrence isolation, suppression, validation, authoring, Changes, scoped reset, deletion/Undo and Save/Cancel/reload passed.",
);
