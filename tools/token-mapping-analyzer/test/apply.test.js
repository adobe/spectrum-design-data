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
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { loadRegistries } from "../src/registry-index.js";
import { serialize, decompose } from "../src/decomposer.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CASCADE_DIR = resolve(__dirname, "../../../packages/design-data/tokens");

// Verify the core decomposition invariant: every token whose name has a `size`
// field (i.e. was migrated by apply.js --write) must serialize back to the same
// legacy key that the original compound `property` implied.
test("migrated size tokens roundtrip to their original legacy key", (t) => {
  const registry = loadRegistries();
  const tokens = JSON.parse(
    readFileSync(resolve(CASCADE_DIR, "layout-component.tokens.json"), "utf-8"),
  );

  const migrated = tokens.filter(
    (tok) => typeof tok.name === "object" && tok.name.size !== undefined,
  );

  t.true(
    migrated.length > 0,
    "Expected at least one token with size field applied",
  );

  for (const tok of migrated) {
    const legacyKey = serialize(
      tok.name,
      registry.tokenNameMap,
      registry.serializationOrder,
    );
    // Reconstruct what the key would have been before decomposition by re-joining
    // the size tokenName back into property and checking the round-trip.
    const decomposeResult = decompose(
      legacyKey,
      { component: tok.name?.component },
      registry,
      "layout-component.tokens.json",
    );
    t.is(
      decomposeResult.confidence,
      "HIGH",
      `Token ${tok.uuid?.slice(0, 8)} (${legacyKey}) should decompose at HIGH confidence`,
    );
    t.true(
      decomposeResult.roundtrips,
      `Token ${tok.uuid?.slice(0, 8)} (${legacyKey}) must roundtrip after size decomposition`,
    );
    t.truthy(
      tok.name.property,
      `Token ${tok.uuid?.slice(0, 8)} must still have non-empty property`,
    );
  }
});
