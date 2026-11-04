// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
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
import {
  findStructureLayer,
  structureLayerPreview,
  structureLayers,
} from "../src/features/structures/layers";
import {
  isLeaf,
  structureCandidates,
  topLevelStructures,
} from "../src/features/structures/children";
import { structureEditor } from "../src/features/structures/variants";
import { createStore } from "jotai";
import { primitiveReferencesAtom } from "../src/features/tokens/primitiveReferenceState";
import { resolveComposition } from "../src/features/structures/composition";
import { rulesAtom } from "../src/features/logic/library";
import { UNMEASURED_LAYOUT } from "../src/features/structures/resolution";
import { type StructureLayer } from "../src/features/structures/layers";
import { createBooleanProperty } from "../src/features/option-groups/model";
import {
  insertElementAtom,
  insertLayoutAtom,
  insertStructureInstanceAtom,
  removeElementAtom,
  restoreElementAtom,
  selectedElementIdAtom,
} from "../src/features/structures/elementState";
import {
  renameStructureAtom,
  structuresDocumentAtom,
} from "../src/features/structures/state";
import { buildTshirtArtifacts } from "../src/features/design-data/tshirtArtifacts";
import { structureChanges } from "../src/features/structures/changes";
import { compareAuthoring } from "../src/features/changelog/registry";

const catalog = createDefaultSnapshot().structures!.structures;
const listItem = catalog.find((structure) => structure.name === "List-item")!;
const layers = structureLayers(listItem, catalog);
const verticalPadding = layers.find(
  (layer) => layer.layout?.name === "Vertical padding",
)!;
assert.ok(verticalPadding);
assert.equal(verticalPadding.owner, listItem);
const content = verticalPadding.children.find(
  (layer) => layer.layout?.name === "Content layout",
)!;
assert.ok(content);
for (const name of ["Content start", "Content end"]) {
  const layer = content.children.find((layer) => layer.layout?.name === name)!;
  assert.ok(layer);
  assert.equal(layer.owner, content.layout);
  assert.equal(findStructureLayer(layers, layer.key), layer);
  assert.equal(layer.path, `${content.path}/${layer.child.id}`);
  assert.ok(layer.children.length > 0);
  for (const child of layer.children)
    assert.equal(findStructureLayer(layers, child.key)?.owner, layer.layout);
}
assert.equal(findStructureLayer(layers, "missing"), undefined);
assert.equal(findStructureLayer(layers, null), undefined);

const base = catalog.find((structure) => structure.name === "Base")!;
const text = structureLayers(base, catalog).find(
  (layer) =>
    !isLeaf(layer.child) &&
    catalog.find((structure) => structure.conceptId === layer.child.structureId)
      ?.name === "Text",
)!;
assert.ok(text);
assert.equal(text.layout, undefined);
assert.deepEqual(text.children, []);

const accessory = catalog.find((structure) => structure.name === "Accessory")!;
const accessoryLayers = structureLayers(accessory, catalog);
assert.ok(
  accessoryLayers.some((layer) => layer.layout?.name === "Accessory item"),
);
const collect = (items: readonly StructureLayer[]): StructureLayer[] =>
  items.flatMap((layer) => [layer, ...collect(layer.children)]);
const accessoryKeys = collect(accessoryLayers).map((layer) => layer.key);
assert.equal(new Set(accessoryKeys).size, accessoryKeys.length);
for (const layer of collect(accessoryLayers))
  assert.equal(findStructureLayer(accessoryLayers, layer.key), layer);
assert.ok(
  accessoryLayers.some(
    (layer) => layer.layout?.name === "Accessory workflow item",
  ),
);

