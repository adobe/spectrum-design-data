// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { taxonomyTokenTree } from "../src/features/taxonomy/tree";
import {
  filterBrowserTokens,
  groupBrowserCards,
  type BrowserToken,
} from "../src/features/tokens/browserModel";
import {
  compactTokenTableTree,
  isSelectableBrowserToken,
  resolveTokenTableSelection,
  selectedTokenTableRows,
  tokenSelectionState,
  tokenTableSelectionIndex,
  toggleTokenSelection,
  type TokenTablePresentationRow,
} from "../src/features/tokens/view/tokenTablePresentation";
import { createTshirtFixture } from "./fixtures/tshirt";

function token(
  id: string,
  name: string,
  path: [string, string, string | number][],
): BrowserToken {
  return {
    id,
    name,
    generatedName: name,
    type: "colors",
    groupId: "palette",
    groupLabel: "Palette",
    value: "#ff9900",
    generatedValue: "#ff9900",
    unit: "",
    description: "",
    status: "draft",
    nameOverridden: false,
    valueOverridden: false,
    stale: false,
    projection: {
      classification: {},
      flat: {},
      name,
      issues: [],
      segments: path.map(([categoryId, categoryName, value]) => ({
        categoryId,
        categoryName,
        key: categoryId,
        termIds: [`${categoryId}:${value}`],
        values: [value],
      })),
    },
  };
}
const color = (name: string): [string, string, string] => [
  "color",
  "Color name",
  name,
];
const property = (name: string): [string, string, string] => [
  "property",
  "Property",
  name,
];
const step = (value: number): [string, string, number] => [
  "index",
  "Scale index",
  value,
];
const orange = token("orange", "illustrator-orange-color", [
  color("Illustrator Orange"),
  property("color"),
]);
const red100 = token("red-100", "red-color-100", [
  color("Red"),
  property("color"),
  step(100),
]);
const red200 = token("red-200", "red-color-200", [
  color("Red"),
  property("color"),
  step(200),
]);
const red = token("red", "red-color", [color("Red"), property("color")]);
const opacity = token("opacity", "red-opacity", [
  color("Red"),
  property("opacity"),
]);
const display = (tokens: BrowserToken[]) =>
  compactTokenTableTree(taxonomyTokenTree(tokens));
const leaves = (rows: TokenTablePresentationRow[]): BrowserToken[] =>
  rows.flatMap((row) => [
    ...(row.token ? [row.token] : []),
    ...leaves(row.children),
  ]);

const original = structuredClone([orange, red100, red200]);
const singleton = display([orange]);
assert.equal(singleton.length, 1);
assert.equal(singleton[0].id, orange.id);
assert.equal(singleton[0].label, "Illustrator Orange color");
assert.equal(singleton[0].token, orange);
assert.equal(singleton[0].children.length, 0);
assert.equal(singleton[0].sourcePathIds.length, 2);

const branching = display([red100, red200, orange]);
assert.deepEqual(
  branching.map((row) => row.label),
  ["Red color", "Illustrator Orange color"],
);
assert.deepEqual(
  branching[0].children.map((row) => row.label),
  ["100", "200"],
);
assert.deepEqual(
  branching[0].children.map((row) => row.contextLabel),
  ["Red color 100", "Red color 200"],
);
assert.deepEqual(
  leaves(branching).map((item) => item.id),
  ["red-100", "red-200", "orange"],
);
assert.deepEqual(
  [orange, red100, red200],
  original,
  "Presentation does not mutate names, paths, values or source metadata.",
);

const properties = display([red, opacity]);
assert.equal(properties[0].label, "Red");
assert.deepEqual(
  properties[0].children.map((row) => row.label),
  ["color", "opacity"],
);
const prefix = display([red, red100, red200]);
assert.equal(prefix[0].id, red.id);
assert.equal(prefix[0].label, "Red color");
assert.equal(prefix[0].token, red);
assert.deepEqual(
  prefix[0].children.map((row) => row.label),
  ["100", "200"],
);
assert.deepEqual(
  leaves(prefix).map((item) => item.id),
  ["red", "red-100", "red-200"],
);
const deeperPrefix = display([red, red100]);
assert.equal(
  deeperPrefix[0].children[0].label,
  "100",
  "Do not collapse through an actual token endpoint.",
);

const reversed = display(
  [red100, red200].map((item) => ({
    ...item,
    projection: {
      ...item.projection!,
      segments: [...item.projection!.segments].reverse(),
    },
  })),
);
assert.deepEqual(
  reversed.map((row) => row.label),
  ["100 color Red", "200 color Red"],
);
const fractional = token("fractional", "red-color-minus-0-5", [
  color("Red"),
  property("color"),
  step(-0.5),
]);
assert.equal(display([fractional])[0].label, "Red color -0.5");
const renamed = display([
  {
    ...red100,
    projection: {
      ...red100.projection!,
      segments: [
        { ...red100.projection!.segments[0], values: ["Crimson"] },
        ...red100.projection!.segments.slice(1),
      ],
    },
  },
  red200,
]);
assert.equal(
  renamed[0].id,
  branching[0].id,
  "Term labels do not determine branch identity.",
);
assert.equal(renamed[0].label, "Crimson color");
const duplicate = display([orange, { ...orange, id: "another-orange" }]);
assert.deepEqual(
  leaves(duplicate).map((item) => item.id),
  ["orange", "another-orange"],
  "Distinct tokens with an identical path are never dropped.",
);

