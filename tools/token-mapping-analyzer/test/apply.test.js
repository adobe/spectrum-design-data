// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0

// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

import test from "ava";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { loadRegistries } from "../src/registry-index.js";
import { serialize } from "../src/decomposer.js";
import { applyField } from "../src/apply.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CASCADE_DIR = resolve(__dirname, "../../../packages/design-data/tokens");

test("applyField extracts size and each patched name roundtrips", (t) => {
  const registry = loadRegistries();
  const tokens = JSON.parse(
    readFileSync(resolve(CASCADE_DIR, "layout-component.tokens.json"), "utf-8"),
  );

  // Snapshot the legacy keys before patching
  const originalKeys = new Map(
    tokens
      .filter((tok) => typeof tok.name === "object")
      .map((tok) => [
        tok.uuid,
        serialize(tok.name, registry.tokenNameMap, registry.serializationOrder),
      ]),
  );

  // Deep-clone so we don't mutate the shared parse
  const cloned = tokens.map((tok) => ({
    ...tok,
    name: typeof tok.name === "object" ? { ...tok.name } : tok.name,
  }));

  const applied = applyField(
    cloned,
    "size",
    registry,
    "layout-component.tokens.json",
  );
  t.true(applied > 0, "Should apply at least one size decomposition");

  // Every patched token must still serialize to its original legacy key
  const patched = cloned.filter(
    (tok, i) =>
      typeof tok.name === "object" &&
      tok.name.size !== undefined &&
      tokens[i].name?.size === undefined,
  );

  for (const tok of patched) {
    const original = originalKeys.get(tok.uuid);
    const roundtripped = serialize(
      tok.name,
      registry.tokenNameMap,
      registry.serializationOrder,
    );
    t.is(
      roundtripped,
      original,
      `Token ${tok.uuid?.slice(0, 8)} must roundtrip after size decomposition`,
    );
    t.truthy(
      tok.name.property,
      `Token ${tok.uuid?.slice(0, 8)} must still have a non-empty property`,
    );
  }
});
