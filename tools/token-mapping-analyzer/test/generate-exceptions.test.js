// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0

// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

import test from "ava";
import { loadRegistries } from "../src/registry-index.js";
import { decompose } from "../src/decomposer.js";
import { categorize } from "../src/generate-exceptions.js";

let registry;
test.before(() => {
  registry = loadRegistries();
});

test("legacyKey-pinned token with an unmatched segment categorizes as legacyKey-pinned, not vocabulary-gap (dsi.15)", (t) => {
  // "key" isn't a registered standalone segment, so this pinned token leaves
  // an unmatched segment. Before dsi.15, the vocabulary-gap branch didn't
  // check `pinned`, so this fell into vocabulary-gap even though naming.rs
  // never decomposes a pinned token — the analyzer was disagreeing with
  // itself, not flagging a real gap.
  const result = decompose(
    "drop-shadow-emphasized-key-color",
    { pinned: true },
    registry,
    "test",
  );
  t.true(result.pinned);
  t.true(result.unmatchedSegments.length > 0);

  const { category } = categorize(result);
  t.is(category, "legacyKey-pinned");
});

test("unpinned token with a genuinely unmatched segment still categorizes as vocabulary-gap", (t) => {
  const result = decompose(
    "drop-shadow-emphasized-key-color",
    {},
    registry,
    "test",
  );
  t.falsy(result.pinned);
  t.true(result.unmatchedSegments.length > 0);

  const { category, proposal } = categorize(result);
  t.is(category, "vocabulary-gap");
  t.is(proposal, "006");
});