const unresolved = {
  ...orange,
  projection: { ...orange.projection!, issues: ["Unresolved term"] },
};
const aliases: BrowserToken = {
  ...orange,
  id: "alias",
  name: "old-orange",
  alias: {
    id: "alias",
    name: "old-orange",
    $ref: orange.id,
    contexts: ["[]"],
    targetName: orange.name,
  },
};
const sections = display([unresolved, aliases]);
assert.deepEqual(
  sections.map((row) => row.label),
  ["Unresolved classification", "Compatibility aliases"],
);
assert.equal(sections[0].children[0].token, unresolved);
assert.equal(sections[1].children[0].token, aliases);
assert.equal(isSelectableBrowserToken(aliases), false);
const semantic = {
  ...red200,
  semantic: createTshirtFixture().bundle.semantics[0],
};
assert.equal(isSelectableBrowserToken(semantic), false);
const readonlyIndex = tokenTableSelectionIndex(display([aliases, semantic]));
assert.equal(readonlyIndex.eligibleIds.size, 0);
assert.deepEqual(tokenSelectionState(readonlyIndex.eligibleIds, new Set()), {
  isSelected: false,
  isIndeterminate: false,
  isDisabled: true,
});
const mixedIndex = tokenTableSelectionIndex(display([red100, semantic]));
assert.deepEqual([...mixedIndex.eligibleIds], [red100.id]);
const mixedGroup = mixedIndex.parents[0];
assert.deepEqual([...mixedIndex.rows.get(mixedGroup.id)!], [red100.id]);

const index = tokenTableSelectionIndex(branching);
const groupIds = index.rows.get(branching[0].id)!;
assert.deepEqual([...groupIds], ["red-100", "red-200"]);
assert.deepEqual(tokenSelectionState(groupIds, new Set()), {
  isSelected: false,
  isIndeterminate: false,
  isDisabled: false,
});
const partlySelected = new Set(["orange", "red-100"]);
assert.equal(
  tokenSelectionState(groupIds, partlySelected).isIndeterminate,
  true,
);
const selected = toggleTokenSelection(partlySelected, groupIds);
assert.deepEqual([...selected].sort(), ["orange", "red-100", "red-200"]);
assert.equal(tokenSelectionState(groupIds, selected).isSelected, true);
assert.deepEqual([...toggleTokenSelection(selected, groupIds)], ["orange"]);
assert.deepEqual(
  [...partlySelected],
  ["orange", "red-100"],
  "Selection operations do not mutate the prior set.",
);
assert.equal(
  selectedTokenTableRows(index, partlySelected).has(branching[0].id),
  false,
);
assert.equal(
  selectedTokenTableRows(index, selected).has(branching[0].id),
  true,
);

const parentIndex = tokenTableSelectionIndex(prefix);
assert.deepEqual(
  [...parentIndex.rows.get(red.id)!],
  ["red", "red-100", "red-200"],
);
assert.deepEqual(
  [...resolveTokenTableSelection(new Set([red.id]), parentIndex, new Set())],
  ["red", "red-100", "red-200"],
);
assert.deepEqual(
  [
    ...resolveTokenTableSelection(
      new Set(),
      parentIndex,
      new Set(["red", "red-100", "red-200"]),
    ),
  ],
  [],
);
const rowKeys = selectedTokenTableRows(index, selected);
rowKeys.delete(red100.id);
const deselectedChild = resolveTokenTableSelection(rowKeys, index, selected);
assert.deepEqual([...deselectedChild].sort(), ["orange", "red-200"]);
assert.equal(
  tokenSelectionState(groupIds, deselectedChild).isIndeterminate,
  true,
);
const parentKeys = selectedTokenTableRows(index, selected);
parentKeys.delete(branching[0].id);
assert.deepEqual(
  [...resolveTokenTableSelection(parentKeys, index, selected)],
  ["orange"],
);
assert.deepEqual(
  [...resolveTokenTableSelection("all", index, new Set())].sort(),
  ["orange", "red-100", "red-200"],
);
assert.deepEqual(
  [...resolveTokenTableSelection(new Set(["unknown"]), index, new Set())],
  [],
);

const filtered = filterBrowserTokens(
  [red100, red200, orange],
  "colors",
  "red 100",
);
const filteredTree = display(filtered);
assert.equal(filteredTree[0].label, "Red color 100");
assert.equal(filteredTree[0].children.length, 0);
assert.deepEqual(
  [...tokenTableSelectionIndex(filteredTree).eligibleIds],
  ["red-100"],
);
assert.deepEqual(
  [
    ...resolveTokenTableSelection(
      "all",
      tokenTableSelectionIndex(filteredTree),
      new Set(),
    ),
  ],
  ["red-100"],
);
const nested = tokenTableSelectionIndex(
  display([red100, red200, opacity, orange]),
);
assert(nested.parents.length > 1);
const nestedSelected = resolveTokenTableSelection(
  new Set(nested.parents.map((row) => row.id)),
  nested,
  new Set(),
);
assert.equal(
  nestedSelected.size,
  3,
  "Overlapping parent groups count distinct eligible tokens.",
);

const grid = groupBrowserCards([orange, red100, red200]);
assert.deepEqual(grid.map((group) => group.label).sort(), [
  "Illustrator Orange",
  "Red",
]);
assert.deepEqual(
  grid.find((group) => group.label === "Red")!.tokens.map((item) => item.name),
  ["red-color-100", "red-color-200"],
);
assert.deepEqual(display([]), []);
console.log(
  "Token table compaction, unique endpoints, token-bearing parents, scoped selection and term-only Grid headings passed.",
);