const density = structureEditor(listItem).properties.find(
  (property) => property.kind === "variant",
)!;
assert.equal(density.kind, "variant");
const initial = structureLayerPreview(listItem, {});
assert.equal(initial.activePropertyId, density.id);
assert.equal(initial.options[density.id], density.defaultOptionId);
const option = density.options.find(
  (item) => item.id !== density.defaultOptionId,
)!;
const previews = {
  [listItem.conceptId]: {
    ...initial,
    options: { [density.id]: option.id },
  },
};
assert.equal(
  structureLayerPreview(listItem, previews).options[density.id],
  option.id,
);
assert.equal(
  structureLayerPreview(verticalPadding.layout!, previews).options[density.id],
  undefined,
);
assert.equal(
  structureLayerPreview(listItem, {
    [listItem.conceptId]: {
      ...initial,
      options: { [density.id]: "removed" },
    },
  }).options[density.id],
  density.defaultOptionId,
);
const boolean = createBooleanProperty("Nested content");
const source = structuredClone(content.layout!);
source.editor = {
  ...structureEditor(source),
  properties: [...structureEditor(source).properties, boolean],
  visibilityBindings: {
    ...structureEditor(source).visibilityBindings,
    [source.elements![0].id]: { propertyId: boolean.id, inverted: false },
  },
};
const testCatalog = catalog.map((structure) =>
  structure.conceptId === source.conceptId ? source : structure,
);
const nestedPreview = structureLayerPreview(source, {});
const hidden = {
  [source.conceptId]: {
    ...nestedPreview,
    booleans: { ...nestedPreview.booleans, [boolean.id]: false },
  },
};
const store = createStore();
const composition = resolveComposition(
  listItem,
  testCatalog,
  store.get(primitiveReferencesAtom),
  store.get(rulesAtom),
  undefined,
  {},
  "m",
  UNMEASURED_LAYOUT,
  {},
  {},
  0,
  hidden,
);
const paddingModule = composition.children.find(
  (child) =>
    "composition" in child &&
    child.composition.structure.conceptId === verticalPadding.layout!.conceptId,
)!;
assert.ok("composition" in paddingModule);
const contentModule = paddingModule.composition.children.find(
  (child) =>
    "composition" in child &&
    child.composition.structure.conceptId === source.conceptId,
)!;
assert.ok("composition" in contentModule);
assert.equal(
  contentModule.composition.children.length,
  source.elements!.length - 1,
);
const hiddenTree = structureLayers(listItem, testCatalog, hidden);
assert.ok(
  findStructureLayer(hiddenTree, `${content.path}/${source.elements![0].id}`),
);
assert.equal(source.editor.visibility[source.elements![0].id], undefined);

const authoring = createStore();
const before = authoring.get(authoringSnapshotAtom);
const ownerId = base.conceptId;
const insertLayout = (structureId = ownerId, index = 0) =>
  authoring.set(insertLayoutAtom, { structureId, index });
const structures = () => authoring.get(structuresDocumentAtom).structures;
const reference = (structureId: string, elementId: string) => {
  const child = structures()
    .find((item) => item.conceptId === structureId)!
    .elements!.find((item) => item.id === elementId)!;
  assert.ok(child && !isLeaf(child));
  return structures().find((item) => item.conceptId === child.structureId)!;
};
assert.throws(() => insertLayout(), /Enter edit mode/);
assert.deepEqual(authoring.get(authoringSnapshotAtom), before);
authoring.set(enterEditModeAtom);
assert.throws(() => insertLayout("missing"), /unavailable/);
assert.throws(() => insertLayout(ownerId, -1), /insertion|position|index/i);
assert.deepEqual(authoring.get(authoringSnapshotAtom), before);

