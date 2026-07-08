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
import { serialize } from "../src/decomposer.js";
import { applyField, applySpaceBetween } from "../src/apply.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CASCADE_DIR = resolve(__dirname, "../../../packages/design-data/tokens");

/** Recursively collect every token object that has a name.size field. */
function collectMigrated(obj, acc = []) {
  if (Array.isArray(obj)) {
    obj.forEach((v) => collectMigrated(v, acc));
    return acc;
  }
  if (obj && typeof obj === "object") {
    if (
      obj.name &&
      typeof obj.name === "object" &&
      obj.name.size !== undefined
    ) {
      acc.push(obj);
    }
    for (const v of Object.values(obj)) collectMigrated(v, acc);
  }
  return acc;
}

// Verifies that size decomposition preserved the legacy key for every migrated token.
//
// The check is independent of decompose() by reconstructing the pre-migration name
// object from scratch: since size was the only field extracted from property, the
// pre-migration property = postMigration.property + "-" + sizeTokenName. Serializing
// that name must produce the same legacy key as serializing the post-migration name.
//
// This is the JS-layer consistency check. The Rust-backed golden-reference check is
// tokens:verifyLegacyOutput (compares generated legacy output against committed src/).
test("size decomposition preserves the legacy key — layout-component.tokens.json", (t) => {
  const registry = loadRegistries();
  const data = JSON.parse(
    readFileSync(resolve(CASCADE_DIR, "layout-component.tokens.json"), "utf-8"),
  );
  const migrated = collectMigrated(data);

  t.true(
    migrated.length > 0,
    "Expected at least one token with size field in layout-component.tokens.json",
  );

  for (const tok of migrated) {
    // Post-migration serialization.
    const postKey = serialize(
      tok.name,
      registry.tokenNameMap,
      registry.serializationOrder,
    );

    // Reconstruct the pre-migration name: re-embed the size tokenName back into
    // property. Only size was extracted, so appending its long form gives the original
    // compound property value. Note: this reconstruction is only valid when a single
    // field was decomposed; multi-field migrations need a different approach.
    const sizeLong = registry.tokenNameMap[tok.name.size] ?? tok.name.size;
    const preMigName = {
      ...tok.name,
      property: `${tok.name.property}-${sizeLong}`,
    };
    delete preMigName.size;
    const preKey = serialize(
      preMigName,
      registry.tokenNameMap,
      registry.serializationOrder,
    );

    t.is(
      postKey,
      preKey,
      `Token ${tok.uuid?.slice(0, 8)}: size decomposition must preserve the legacy key (pre: ${preKey})`,
    );
    t.truthy(
      tok.name.property,
      `Token ${tok.uuid?.slice(0, 8)}: must have non-empty property after decomposition`,
    );
  }
});

test("size decomposition preserves the legacy key — layout.tokens.json", (t) => {
  const registry = loadRegistries();
  const data = JSON.parse(
    readFileSync(resolve(CASCADE_DIR, "layout.tokens.json"), "utf-8"),
  );
  const migrated = collectMigrated(data);

  t.true(
    migrated.length > 0,
    "Expected at least one token with size field in layout.tokens.json",
  );

  for (const tok of migrated) {
    const postKey = serialize(
      tok.name,
      registry.tokenNameMap,
      registry.serializationOrder,
    );
    const sizeLong = registry.tokenNameMap[tok.name.size] ?? tok.name.size;
    const preMigName = {
      ...tok.name,
      property: `${tok.name.property}-${sizeLong}`,
    };
    delete preMigName.size;
    const preKey = serialize(
      preMigName,
      registry.tokenNameMap,
      registry.serializationOrder,
    );

    t.is(
      postKey,
      preKey,
      `Token ${tok.uuid?.slice(0, 8)}: size decomposition must preserve the legacy key (pre: ${preKey})`,
    );
    t.truthy(
      tok.name.property,
      `Token ${tok.uuid?.slice(0, 8)}: must have non-empty property after decomposition`,
    );
  }
});

