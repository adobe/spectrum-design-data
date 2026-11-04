// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import {
  createBooleanProperty,
  createLocalVariantProperty,
} from "../src/features/option-groups/model";
import {
  canvasLabel,
  structureCanvasGrid,
} from "../src/features/structures/canvasGrid";
import { EMPTY_STRUCTURE_PREVIEW } from "../src/features/structures/variants";

assert.equal(canvasLabel("Icon Position"), "Icon position");
assert.equal(canvasLabel(" start "), "Start");

const empty = structureCanvasGrid([], EMPTY_STRUCTURE_PREVIEW);
assert.equal(empty.length, 1);
assert.equal(empty[0].cells.length, 1);
assert.equal(empty[0].cells[0].label, "");
assert.equal(empty[0].cells[0].isActive, true);

const icon = createLocalVariantProperty("Icon Position");
icon.options.push({ id: "none", name: "NONE", classification: {} });
const padding = createLocalVariantProperty("Horizontal padding");
const hasIcon = createBooleanProperty("Has icon");
const properties = [icon, padding, hasIcon];

const grid = structureCanvasGrid(properties, EMPTY_STRUCTURE_PREVIEW);
assert.deepEqual(
  grid.map((column) => column.label),
  ["Icon position", "Horizontal padding", "Has icon"],
);
assert.deepEqual(
  grid.map((column) => column.cells.length),
  [3, 2, 2],
);
assert.deepEqual(
  grid[0].cells.map((cell) => cell.label),
  ["Default", "Option 2", "None"],
);
assert.deepEqual(
  grid[2].cells.map((cell) => cell.label),
  ["On", "Off"],
);

// Only the column's own property changes; others stay at their defaults.
const iconNone = grid[0].cells[2].preview;
assert.equal(iconNone.activePropertyId, icon.id);
assert.equal(iconNone.options[icon.id], "none");
assert.equal(iconNone.options[padding.id], padding.defaultOptionId);
assert.equal(iconNone.booleans[hasIcon.id], true);
const iconOff = grid[2].cells[1].preview;
assert.equal(iconOff.booleans[hasIcon.id], false);
assert.equal(iconOff.options[icon.id], icon.defaultOptionId);
assert.equal(iconOff.activePropertyId, null);

// With nothing selected, only the first column's default cell is active.
assert.deepEqual(
  grid.flatMap((column) => column.cells.filter((cell) => cell.isActive)),
  [grid[0].cells[0]],
);

const activeKeys = (
  preview: typeof EMPTY_STRUCTURE_PREVIEW,
  selected?: string,
) =>
  structureCanvasGrid(properties, preview, selected)
    .flatMap((column) => column.cells)
    .filter((cell) => cell.isActive)
    .map((cell) => cell.key);

// Clicking a cell activates exactly that cell.
const paddingWide = grid[1].cells[1];
assert.deepEqual(activeKeys(paddingWide.preview, paddingWide.key), [
  paddingWide.key,
]);
// A clicked default cell disambiguates identical default cells.
const paddingDefault = grid[1].cells[0];
assert.deepEqual(activeKeys(paddingDefault.preview, paddingDefault.key), [
  paddingDefault.key,
]);
// A stale clicked key falls back to the active property's column.
assert.deepEqual(activeKeys(iconNone, paddingWide.key), [grid[0].cells[2].key]);
// Mixed selections outside the grid still mark the active property's option.
assert.deepEqual(
  activeKeys({
    ...EMPTY_STRUCTURE_PREVIEW,
    activePropertyId: icon.id,
    options: { [icon.id]: "none", [padding.id]: padding.options[1].id },
  }),
  [grid[0].cells[2].key],
);

console.log("structure canvas grid: ok");
