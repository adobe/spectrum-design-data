// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0

// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

import test from "ava";
import { resolveReplacementUuid } from "../src/replacement-resolver.js";

test("returns the same uuid when there is no replacedBy", (t) => {
  const token = { uuid: "a" };
  t.is(resolveReplacementUuid(token, new Map()), "a");
});

test("follows a single replacedBy hop", (t) => {
  const live = { uuid: "b" };
  const deprecated = { uuid: "a", lifecycle: { replacedBy: "b" } };
  const index = new Map([
    ["a", deprecated],
    ["b", live],
  ]);
  t.is(resolveReplacementUuid(deprecated, index), "b");
});

test("follows a transitive chain to the final live token", (t) => {
  const live = { uuid: "c" };
  const mid = { uuid: "b", lifecycle: { replacedBy: "c" } };
  const first = { uuid: "a", lifecycle: { replacedBy: "b" } };
  const index = new Map([
    ["a", first],
    ["b", mid],
    ["c", live],
  ]);
  t.is(resolveReplacementUuid(first, index), "c");
});

test("stops on a cycle instead of looping forever", (t) => {
  const a = { uuid: "a", lifecycle: { replacedBy: "b" } };
  const b = { uuid: "b", lifecycle: { replacedBy: "a" } };
  const index = new Map([
    ["a", a],
    ["b", b],
  ]);
  t.is(resolveReplacementUuid(a, index), "a");
});

test("stops on an array-form replacedBy (ambiguous target)", (t) => {
  const token = { uuid: "a", lifecycle: { replacedBy: ["b", "c"] } };
  t.is(resolveReplacementUuid(token, new Map()), "a");
});

test("stops when the replacedBy target isn't in the index", (t) => {
  const token = { uuid: "a", lifecycle: { replacedBy: "missing" } };
  t.is(resolveReplacementUuid(token, new Map()), "a");
});
