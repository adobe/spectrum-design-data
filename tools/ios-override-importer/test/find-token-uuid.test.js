// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0

// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

import test from "ava";
import { findTokenUuid } from "../src/find-token-uuid.js";

const INDEX = new Map([
  ["blue-1000::light::", "u-light"],
  ["blue-1000::dark::", "u-dark"],
  ["blue-1000::light::high", "u-light-high"],
]);

test("finds the uuid for an exact legacy-key + mode match", (t) => {
  const uuid = findTokenUuid(INDEX, "blue-1000", { colorScheme: "dark" });
  t.is(uuid, "u-dark");
});

test("disambiguates plain vs. contrast:high modes", (t) => {
  const uuid = findTokenUuid(INDEX, "blue-1000", {
    colorScheme: "light",
    contrast: "high",
  });
  t.is(uuid, "u-light-high");
});

test("returns null when no record matches", (t) => {
  const uuid = findTokenUuid(INDEX, "red-1000", { colorScheme: "light" });
  t.is(uuid, null);
});
