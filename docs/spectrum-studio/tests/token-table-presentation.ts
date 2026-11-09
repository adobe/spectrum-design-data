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
import { createMode, createModeSet } from "../src/features/modes/model";
import type { CanonicalAliasRow } from "../src/features/tokens/aliasTargets";
import {
  allModeTokenTableRows,
  filterAllModeTokenTableRows,
} from "../src/features/tokens/view/allModeTokenTable";

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
assert.equal(singleton[0].label, "Illustrator orange color");
assert.equal(singleton[0].token, orange);
assert.equal(singleton[0].children.length, 0);
assert.equal(singleton[0].sourcePathIds.length, 2);

const branching = display([red100, red200, orange]);
assert.deepEqual(
  branching.map((row) => row.label),
  ["Red color", "Illustrator orange color"],
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
  ["Color", "Opacity"],
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
  ["100 color red", "200 color red"],
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
  "Illustrator orange",
  "Red",
]);
assert.deepEqual(
  grid.find((group) => group.label === "Red")!.tokens.map((item) => item.name),
  ["red-color-100", "red-color-200"],
);
assert.deepEqual(display([]), []);

const scheme = createModeSet();
scheme.name = "Color scheme";
scheme.modes[0].name = "Light";
const darkMode = { ...createMode(), name: "Dark" };
scheme.modes.push(darkMode);
const contrast = createModeSet();
contrast.name = "Contrast";
contrast.modes[0].name = "Regular";
const allSets = [scheme, contrast];
const lightContext = JSON.stringify([[scheme.id, scheme.defaultModeId]]);
const darkContext = JSON.stringify([[scheme.id, darkMode.id]]);
const canonicalRow = (
  item: BrowserToken,
  context = "[]",
): CanonicalAliasRow => ({
  id: item.id,
  name: item.name,
  context,
  rowId: JSON.stringify([item.id, context]),
  token: item,
});
const colorRows = [
  canonicalRow(red100, lightContext),
  canonicalRow({ ...red100, value: "#112233" }, darkContext),
  canonicalRow(orange),
  canonicalRow(semantic, darkContext),
];
const allTree = allModeTokenTableRows(colorRows, allSets, {
  schemaVersion: 1,
  tokens: [
    {
      id: "scoped-alias",
      name: "old-red",
      $ref: red100.id,
      contexts: [lightContext, darkContext],
    },
    {
      id: "static-alias",
      name: "old-orange",
      $ref: orange.id,
      contexts: ["[]"],
    },
  ],
});
assert.equal(
  allTree.length,
  5,
  "Each token and compatibility alias has one parent.",
);
const allRed = allTree.find((row) => row.token?.id === red100.id)!;
assert.equal(allRed.label, red100.name);
assert.deepEqual(
  allRed.children.map((row) => [row.label, row.token?.value, row.modeContext]),
  [
    ["Color scheme: Light", red100.value, lightContext],
    ["Color scheme: Dark", "#112233", darkContext],
  ],
  "Children use catalog values and label only relevant mode axes.",
);
assert.equal(
  allTree.find((row) => row.token?.id === orange.id)!.children[0].label,
  "Default",
);
assert.equal(
  allTree.find((row) => row.token?.id === semantic.id)!.children[0].modeContext,
  darkContext,
  "A semantic token absent from the active mode still appears.",
);
assert.deepEqual(
  allTree
    .find((row) => row.token?.id === "scoped-alias")!
    .children.map((row) => row.token?.value),
  [red100.value, "#112233"],
);
assert.equal(
  allTree.find((row) => row.token?.id === "static-alias")!.children[0].token
    ?.alias?.targetName,
  orange.name,
);
const allIds = allTree.flatMap((row) => [
  row.id,
  ...row.children.map((child) => child.id),
]);
assert.equal(
  new Set(allIds).size,
  allIds.length,
  "Token and mode row identities never collide.",
);
assert.notEqual(allRed.id, allRed.children[0].id);
assert.deepEqual(
  filterAllModeTokenTableRows(allTree, "colors", "#112233").map(
    (row) => row.token?.id,
  ),
  [red100.id, "scoped-alias"],
  "Search matches values from non-active modes.",
);
assert.equal(
  filterAllModeTokenTableRows(allTree, "colors", "red 100")[0].children.length,
  2,
);
assert.deepEqual(
  filterAllModeTokenTableRows(allTree, "spacing", "red 100"),
  [],
);
assert.deepEqual(allModeTokenTableRows([], allSets), []);
const equalTree = allModeTokenTableRows(
  [canonicalRow(red100, lightContext), canonicalRow(red100, darkContext)],
  allSets,
);
assert.equal(
  equalTree[0].children.length,
  2,
  "Equal values do not collapse distinct contexts.",
);
const renamedTree = allModeTokenTableRows(colorRows, [
  {
    ...scheme,
    name: "Scheme",
    modes: scheme.modes.map((mode) => ({
      ...mode,
      name: `Renamed ${mode.name}`,
    })),
  },
  contrast,
]);
assert.deepEqual(
  renamedTree[0].children.map((row) => row.id),
  allRed.children.map((row) => row.id),
  "Display labels never determine mode row identity.",
);
const jointContext = JSON.stringify(
  [
    [contrast.id, contrast.defaultModeId],
    [scheme.id, darkMode.id],
  ].sort(([a], [b]) => a.localeCompare(b)),
);
assert.equal(
  allModeTokenTableRows([canonicalRow(red100, jointContext)], allSets)[0]
    .children[0].label,
  "Color scheme: Dark / Contrast: Regular",
  "Mode labels follow the authored set order, not canonical ID ordering.",
);
const manualReference = {
  ...red100,
  id: "manual-reference",
  referenceId: orange.id,
  referenceName: orange.name,
  valueOverridden: true,
};
const manualTree = allModeTokenTableRows(
  [canonicalRow(manualReference)],
  allSets,
);
assert.equal(
  manualTree[0].children[0].token,
  manualReference,
  "Resolved references and override metadata are preserved.",
);
assert.deepEqual(
  colorRows.map((row) => row.context),
  [lightContext, darkContext, "[]", darkContext],
  "Presentation does not mutate canonical rows.",
);
console.log(
  "Token table compaction, unique endpoints, token-bearing parents, scoped selection and term-only Grid headings passed.",
);
