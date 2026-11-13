// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { TokenComboBoxOption } from "../src/components/fields/TokenComboBox";
import {
  exactTokenEntryMatch,
  normalizeNumericEntry,
  numericEntryValue,
} from "../src/components/fields/tokenEntry";
import { combinedTokenSelection } from "../src/components/fields/tokenSelection";
import {
  MENU_MEASUREMENT_ROWS,
  menuMeasurementChoices,
  tokenMenuChoices,
} from "../src/components/fields/tokenMenuChoices";

const options: TokenComboBoxOption[] = [
  { id: "a", kind: "token", name: "opacity-100", displayValue: "3%" },
  { id: "b", kind: "token", name: "opacity-200", displayValue: "20%" },
  { id: "c", kind: "token", name: "opacity-300", displayValue: "20%" },
  { id: "zero", kind: "token", name: "opacity-zero", displayValue: "0%" },
  {
    id: "invalid",
    kind: "token",
    name: "invalid",
    displayValue: "40%",
    error: "Unavailable",
  },
  { id: "hug", kind: "preset", name: "Hug", displayValue: "Hug" },
];
const percent = (text: string) => normalizeNumericEntry(text, "%");
assert.equal(exactTokenEntryMatch(options, " OPACITY-100 ")?.id, "a");
assert.equal(exactTokenEntryMatch(options, "3%")?.id, "a");
assert.equal(exactTokenEntryMatch(options, "3", undefined, percent)?.id, "a");
assert.equal(
  exactTokenEntryMatch(options, "03.0%", undefined, percent)?.id,
  "a",
);
assert.equal(
  exactTokenEntryMatch(options, "0", undefined, percent)?.id,
  "zero",
);
assert.equal(
  exactTokenEntryMatch(options, "20%", undefined, percent),
  undefined,
);
assert.equal(exactTokenEntryMatch(options, "opacity"), undefined);
assert.equal(exactTokenEntryMatch(options, "invalid"), undefined);
assert.equal(exactTokenEntryMatch(options, "40%"), undefined);
assert.equal(
  exactTokenEntryMatch(options, "opacity-100", () => false),
  undefined,
);
assert.equal(exactTokenEntryMatch(options, "hug")?.id, "hug");
assert.equal(
  exactTokenEntryMatch(
    [
      {
        id: "context",
        kind: "token",
        name: "contextual",
        displayValue: "24px (mode: dark)",
        matchValue: "24px",
      },
    ],
    "24px",
  )?.id,
  "context",
);
assert.equal(exactTokenEntryMatch(options, ""), undefined);
assert.equal(
  exactTokenEntryMatch(options, "NaN", undefined, percent),
  undefined,
);
assert.equal(
  exactTokenEntryMatch(
    [...options, { ...options[0], id: "duplicate" }],
    "opacity-100",
  ),
  undefined,
);
for (const [text, unit, expected] of [
  ["0", "", 0],
  ["-2.5", "", -2.5],
  [".25", "", 0.25],
  ["3 %", "%", 3],
  ["100%", "%", 100],
  ["24px", "px", 24],
  ["24.000", "px", 24],
  ["1e2", "", 100],
] as const)
  assert.equal(numericEntryValue(text, unit), expected);
for (const text of [
  "",
  " ",
  ".",
  "Infinity",
  "NaN",
  "0x10",
  "3px",
  "3%%",
  "1 2",
])
  assert.equal(numericEntryValue(text, "%"), undefined);

const field = (displayValue: string, selectedKey: string | null = null) => ({
  selectedKey,
  customValue: { displayValue },
});
assert.equal(
  combinedTokenSelection([field("3"), field("3"), field("3"), field("3")])
    .isMixed,
  false,
);
assert.equal(
  combinedTokenSelection([field("3"), field("4"), field("3"), field("3")])
    .isMixed,
  true,
);
assert.equal(
  combinedTokenSelection([field("3", "a"), field("3"), field("3"), field("3")])
    .isMixed,
  true,
);
assert.equal(
  combinedTokenSelection([
    field("", "a"),
    field("", "b"),
    field("", "a"),
    field("", "a"),
  ]).isMixed,
  true,
);

const ids = (rows: readonly TokenComboBoxOption[]) =>
  rows.map((option) => option.id);
const unfiltered = tokenMenuChoices(options, "a");
assert.deepEqual(ids(unfiltered.choices), ids(options));
assert.deepEqual(unfiltered.disabled, ["invalid"]);
assert.deepEqual(ids(unfiltered.presets), ["hug"]);
assert.deepEqual(ids(unfiltered.tokens), ["a", "b", "c", "zero", "invalid"]);
const withoutB = (option: TokenComboBoxOption) => option.id !== "b";
assert.deepEqual(
  ids(tokenMenuChoices(options, "a", withoutB).choices),
  ["a", "c", "zero", "invalid", "hug"],
  "Disallowed options leave the menu.",
);
const keptSelection = tokenMenuChoices(options, "b", withoutB);
assert.deepEqual(
  ids(keptSelection.choices),
  ["a", "c", "zero", "invalid", "hug", "b"],
  "A disallowed current selection stays visible at the end.",
);
assert.deepEqual(keptSelection.disabled, ["invalid", "b"]);
assert.deepEqual(ids(tokenMenuChoices(options, "missing", withoutB).choices), [
  "a",
  "c",
  "zero",
  "invalid",
  "hug",
]);

assert.equal(
  menuMeasurementChoices(options),
  options,
  "Short menus measure every row.",
);
const longMenu: TokenComboBoxOption[] = [
  { id: "auto", kind: "preset", name: "Auto", displayValue: "Auto" },
  ...Array.from({ length: 80 }, (_, index) => ({
    id: `size-${index}`,
    kind: "token" as const,
    name: `size-${index * 25}`,
    displayValue: `${index}px`,
  })),
];
longMenu.splice(30, 0, {
  id: "long-name",
  kind: "token",
  name: "component-height-with-a-much-longer-name",
  displayValue: "4px",
});
longMenu.splice(60, 0, {
  id: "long-description",
  kind: "token",
  name: "size-1",
  displayValue: "8px",
  error: "This token resolves to a value outside the allowed range.",
});
const probed = menuMeasurementChoices(longMenu);
assert.ok(probed.length <= MENU_MEASUREMENT_ROWS);
for (const id of ["auto", "long-name", "long-description"])
  assert.ok(ids(probed).includes(id), `The width probe measures ${id}.`);
assert.deepEqual(
  ids(probed),
  ids(longMenu).filter((id) => ids(probed).includes(id)),
  "The width probe keeps menu order.",
);

const elevation = readFileSync(
  new URL("../src/panels/elevation/ShadowOpacityControls.tsx", import.meta.url),
  "utf8",
);
assert.ok(
  elevation.includes("customValue="),
  "Shadow opacity uses shared direct entry.",
);
assert.doesNotMatch(
  elevation,
  /Manual percentage|EditableNumberField|id:\s*["']manual["']/,
);
console.log(
  "Token ComboBox matching, numeric entry, mixed values, menu rows, width probe and Elevation reuse checks passed.",
);
