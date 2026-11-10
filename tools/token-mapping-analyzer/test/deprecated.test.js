// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

import test from "ava";
import { isDeprecated } from "../src/decomposer.js";

test("live canonical token is active", (t) => {
  t.false(isDeprecated({ name: {}, lifecycle: { introduced: "1.0.0" } }));
  t.false(isDeprecated({ name: {} }));
});

test("canonical token with lifecycle.deprecatedIn is deprecated", (t) => {
  t.true(isDeprecated({ name: {}, lifecycle: { deprecatedIn: "2.0.0" } }));
});

test("legacy-format top-level deprecated still works", (t) => {
  t.true(isDeprecated({ deprecated: true }));
  t.false(isDeprecated({ deprecated: false }));
});