const firstId = insertLayout();
const first = reference(ownerId, firstId);
const secondId = insertLayout();
const second = reference(ownerId, secondId);
assert.equal(first.name, "Layout 1");
assert.equal(second.name, "Layout 2");
assert.equal(first.parentStructureId, ownerId);
assert.equal(
  topLevelStructures(structures()).length,
  topLevelStructures(catalog).length,
);
assert.ok(!structureCandidates(structures(), ownerId).includes(first));
authoring.set(renameStructureAtom, { id: first.conceptId, name: "Content" });
assert.equal(reference(ownerId, firstId).name, "Content");
const named = authoring.get(authoringSnapshotAtom);
assert.throws(
  () => authoring.set(renameStructureAtom, { id: first.conceptId, name: " " }),
  /name/,
);
assert.deepEqual(authoring.get(authoringSnapshotAtom), named);
const nestedId = insertLayout(first.conceptId);
const nested = reference(first.conceptId, nestedId);
const leafId = authoring.set(insertElementAtom, {
  structureId: nested.conceptId,
  kind: "slot",
  index: 0,
});
const textSource = catalog.find((item) => item.name === "Text")!;
authoring.set(insertStructureInstanceAtom, {
  structureId: nested.conceptId,
  targetId: textSource.conceptId,
  index: 1,
});
const selectionId = `/${firstId}/${nestedId}/${leafId}`;
assert.equal(
  findStructureLayer(
    structureLayers(
      structures().find((item) => item.conceptId === ownerId)!,
      structures(),
    ),
    selectionId,
  )?.owner.conceptId,
  nested.conceptId,
);
const populated = structuredClone(authoring.get(structuresDocumentAtom));
const removed = authoring.set(removeElementAtom, {
  structureId: ownerId,
  elementId: firstId,
  confirmed: true,
});
assert.ok(
  !structures().some(
    (item) =>
      item.conceptId === first.conceptId || item.conceptId === nested.conceptId,
  ),
);
assert.ok(structures().some((item) => item.conceptId === second.conceptId));
assert.ok(structures().some((item) => item.conceptId === textSource.conceptId));
authoring.set(restoreElementAtom, removed);
assert.deepEqual(authoring.get(structuresDocumentAtom), populated);
const removedLeaf = authoring.set(removeElementAtom, {
  structureId: nested.conceptId,
  elementId: leafId,
  confirmed: true,
  selectionId,
});
authoring.set(restoreElementAtom, removedLeaf);
assert.equal(authoring.get(selectedElementIdAtom), selectionId);
assert.deepEqual(authoring.get(structuresDocumentAtom), populated);

const repeatedId = authoring.set(insertStructureInstanceAtom, {
  structureId: ownerId,
  targetId: first.conceptId,
  index: 0,
});
authoring.set(removeElementAtom, {
  structureId: ownerId,
  elementId: repeatedId,
  confirmed: true,
});
assert.deepEqual(authoring.get(structuresDocumentAtom), populated);

const governedLayout = verticalPadding.layout!;
const originalArtifacts = buildTshirtArtifacts(before);
assert.deepEqual(
  buildTshirtArtifacts(authoring.get(authoringSnapshotAtom)),
  originalArtifacts,
);
authoring.set(renameStructureAtom, {
  id: governedLayout.conceptId,
  name: "Row padding",
});
const renamed = structures().find(
  (item) => item.conceptId === governedLayout.conceptId,
)!;
assert.deepEqual(renamed.generation, governedLayout.generation);
assert.deepEqual(
  authoring.get(authoringSnapshotAtom).taxonomy,
  before.taxonomy,
);
assert.deepEqual(buildTshirtArtifacts(authoring.get(authoringSnapshotAtom)), {
  ...originalArtifacts,
  semantics: originalArtifacts.semantics.map((row) =>
    row.structureId === governedLayout.conceptId
      ? { ...row, structureName: "Row padding" }
      : row,
  ),
});

const changes = structureChanges(
  authoring.get(structuresDocumentAtom),
  before.taxonomy!,
  before.structures,
);
assert.equal(changes.filter((change) => change.kind === "new").length, 3);
assert.ok(changes.some((change) => change.conceptId === first.conceptId));
assert.ok(
  compareAuthoring(before, authoring.get(authoringSnapshotAtom)).groups.length >
    0,
);
assertStoredSnapshot(authoring.get(authoringSnapshotAtom));
authoring.set(cancelEditAtom);
assert.deepEqual(authoring.get(authoringSnapshotAtom), before);
authoring.set(enterEditModeAtom);
insertLayout();
authoring.set(saveEditAtom);
assert.deepEqual(
  authoring.get(editSessionSnapshotAtom),
  authoring.get(authoringSnapshotAtom),
);
const reloaded = createStore();
reloaded.set(
  restoreAuthoringSnapshotAtom,
  JSON.parse(JSON.stringify(authoring.get(authoringSnapshotAtom))),
);
assert.deepEqual(
  reloaded.get(authoringSnapshotAtom),
  authoring.get(authoringSnapshotAtom),
);
console.log(
  "Structure layers: owned hierarchy, local editing, Layout creation/nesting, deletion/Undo, naming, unchanged token output and Save/Cancel/reload passed.",
);
