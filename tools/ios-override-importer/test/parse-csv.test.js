// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0

// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

import test from "ava";
import { parseCsv } from "../src/parse-csv.js";

test("splits quoted fields and preserves commas inside quotes", (t) => {
  const csv =
    "Token Name,Old Value,New Value,Aliases,Override Source\n" +
    '"accent-color-1000","Custom token","ColorSet(light: Color(1, 2, 3, 1.0), dark: none)","blue-1000","figma-tokens.json"\n';
  const rows = parseCsv(csv);
  t.is(rows.length, 1);
  t.deepEqual(rows[0], {
    "Token Name": "accent-color-1000",
    "Old Value": "Custom token",
    "New Value": "ColorSet(light: Color(1, 2, 3, 1.0), dark: none)",
    Aliases: "blue-1000",
    "Override Source": "figma-tokens.json",
  });
});

test("handles an empty quoted field", (t) => {
  const csv = 'A,B\n"x",""\n';
  const rows = parseCsv(csv);
  t.deepEqual(rows[0], { A: "x", B: "" });
});

test("parses multiple rows", (t) => {
  const csv = 'A,B\n"1","2"\n"3","4"\n';
  const rows = parseCsv(csv);
  t.is(rows.length, 2);
  t.deepEqual(rows[1], { A: "3", B: "4" });
});
