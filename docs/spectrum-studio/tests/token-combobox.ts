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
  "Token ComboBox matching, numeric entry, mixed values and Elevation reuse checks passed.",
);
