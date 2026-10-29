// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import {
  MODE_SET_DEFAULTS,
  type Mode,
  type ModeSet,
} from "../src/features/modes/model";
import {
  contextForModes,
  modeCombinationCount,
  modeCombinations,
  modeSelections,
  modesForSelection,
  selectionForModes,
} from "../src/features/modes/combinations";

function mode(id: string): Mode {
  return {
    id,
    key: `${id}-key`,
    name: id,
    description: "",
    iconId: "none",
    platformIds: [],
    foundations: {},
  };
}
function set(id: string, modeIds: string[]): ModeSet {
  return {
    id,
    key: `${id}-key`,
    name: id,
    description: "",
    defaultModeId: modeIds[0] ?? "",
    iconId: "none",
    modes: modeIds.map(mode),
  };
}

// The inline expressions the app used before this helper existed, copied verbatim as the reference.
const referenceLists = (axes: ModeSet[]) =>
  axes.reduce<Mode[][]>(
    (rows, axis) => rows.flatMap((row) => axis.modes.map((m) => [...row, m])),
    [[]],
  );
const referenceSelections = (
  axes: ModeSet[],
  seed: Record<string, string> = {},
) =>
  axes.reduce<Record<string, string>[]>(
    (rows, axis) =>
      rows.flatMap((selection) =>
        axis.modes.map((m) => ({ ...selection, [axis.id]: m.id })),
      ),
    [{ ...seed }],
  );
const referenceCount = (axes: ModeSet[]) =>
  axes.reduce((count, axis) => count * axis.modes.length, 1);

const fixtures: Record<string, ModeSet[]> = {
  none: [],
  one: [set("a", ["a1", "a2"])],
  shipped: structuredClone([...MODE_SET_DEFAULTS]),
  threeUneven: [
    set("a", ["a1", "a2"]),
    set("b", ["b1"]),
    set("c", ["c1", "c2", "c3", "c4"]),
  ],
  withEmptySet: [
    set("a", ["a1", "a2"]),
    set("empty", []),
    set("c", ["c1", "c2"]),
  ],
};

for (const [name, axes] of Object.entries(fixtures)) {
  assert.equal(
    modeCombinationCount(axes),
    referenceCount(axes),
    `${name}: count`,
  );
  assert.deepEqual(
    modeCombinations(axes),
    referenceLists(axes),
    `${name}: lists and order`,
  );
  assert.deepEqual(
    modeSelections(axes),
    referenceSelections(axes),
    `${name}: selections and order`,
  );
  assert.deepEqual(
    modeSelections(axes, { a: "seeded", extra: "kept" }),
    referenceSelections(axes, { a: "seeded", extra: "kept" }),
    `${name}: seeded selections`,
  );
  assert.deepEqual(
    modeSelections(axes).map((s) => Object.keys(s)),
    referenceSelections(axes).map((s) => Object.keys(s)),
    `${name}: selection key order`,
  );
}

// An axis with no modes yields no combinations; callers filter those axes out first.
assert.equal(modeCombinationCount(fixtures.withEmptySet), 0);
assert.deepEqual(modeCombinations(fixtures.withEmptySet), []);

// Seed is copied, not shared.
const seed = { a: "a1" };
modeSelections(fixtures.one, seed)[0].a = "changed";
assert.equal(seed.a, "a1");

// Translation helpers match the expressions the call sites used.
const axes = fixtures.threeUneven;
for (const modes of modeCombinations(axes)) {
  assert.deepEqual(
    selectionForModes(axes, modes),
    Object.fromEntries(modes.map((m, index) => [axes[index].id, m.id])),
  );
  assert.deepEqual(
    contextForModes(axes, modes),
    Object.fromEntries(axes.map((axis, index) => [axis.key, modes[index].key])),
  );
}
for (const selection of modeSelections(axes)) {
  assert.deepEqual(
    modesForSelection(axes, selection),
    axes.map((axis) => axis.modes.find((m) => m.id === selection[axis.id])!),
  );
  assert.deepEqual(
    selectionForModes(axes, modesForSelection(axes, selection)),
    selection,
  );
}
assert.deepEqual(modesForSelection(axes, { a: "a1" }).slice(1), [
  undefined,
  undefined,
]);

console.log("Mode combination helpers match the previous inline expressions.");
