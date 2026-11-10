// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { createStore } from "jotai";
import {
  createDefaultSnapshot,
  enterEditModeAtom,
} from "../src/features/edit-session/state";
import { buildTshirtArtifacts } from "../src/features/design-data/tshirtArtifacts";
import {
  assertTshirtGraph,
  formatTshirtName,
} from "../src/features/design-data/tshirtProfile";
import {
  structureGeneration,
  structureSelection,
} from "../src/features/structures/model";
import { resolveStructure } from "../src/features/structures/resolution";
import {
  assertStructureGraph,
  isStructureInstance,
  topLevelStructures,
} from "../src/features/structures/children";
import { structureChanges } from "../src/features/structures/changes";
import { structureEditor } from "../src/features/structures/variants";
import { primitiveReferencesAtom } from "../src/features/tokens/primitiveReferenceState";
import {
  removeStructureAtom,
  restoreStructureAtom,
  structuresDocumentAtom,
} from "../src/features/structures/state";

const snapshot = createDefaultSnapshot();
const structures = snapshot.structures!.structures;
const listItem = structures.find(
  (structure) => structure.name === "List-item",
)!;
const verticalPadding = structures.find(
  (structure) => structure.name === "Vertical padding",
)!;
const contentLayout = structures.find(
  (structure) => structure.name === "Content layout",
)!;
const contentStart = structures.find(
  (structure) => structure.name === "Content start",
)!;
const contentEnd = structures.find(
  (structure) => structure.name === "Content end",
)!;
assert.ok(
  listItem && verticalPadding && contentLayout && contentStart && contentEnd,
);
assert.equal(structures.length, 10);
assert.deepEqual(
  [
    verticalPadding.parentStructureId,
    contentLayout.parentStructureId,
    contentStart.parentStructureId,
    contentEnd.parentStructureId,
  ],
  [
    listItem.conceptId,
    verticalPadding.conceptId,
    contentLayout.conceptId,
    contentLayout.conceptId,
  ],
);
assert.ok(
  topLevelStructures(structures).some(
    (structure) => structure.conceptId === listItem.conceptId,
  ),
);
assert.ok(
  [verticalPadding, contentLayout, contentStart, contentEnd].every(
    (layout) =>
      !topLevelStructures(structures).some(
        (structure) => structure.conceptId === layout.conceptId,
      ),
  ),
);
const reassignedLayout = structuredClone(snapshot.structures!);
const reassignedStart = reassignedLayout.structures.find(
  (structure) => structure.conceptId === contentStart.conceptId,
)!;
reassignedStart.parentStructureId = structures.find(
  (structure) => structure.name === "Text",
)!.conceptId;
assert.ok(
  structureChanges(reassignedLayout, snapshot.taxonomy!, snapshot.structures)
    .find((change) => change.conceptId === contentStart.conceptId)
    ?.fields.some((field) => field.key === "Containing Structure"),
);
assert.throws(
  () =>
    assertStructureGraph(
      structures.filter(
        (structure) => structure.conceptId !== listItem.conceptId,
      ),
    ),
  /containing Structure is unavailable/,
);
assert.deepEqual(structureSelection(listItem, "indent"), {
  $ref: "9a6ac9cd-6487-83eb-b395-b5bb3044537c",
});
assert.deepEqual(structureGeneration(listItem).sizeTermIds, [
  "b07988e3-0510-4bf5-a531-86ea718b1502",
  "b07988e3-0510-4bf5-a531-86ea718b1503",
]);
assert.deepEqual(
  listItem.elements?.map((element) => element.kind),
  ["structureReference"],
);
assert.ok(isStructureInstance(listItem.elements![0]));
assert.equal(listItem.elements![0].structureId, verticalPadding.conceptId);

const density = structureEditor(listItem).properties.find(
  (property) => property.kind === "variant" && property.name === "Density",
);
assert.ok(density?.kind === "variant");
assert.deepEqual(
  density.options.map((option) => option.name),
  ["Regular", "Spacious"],
);
assert.equal(density.defaultOptionId, density.options[0].id);
const verticalPath = `/${listItem.elements![0].id}`;
const spaciousPadding =
  listItem.editor?.layouts?.[verticalPath].overrides?.[density.options[1].id]
    ?.slots?.paddingTop;
assert.ok(spaciousPadding && "$ref" in spaciousPadding);
assert.equal(spaciousPadding.$ref, "7b3ba018-fae6-8c33-adde-4c99bb2d484c");
assert.equal(verticalPadding.editor, undefined);
assert.deepEqual(
  structureEditor(listItem).properties.map((property) => property.name),
  [
    "Density",
    "Horizontal padding",
    "Vertical padding",
    "Indentation distance",
    "Drag handle",
    "Selection indicator",
    "Buttons",
    "Secondary content",
    "Switch",
    "Drill-in",
  ],
);
assert.equal(
  contentStart.elements?.find((child) => child.kind === "structureReference")
    ?.structureId,
  structures.find((structure) => structure.name === "Base")!.conceptId,
);