// ── applySpaceBetween ─────────────────────────────────────────────────────

test("applySpaceBetween writes from/to/property for a clean gap token and preserves the legacy key", (t) => {
  const registry = loadRegistries();
  const tokens = [
    {
      name: { component: "accordion", property: "bottom-to-handle" },
      value: "8px",
    },
  ];
  const legacyKeyBefore = serialize(
    tokens[0].name,
    registry.tokenNameMap,
    registry.serializationOrder,
  );

  const { applied } = applySpaceBetween(
    tokens,
    registry,
    "fixture.tokens.json",
  );

  t.is(applied, 1);
  t.is(tokens[0].name.property, "space-between");
  t.is(tokens[0].name.from, "bottom");
  t.is(tokens[0].name.to, "handle");
  t.is(
    serialize(
      tokens[0].name,
      registry.tokenNameMap,
      registry.serializationOrder,
    ),
    legacyKeyBefore,
  );
});

test("applySpaceBetween skips a token whose endpoint can't fully resolve", (t) => {
  const registry = loadRegistries();
  const tokens = [
    {
      name: {
        component: "slider",
        property: "control-to-field-label-side-medium",
      },
      value: "8px",
    },
  ];

  const { applied } = applySpaceBetween(
    tokens,
    registry,
    "fixture.tokens.json",
  );

  t.is(applied, 0);
  t.is(tokens[0].name.from, undefined);
  t.is(tokens[0].name.property, "control-to-field-label-side-medium");
});

test("applySpaceBetween skips tokens already migrated", (t) => {
  const registry = loadRegistries();
  const tokens = [
    {
      name: {
        component: "accordion",
        property: "space-between",
        from: "bottom",
        to: "handle",
      },
      value: "8px",
    },
  ];

  const { applied } = applySpaceBetween(
    tokens,
    registry,
    "fixture.tokens.json",
  );

  t.is(applied, 0);
});

// A property string that stacks two concepts (family + emphasis) must have both
// extracted together in one applyField call, even though only "family" was
// requested: decompose() strips both from `property` at once, so writing back
// only the targeted field (and the fully-stripped property) would silently
// drop the other and break the roundtrip. Regression test for that bug.
test("applyField extracts co-occurring fields together to preserve the roundtrip", (t) => {
  const registry = loadRegistries();
  const tokens = [
    {
      name: { property: "cjk-strong-font-weight" },
      value: "700",
    },
  ];

  const { applied } = applyField(
    tokens,
    "family",
    registry,
    "fixture.tokens.json",
  );

  t.is(applied, 1);
  t.is(tokens[0].name.family, "cjk");
  t.is(tokens[0].name.emphasis, "strong");
  t.is(tokens[0].name.property, "font-weight");
  t.is(
    serialize(
      tokens[0].name,
      registry.tokenNameMap,
      registry.serializationOrder,
    ),
    "cjk-strong-font-weight",
  );
});

// decompose() can resolve `anatomy` as a side effect of extracting an unrelated
// field (e.g. "heading-serif-emphasized-font-weight" -> anatomy:"heading" +
// family:"serif" + emphasis:"emphasized"). Without a component field, applying
// that merge violates SPEC-025 (anatomy requires component) even though the
// *targeted* field was "family", not "anatomy". Regression test for that bug.
test("applyField skips a merge that would introduce a SPEC-025 violation (anatomy without component)", (t) => {
  const registry = loadRegistries();
  const tokens = [
    {
      name: { property: "heading-serif-emphasized-font-weight" },
      value: "700",
    },
  ];

  const { applied, skippedSpec025 } = applyField(
    tokens,
    "family",
    registry,
    "fixture.tokens.json",
  );

  t.is(applied, 0);
  t.is(skippedSpec025, 1);
  t.is(tokens[0].name.family, undefined);
  t.is(tokens[0].name.anatomy, undefined);
  t.is(tokens[0].name.property, "heading-serif-emphasized-font-weight");
});
