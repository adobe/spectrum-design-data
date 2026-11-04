// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "ava";
import { searchComponents } from "../src/component.js";

// Runs against the real corpus so the tests don't encode guessed queries.
const DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../../packages/design-data/components",
);

test("name match ranks first", (t) => {
  const [first] = searchComponents(DIR, "button");
  t.is(first.id, "button");
  t.is(first.displayName, "Button");
  t.truthy(first.snippet);
});

test("matches description text", (t) => {
  const results = searchComponents(DIR, "perform an action or to navigate");
  t.true(results.some((r) => r.id === "button"));
});

test("category filter and limit", (t) => {
  const results = searchComponents(DIR, "button", {
    category: "actions",
    limit: 2,
  });
  t.true(results.length > 0 && results.length <= 2);
  t.true(results.every((r) => r.category === "actions"));
});

test("no match, empty query and missing dir return []", (t) => {
  t.deepEqual(searchComponents(DIR, "zzzqqqxxx"), []);
  t.deepEqual(searchComponents(DIR, "  "), []);
  t.deepEqual(searchComponents(join(DIR, "nope"), "button"), []);
});
