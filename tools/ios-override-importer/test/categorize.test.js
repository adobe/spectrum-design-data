// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0

// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

import test from "ava";
import { categorizeRow } from "../src/categorize.js";

test("net-new: Old Value is 'Custom token'", (t) => {
  const { category, extensionModes, overrideModes } = categorizeRow({
    "Old Value": "Custom token",
    "New Value": "ColorSet(light: Color(1, 1, 1, 1.0), dark: none)",
  });
  t.is(category, "net-new");
  t.is(extensionModes.length, 1);
  t.deepEqual(overrideModes, []);
});

test("contrast-addition: base light/dark unchanged, increased slots added", (t) => {
  const { category, extensionModes, overrideModes } = categorizeRow({
    "Old Value":
      "ColorSet(light: Color(1, 1, 1, 1.0), dark: Color(2, 2, 2, 1.0), elevated: none, lightIncreased: none, darkIncreased: none, elevatedIncreased: none)",
    "New Value":
      "ColorSet(light: Color(1, 1, 1, 1.0), dark: Color(2, 2, 2, 1.0), elevated: none, lightIncreased: Color(3, 3, 3, 1.0), darkIncreased: none, elevatedIncreased: none)",
  });
  t.is(category, "contrast-addition");
  t.deepEqual(overrideModes, []);
  t.is(extensionModes.length, 1);
  t.is(extensionModes[0].contrast, "high");
});

test("true-value-change: base light value replaced", (t) => {
  const { category, overrideModes, extensionModes } = categorizeRow({
    "Old Value": "ColorSet(light: Color(1, 1, 1, 1.0), dark: none)",
    "New Value": "ColorSet(light: Color(9, 9, 9, 1.0), dark: none)",
  });
  t.is(category, "true-value-change");
  t.deepEqual(overrideModes, [
    { colorScheme: "light", value: "rgba(9, 9, 9, 1.0)" },
  ]);
  t.deepEqual(extensionModes, []);
});

test("true-value-change row can also add a genuinely new contrast mode", (t) => {
  const { overrideModes, extensionModes } = categorizeRow({
    "Old Value":
      "ColorSet(light: Color(1, 1, 1, 1.0), dark: Color(2, 2, 2, 1.0), elevated: none, lightIncreased: none, darkIncreased: none, elevatedIncreased: none)",
    "New Value":
      "ColorSet(light: Color(9, 9, 9, 1.0), dark: Color(2, 2, 2, 1.0), elevated: none, lightIncreased: Color(3, 3, 3, 1.0), darkIncreased: none, elevatedIncreased: none)",
  });
  // light base value changed (override) AND a new light/high slot appeared
  // (extension) — one row, both fragment types.
  t.deepEqual(overrideModes, [
    { colorScheme: "light", value: "rgba(9, 9, 9, 1.0)" },
  ]);
  t.deepEqual(extensionModes, [
    { colorScheme: "light", contrast: "high", value: "rgba(3, 3, 3, 1.0)" },
  ]);
});

test("out-of-scope: New Value isn't a ColorSet (typography/size row)", (t) => {
  const { category } = categorizeRow({
    "Old Value": "Scale(FontSize(17.0))",
    "New Value": "FontSize(14.0)",
  });
  t.is(category, "out-of-scope");
});
