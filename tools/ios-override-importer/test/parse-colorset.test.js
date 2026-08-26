// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0

// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

import test from "ava";
import { isColorSet, parseColorSet } from "../src/parse-colorset.js";

test("isColorSet true for a ColorSet literal, false for others", (t) => {
  t.true(isColorSet("ColorSet(light: Color(1, 2, 3, 1.0), dark: none)"));
  t.false(isColorSet("Custom token"));
  t.false(isColorSet("Scale(FontSize(17.0))"));
});

test("parses light/dark slots to rgba", (t) => {
  const { modes, skipped } = parseColorSet(
    "ColorSet(light: Color(59, 99, 251, 1.0), dark: Color(64, 105, 253, 1.0), elevated: none, lightIncreased: none, darkIncreased: none, elevatedIncreased: none)",
  );
  t.deepEqual(modes, [
    { colorScheme: "light", value: "rgba(59, 99, 251, 1.0)" },
    { colorScheme: "dark", value: "rgba(64, 105, 253, 1.0)" },
  ]);
  t.deepEqual(skipped, []);
});

test("maps *Increased slots to contrast:high", (t) => {
  const { modes } = parseColorSet(
    "ColorSet(light: Color(1, 1, 1, 1.0), dark: Color(2, 2, 2, 1.0), elevated: none, lightIncreased: Color(3, 3, 3, 1.0), darkIncreased: Color(4, 4, 4, 1.0), elevatedIncreased: none)",
  );
  t.deepEqual(modes, [
    { colorScheme: "light", value: "rgba(1, 1, 1, 1.0)" },
    { colorScheme: "dark", value: "rgba(2, 2, 2, 1.0)" },
    { colorScheme: "light", contrast: "high", value: "rgba(3, 3, 3, 1.0)" },
    { colorScheme: "dark", contrast: "high", value: "rgba(4, 4, 4, 1.0)" },
  ]);
});

test("maps elevated/elevatedIncreased to variant:elevated at colorScheme:dark", (t) => {
  const { modes, skipped } = parseColorSet(
    "ColorSet(light: none, dark: none, elevated: Color(5, 5, 5, 1.0), lightIncreased: none, darkIncreased: none, elevatedIncreased: Color(6, 6, 6, 1.0))",
  );
  t.deepEqual(modes, [
    {
      variant: "elevated",
      colorScheme: "dark",
      value: "rgba(5, 5, 5, 1.0)",
    },
    {
      variant: "elevated",
      colorScheme: "dark",
      contrast: "high",
      value: "rgba(6, 6, 6, 1.0)",
    },
  ]);
  t.deepEqual(skipped, []);
});

test("throws on a non-ColorSet literal", (t) => {
  t.throws(() => parseColorSet("Custom token"));
});
