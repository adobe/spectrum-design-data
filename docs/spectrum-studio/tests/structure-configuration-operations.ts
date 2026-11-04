// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { createStore } from "jotai";
import {
  createDefaultSnapshot,
  enterEditModeAtom,
} from "../src/features/edit-session/state";
import {
  structuresDocumentAtom,
  structurePreviewsAtom,
} from "../src/features/structures/documentState";
import { editStructureOptionBindingsAtom } from "../src/features/structures/configurationState";
import {
  configuredStructure,
  ownedLayoutAt,
} from "../src/features/structures/configuration";
import { EMPTY_STRUCTURE_PREVIEW } from "../src/features/structures/variants";
import { structureSelection } from "../src/features/structures/model";
import { toPortableStructures } from "../src/features/structures/portableConversion";
import { taxonomyDocumentAtom } from "../src/features/taxonomy/state";
import { renameVariantProperty } from "../src/features/structures/variantOperations";
import { updateStructureEditorAtom } from "../src/features/structures/variantState";

const store = createStore();
const baseline = createDefaultSnapshot();
const root = baseline.structures!.structures.find(
  (structure) => structure.name === "List-item",
)!;
const density = root.editor!.properties.find(
  (property) => property.name === "Density",
)!;
if (density.kind !== "variant") throw new Error("Expected Density.");
const valueId = density.options.find(
  (option) => option.id !== density.defaultOptionId,
)!.id;
const path = Object.keys(root.editor!.layouts!)[0];
const target = { structureId: root.conceptId, path: path.slice(1).split("/") };
const layout = {
  availableWidth: 500,
  availableHeight: 100,
  naturalWidth: 200,
  naturalHeight: 40,
};
const original = structuredClone(store.get(structuresDocumentAtom));
assert.throws(
  () =>
    store.set(editStructureOptionBindingsAtom, {
      target,
      valueId,
      changes: { paddingTop: null },
      layout,
    }),
  /edit mode/,
);
assert.deepEqual(store.get(structuresDocumentAtom), original);
store.set(enterEditModeAtom);
store.set(structurePreviewsAtom, {
  [root.conceptId]: {
    ...EMPTY_STRUCTURE_PREVIEW,
    options: { [density.id]: valueId },
  },
});
store.set(editStructureOptionBindingsAtom, {
  target,
  valueId,
  changes: { paddingTop: null },
  layout,
});
const after = store.get(structuresDocumentAtom);
const owner = after.structures.find(
  (structure) => structure.conceptId === root.conceptId,
)!;
assert.equal(
  owner.editor!.layouts![path].overrides![valueId].slots!.paddingTop,
  null,
);
assert.deepEqual(
  ownedLayoutAt(owner, path, after.structures)!.properties,
  ownedLayoutAt(root, path, baseline.structures!.structures)!.properties,
  "Parent differences must not modify shared Layout bindings.",
);
assert.deepEqual(owner.editor!.properties, root.editor!.properties);
assert.equal(
  structureSelection(
    configuredStructure(
      owner,
      path,
      after.structures,
      store.get(structurePreviewsAtom),
    ).structure,
    "paddingTop",
  ),
  null,
);
const portable = toPortableStructures(
  after,
  store.get(taxonomyDocumentAtom),
  {},
);
assert.equal(portable.status, "ready");
if (portable.status !== "ready") throw new Error("Expected portable source.");
assert.ok(
  portable.value.structures
    .find((structure) => structure.conceptId === root.conceptId)!
    .configuration.some(
      (entry) =>
        entry.when?.valueId === valueId &&
        JSON.stringify(entry.target) === JSON.stringify(target) &&
        entry.effect.kind === "binding" &&
        entry.effect.selection === null,
    ),
);

store.set(editStructureOptionBindingsAtom, {
  target: { structureId: root.conceptId, path: [] },
  valueId,
  changes: { height: { value: { kind: "sizing", preset: "fill" } } },
  layout,
});
const rootEdited = store
  .get(structuresDocumentAtom)
  .structures.find((structure) => structure.conceptId === root.conceptId)!;
assert.deepEqual(rootEdited.editor!.overrides[valueId].slots!.height, {
  value: { kind: "sizing", preset: "fill" },
});
assert.deepEqual(rootEdited.editor!.layouts, owner.editor!.layouts);
assert.throws(
  () =>
    store.set(editStructureOptionBindingsAtom, {
      target: { structureId: root.conceptId, path: [crypto.randomUUID()] },
      valueId,
      changes: { paddingLeft: null },
      layout,
    }),
  /owned layout/,
);
assert.throws(
  () =>
    store.set(editStructureOptionBindingsAtom, {
      target,
      valueId: density.defaultOptionId,
      changes: { paddingTop: null },
      layout,
    }),
  /nondefault/,
);
const renamed = renameVariantProperty(
  rootEdited.editor!,
  density.id,
  "Density test",
  store.get(taxonomyDocumentAtom),
);
store.set(updateStructureEditorAtom, {
  structureId: root.conceptId,
  editor: renamed.editor,
  taxonomy: renamed.taxonomy,
});
const renamedRoot = store
  .get(structuresDocumentAtom)
  .structures.find((structure) => structure.conceptId === root.conceptId)!;
assert.equal(
  renamedRoot.editor!.properties.find((property) => property.id === density.id)!
    .name,
  "Density test",
);
assert.equal(
  store
    .get(taxonomyDocumentAtom)
    .categories.find((category) => category.id === density.categoryId)!.name,
  "Density test",
);
assert.deepEqual(
  renamedRoot.editor!.properties.find((property) => property.id === density.id),
  {
    ...rootEdited.editor!.properties.find(
      (property) => property.id === density.id,
    ),
    name: "Density test",
  },
  "Renaming a registered category preserves option identities and naming assignments.",
);
assert.throws(
  () =>
    store.set(editStructureOptionBindingsAtom, {
      target,
      valueId: crypto.randomUUID(),
      changes: { paddingTop: null },
      layout,
    }),
  /nondefault/,
);
console.log(
  "Shared configuration edits: root/nested routing, parent ownership, preview selection, portable serialization and invalid/default rejection passed.",
);