assert.deepEqual(
  contentLayout.elements?.map((element) => element.kind),
  ["structureReference", "structureReference"],
);
assert.equal(contentStart.elements?.[0]?.kind, "slot");
assert.equal(contentStart.elements?.[0]?.name, "Selection indicator");
assert.deepEqual(
  contentStart.elements
    ?.slice(1)
    .map((element) =>
      element.kind === "uiIcon" ? element.glyph : element.kind,
    ),
  ["DragHandle", "structureReference"],
);
assert.deepEqual(
  contentEnd.elements?.map((element) =>
    element.kind === "uiIcon"
      ? element.glyph
      : element.kind === "slot"
        ? element.name
        : element.kind,
  ),
  ["Buttons", "Secondary content", "Switch", "ChevronRight"],
);
for (const icon of [contentStart.elements?.[1], contentEnd.elements?.[3]]) {
  assert.ok(icon?.kind === "uiIcon");
  assert.equal(icon.bindings[0]?.$ref, "4d990337-64bf-8a3e-a747-cce35df672b3");
}

const bundle = buildTshirtArtifacts(snapshot, "shipped");
assertTshirtGraph(
  bundle.tokens,
  undefined,
  ["2x-small", "2x-large"],
  bundle.modeSets,
);
const listRows = bundle.semantics.filter((row) =>
  [listItem, verticalPadding, contentLayout].some(
    (structure) => structure.conceptId === row.structureId,
  ),
);
const expected = [
  ["list-indent-medium", 16, 20],
  ["list-indent-large", 24, 30],
  ["list-item-gap-small", 2, 2.5],
  ["list-item-gap-medium", 8, 10],
  ["list-item-padding-horizontal-small", 6, 7.5],
  ["list-item-padding-horizontal-medium", 6, 7.5],
  ["list-item-padding-vertical-small-regular", 4, 5],
  ["list-item-padding-vertical-medium-regular", 4, 5],
  ["list-item-padding-vertical-small-spacious", 8, 10],
  ["list-item-padding-vertical-medium-spacious", 8, 10],
  ["list-ui-icon-size-medium", 10, 13],
  ["list-ui-icon-size-large", 10, 13],
] as const;
const scaleAxis = snapshot.modeSets.find((axis) => axis.key === "scale");
assert.ok(scaleAxis);
const defaultScale = scaleAxis.modes.find(
  (mode) => mode.id === scaleAxis.defaultModeId,
);
assert.ok(defaultScale);
assert.deepEqual(
  scaleAxis.modes.map((mode) => mode.key),
  ["desktop", "mobile"],
);
assert.equal(defaultScale.key, "desktop");
assert.equal(listRows.length, expected.length * scaleAxis.modes.length);
for (const [scale, column] of [
  ["desktop", 1],
  ["mobile", 2],
] as const) {
  const rows: typeof listRows = listRows.filter(
    (row) => (row.context.scale ?? defaultScale.key) === scale,
  );
  assert.equal(rows.length, expected.length);
  for (const row of rows) {
    assert.ok(Object.keys(row.context).every((key) => key === "scale"));
    assert.equal(
      row.selection[scaleAxis.id] ?? defaultScale.id,
      scaleAxis.modes.find((mode) => mode.key === scale)!.id,
    );
  }
  assert.deepEqual(
    new Map(
      rows.map((row) => [
        formatTshirtName(
          Object.fromEntries(
            Object.entries(row.token.name).filter(([key]) => key !== "scale"),
          ),
        ),
        row.target.value,
      ]),
    ),
    new Map(expected.map((entry) => [entry[0], entry[column]])),
    `${scale} keeps the exact List-item names, values and context coverage.`,
  );
}

const references = createStore().get(primitiveReferencesAtom);
const indentation = ([0, 1, 2] as const).map(
  (level) =>
    resolveStructure(listItem, references, undefined, level).styles
      .marginInlineStart,
);
assert.deepEqual(indentation, [0, 16, 32]);
assert.deepEqual(
  buildTshirtArtifacts(snapshot, "shipped").semantics,
  bundle.semantics,
  "Preview indentation does not add, remove, remint or change semantic tokens.",
);

const layoutStore = createStore();
layoutStore.set(enterEditModeAtom);
const removed = layoutStore.set(removeStructureAtom, listItem.conceptId);
assert.equal(removed.nestedStructures?.length, 4);
assert.ok(
  layoutStore
    .get(structuresDocumentAtom)
    .structures.every(
      (structure) => structure.parentStructureId !== listItem.conceptId,
    ),
);
layoutStore.set(restoreStructureAtom, removed);
assert.deepEqual(layoutStore.get(structuresDocumentAtom), snapshot.structures);
