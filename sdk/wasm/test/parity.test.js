/*
Copyright 2026 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

/**
 * Conformance parity tests for @adobe/design-data-wasm.
 *
 * Reuse the same fixture corpus as the Rust unit tests in `sdk/core/src/`.
 * All tests use `Dataset.fromTokens()` — no compiled .redb blob is required.
 * The wasm module is initialised once in a `test.before()` hook.
 */

import { readFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "ava";

const __dir = fileURLToPath(new URL(".", import.meta.url));
// nodejs target: synchronous CJS, no init() required — stable under bare Node.
const WASM_PKG = resolve(__dir, "../pkg/node/design_data_wasm.js");
const CONFORMANCE = resolve(
  __dir,
  "../../../packages/design-data-spec/conformance",
);

/** Read and parse a JSON file relative to the conformance root. */
function readJson(...parts) {
  return JSON.parse(readFileSync(join(CONFORMANCE, ...parts), "utf-8"));
}

/** Read a text file, stripping trailing whitespace. */
function readText(...parts) {
  return readFileSync(join(CONFORMANCE, ...parts), "utf-8").trim();
}

// ---------------------------------------------------------------------------
// Module bootstrap
// ---------------------------------------------------------------------------

let wasm;

test.before(async () => {
  // The bundler-target wasm module self-initialises on import (wbindgen_start).
  // No explicit init() call is required.
  wasm = await import(WASM_PKG);
});

// ---------------------------------------------------------------------------
// Dataset.embedded() — prebuilt .redb cache blob
// ---------------------------------------------------------------------------

test("Dataset.embedded() returns a dataset with a non-zero token count", (t) => {
  const ds = wasm.Dataset.embedded();
  t.truthy(ds);
  t.true(
    ds.tokenCount() > 100,
    `Expected tokens > 100, got ${ds.tokenCount()}`,
  );
});

test("Dataset.embedded() query returns results for known Spectrum tokens", (t) => {
  const ds = wasm.Dataset.embedded();
  const results = ds.query("property=color");
  t.true(results.length > 0, "Expected color tokens in embedded dataset");
});

test("Dataset.embedded() resolve returns a token for a known property", (t) => {
  const ds = wasm.Dataset.embedded();
  // accent-background-color: a stable core Spectrum property present across all colorSchemes;
  // unlikely to be renamed or removed, making it a reliable fixture anchor.
  const result = ds.resolve("accent-background-color", {
    colorScheme: "light",
  });
  t.truthy(result, "Expected a resolved token for accent-background-color");
  t.is(typeof result.specificity, "number");
  t.truthy(result.token.raw);
});

test("Dataset.embedded() returns consistent results on repeated calls", (t) => {
  const ds1 = wasm.Dataset.embedded();
  const ds2 = wasm.Dataset.embedded();
  t.is(ds1.tokenCount(), ds2.tokenCount());
});

// ---------------------------------------------------------------------------
// Registry helpers — embedded RegistryData (no tokens needed)
// ---------------------------------------------------------------------------

test('getFieldValues returns a non-empty array for "property"', (t) => {
  const values = wasm.getFieldValues("property");
  t.truthy(values);
  t.true(Array.isArray(values));
  t.true(values.length > 0);
  t.true(values.includes("color"));
});

test("getFieldValues returns undefined for an unrecognised field", (t) => {
  t.is(wasm.getFieldValues("totally-made-up-field"), undefined);
});

test("hasFieldValue returns true for a known property value", (t) => {
  t.true(wasm.hasFieldValue("property", "color"));
});

test("hasFieldValue returns false for an unknown value", (t) => {
  t.false(wasm.hasFieldValue("property", "not-a-real-value"));
});

test("getAdvisoryFields returns a non-empty string array", (t) => {
  const fields = wasm.getAdvisoryFields();
  t.true(Array.isArray(fields));
  t.true(fields.length > 0);
  t.true(fields.every((f) => typeof f === "string"));
});

test("getIndexedFields returns all 9 queryable filter keys", (t) => {
  const fields = wasm.getIndexedFields();
  t.true(Array.isArray(fields));
  t.true(fields.every((f) => typeof f === "string"));
  const expected = [
    "property",
    "component",
    "variant",
    "state",
    "colorScheme",
    "scale",
    "contrast",
    "uuid",
    "$schema",
  ];
  t.is(fields.length, expected.length);
  for (const key of expected) {
    t.true(fields.includes(key), `getIndexedFields missing key: ${key}`);
  }
});

// Registry JSON-object helpers — mirrors @adobe/design-system-registry API

const SAMPLE_REGISTRY = {
  values: [
    { id: "alpha", aliases: ["α"], default: true },
    { id: "beta" },
    { id: "gamma", deprecated: true },
  ],
};

test("getValues returns all IDs", (t) => {
  t.deepEqual(wasm.getValues(SAMPLE_REGISTRY).sort(), [
    "alpha",
    "beta",
    "gamma",
  ]);
});

test("findValue finds by ID", (t) => {
  t.is(wasm.findValue(SAMPLE_REGISTRY, "beta")?.id, "beta");
});

test("findValue finds by alias", (t) => {
  t.is(wasm.findValue(SAMPLE_REGISTRY, "α")?.id, "alpha");
});

test("findValue returns undefined for unknown term", (t) => {
  t.is(wasm.findValue(SAMPLE_REGISTRY, "delta"), undefined);
});

test("hasValue returns true for known ID", (t) => {
  t.true(wasm.hasValue(SAMPLE_REGISTRY, "beta"));
});

test("hasValue returns true for known alias", (t) => {
  t.true(wasm.hasValue(SAMPLE_REGISTRY, "α"));
});

test("hasValue returns false for unknown term", (t) => {
  t.false(wasm.hasValue(SAMPLE_REGISTRY, "delta"));
});

test("getDefault returns the entry marked default: true", (t) => {
  t.is(wasm.getDefault(SAMPLE_REGISTRY)?.id, "alpha");
});

test("getActiveValues excludes deprecated entries", (t) => {
  const active = wasm.getActiveValues(SAMPLE_REGISTRY);
  const ids = active.map((e) => e.id);
  t.false(ids.includes("gamma"));
  t.true(ids.includes("alpha"));
  t.true(ids.includes("beta"));
});

// ---------------------------------------------------------------------------
// Dataset.fromTokens — construction
// ---------------------------------------------------------------------------

test("fromTokens builds a dataset with correct tokenCount", (t) => {
  const tokens = readJson(
    "query",
    "empty-matches-all",
    "input",
    "tokens.tokens.json",
  );
  const ds = wasm.Dataset.fromTokens(tokens);
  t.is(ds.tokenCount(), tokens.length);
});

test("fromTokens accepts an empty array", (t) => {
  const ds = wasm.Dataset.fromTokens([]);
  t.is(ds.tokenCount(), 0);
});

test("fromTokens throws on non-array input (plain object)", (t) => {
  t.throws(() => wasm.Dataset.fromTokens({ values: [] }), {
    instanceOf: Error,
  });
});

test("fromTokens throws on non-array input (string)", (t) => {
  t.throws(() => wasm.Dataset.fromTokens("not-an-array"), {
    instanceOf: Error,
  });
});

// ---------------------------------------------------------------------------
// Query — conformance parity
// ---------------------------------------------------------------------------

/**
 * Load a query fixture, run it against a new Dataset, and return sorted UUIDs.
 * @param {string} dir - subdirectory under conformance/query/
 */
function runQuery(dir) {
  const tokens = readJson("query", dir, "input", "tokens.tokens.json");
  const expr = readText("query", dir, "query.txt");
  return wasm.Dataset.fromTokens(tokens)
    .query(expr)
    .map((r) => r.uuid)
    .sort();
}

test("query: empty-matches-all returns all UUIDs", (t) => {
  const got = runQuery("empty-matches-all");
  const expected = readJson("query", "empty-matches-all", "expected.json")
    .slice()
    .sort();
  t.deepEqual(got, expected);
});

test("query: single-field (component=button)", (t) => {
  const got = runQuery("single-field");
  const expected = readJson("query", "single-field", "expected.json")
    .slice()
    .sort();
  t.deepEqual(got, expected);
});

test("query: and-conditions (component=button,state=hover)", (t) => {
  const got = runQuery("and-conditions");
  const expected = readJson("query", "and-conditions", "expected.json")
    .slice()
    .sort();
  t.deepEqual(got, expected);
});

test("query: negation (!=)", (t) => {
  const got = runQuery("negation");
  const expected = readJson("query", "negation", "expected.json")
    .slice()
    .sort();
  t.deepEqual(got, expected);
});

test("query: no-matches returns empty array", (t) => {
  t.deepEqual(runQuery("no-matches"), []);
});

test("query: wildcard-suffix", (t) => {
  const got = runQuery("wildcard-suffix");
  const expected = readJson("query", "wildcard-suffix", "expected.json")
    .slice()
    .sort();
  t.deepEqual(got, expected);
});

test("query result tokens have expected shape", (t) => {
  const tokens = readJson(
    "query",
    "single-field",
    "input",
    "tokens.tokens.json",
  );
  const results = wasm.Dataset.fromTokens(tokens).query("");
  t.true(results.length > 0);
  const first = results[0];
  t.is(typeof first.name, "string");
  t.is(typeof first.layer, "string");
  t.truthy(first.raw);
});

// ---------------------------------------------------------------------------
// Diff — conformance parity
// ---------------------------------------------------------------------------

test("diff: simple-add-delete", (t) => {
  const oldDs = wasm.Dataset.fromTokens(
    readJson("diff", "simple-add-delete", "old", "tokens.tokens.json"),
  );
  const newDs = wasm.Dataset.fromTokens(
    readJson("diff", "simple-add-delete", "new", "tokens.tokens.json"),
  );
  const expected = readJson("diff", "simple-add-delete", "expected.json");
  const diff = oldDs.diff(newDs);

  t.is(diff.added.length, expected.added.length, "added count");
  t.is(diff.deleted.length, expected.deleted.length, "deleted count");
  t.is(diff.renamed.length, 0);
  t.is(diff.updated.length, 0);
  t.is(diff.added[0]?.uuid, expected.added[0].uuid, "added UUID");
  t.is(diff.deleted[0]?.uuid, expected.deleted[0].uuid, "deleted UUID");
});

test("diff: rename-by-uuid", (t) => {
  const oldDs = wasm.Dataset.fromTokens(
    readJson("diff", "rename-by-uuid", "old", "tokens.tokens.json"),
  );
  const newDs = wasm.Dataset.fromTokens(
    readJson("diff", "rename-by-uuid", "new", "tokens.tokens.json"),
  );
  const expected = readJson("diff", "rename-by-uuid", "expected.json");
  const diff = oldDs.diff(newDs);

  t.is(diff.renamed.length, expected.renamed.length);
  t.is(diff.added.length, 0);
  t.is(diff.deleted.length, 0);
  t.is(diff.renamed[0]?.uuid, expected.renamed[0].uuid);
});

test("diff: identical-tokens produces an empty diff", (t) => {
  const tokens = readJson(
    "diff",
    "identical-tokens",
    "old",
    "tokens.tokens.json",
  );
  const ds = wasm.Dataset.fromTokens(tokens);
  const diff = ds.diff(ds);

  t.is(diff.added.length, 0);
  t.is(diff.deleted.length, 0);
  t.is(diff.renamed.length, 0);
  t.is(diff.updated.length, 0);
  t.is(diff.deprecated.length, 0);
  t.is(diff.reverted.length, 0);
});

test("diff: property-value-update", (t) => {
  const oldDs = wasm.Dataset.fromTokens(
    readJson("diff", "property-value-update", "old", "tokens.tokens.json"),
  );
  const newDs = wasm.Dataset.fromTokens(
    readJson("diff", "property-value-update", "new", "tokens.tokens.json"),
  );
  const expected = readJson("diff", "property-value-update", "expected.json");
  const diff = oldDs.diff(newDs);

  t.is(diff.updated.length, expected.updated.length);
  t.is(diff.added.length, 0);
  t.is(diff.deleted.length, 0);
});

test("diff result has all expected fields", (t) => {
  const ds = wasm.Dataset.fromTokens([]);
  const diff = ds.diff(ds);

  t.true(Array.isArray(diff.renamed));
  t.true(Array.isArray(diff.deprecated));
  t.true(Array.isArray(diff.reverted));
  t.true(Array.isArray(diff.added));
  t.true(Array.isArray(diff.deleted));
  t.true(Array.isArray(diff.updated));
});

// ---------------------------------------------------------------------------
// Validate — relational checks
// ---------------------------------------------------------------------------

test("validate: empty dataset is valid", (t) => {
  const result = wasm.Dataset.fromTokens([]).validate();
  t.true(result.valid);
  t.is(result.errors.length, 0);
});

test("validate: well-formed tokens pass relational checks", (t) => {
  const tokens = readJson(
    "query",
    "single-field",
    "input",
    "tokens.tokens.json",
  );
  const result = wasm.Dataset.fromTokens(tokens).validate();
  t.true(result.valid, `Expected valid, got: ${JSON.stringify(result.errors)}`);
  t.is(result.errors.length, 0);
});

test("validate result has correct shape", (t) => {
  const result = wasm.Dataset.fromTokens([
    {
      name: { property: "test-prop" },
      value: "#ff0000",
      uuid: "aaaaaaaa-0001-4000-8000-000000000001",
    },
  ]).validate();

  t.is(typeof result.valid, "boolean");
  t.true(Array.isArray(result.errors));
  t.true(Array.isArray(result.warnings));
});

// ---------------------------------------------------------------------------
// Resolve — base-fallback (no mode-sets required)
// ---------------------------------------------------------------------------

test("resolve: base-fallback returns the base token for any context", (t) => {
  const tokens = readJson(
    "resolution",
    "base-fallback",
    "input",
    "tokens.tokens.json",
  );
  const { property, context } = readJson(
    "resolution",
    "base-fallback",
    "query.json",
  );
  const { expected_uuid } = readJson(
    "resolution",
    "base-fallback",
    "expected.json",
  );

  const result = wasm.Dataset.fromTokens(tokens).resolve(property, context);
  t.truthy(result, "should resolve to a token");
  t.is(result.token.uuid, expected_uuid);
});

test("resolve: returns undefined when no token matches the property", (t) => {
  const ds = wasm.Dataset.fromTokens([
    {
      name: { property: "other-prop" },
      value: "#ffffff",
      uuid: "aaaaaaaa-0001-4000-8000-000000000001",
    },
  ]);
  t.is(ds.resolve("non-existent-property", {}), undefined);
});

test("resolve result has expected shape", (t) => {
  const tokens = readJson(
    "resolution",
    "base-fallback",
    "input",
    "tokens.tokens.json",
  );
  const { property, context } = readJson(
    "resolution",
    "base-fallback",
    "query.json",
  );
  const result = wasm.Dataset.fromTokens(tokens).resolve(property, context);

  t.truthy(result);
  t.is(typeof result.specificity, "number");
  t.is(typeof result.token.name, "string");
  t.is(typeof result.token.layer, "string");
  t.truthy(result.token.raw);
});

// ---------------------------------------------------------------------------
// Dataset.primer() — structural overview for agent session start
// ---------------------------------------------------------------------------

test("Dataset.embedded().primer() returns expected payload shape", (t) => {
  const ds = wasm.Dataset.embedded();
  const p = ds.primer();

  t.is(typeof p.specVersion, "string", "specVersion should be a string");
  t.is(typeof p.tokenCount, "number", "tokenCount should be a number");
  t.true(p.tokenCount > 100, `tokenCount should be >100, got ${p.tokenCount}`);
  t.true(Array.isArray(p.modeSets), "modeSets should be an array");
  t.true(p.modeSets.length > 0, "modeSets should not be empty");
  t.true(Array.isArray(p.components), "components should be an array");
  t.true(p.components.length > 0, "components should not be empty");
  t.true(Array.isArray(p.taxonomyFields), "taxonomyFields should be an array");
  t.true(
    p.taxonomyFields.length > 0,
    "taxonomyFields should not be empty (fields are baked into the embedded blob)",
  );
  t.is(typeof p.provenance, "object", "provenance should be an object");
  t.is(
    p.provenance.source,
    "embedded",
    "provenance.source should be 'embedded'",
  );
  t.is(
    typeof p.provenance.tokensVersion,
    "string",
    "provenance.tokensVersion should be a string",
  );
});

test("Dataset.embedded().primer() modeSets have expected shape", (t) => {
  const ds = wasm.Dataset.embedded();
  const { modeSets } = ds.primer();

  t.true(modeSets.length > 0);
  const first = modeSets[0];
  t.is(typeof first.name, "string");
  t.true(Array.isArray(first.modes));
  t.is(typeof first.defaultMode, "string");
  t.true(first.modes.includes(first.defaultMode));
});

test("Dataset.embedded().primer() taxonomyFields have expected shape", (t) => {
  const ds = wasm.Dataset.embedded();
  const { taxonomyFields } = ds.primer();

  t.true(taxonomyFields.length > 0);
  const first = taxonomyFields[0];
  t.is(typeof first.name, "string");
  t.is(typeof first.required, "boolean");
  // Fields are sorted alphabetically
  for (let i = 1; i < taxonomyFields.length; i++) {
    t.true(
      taxonomyFields[i].name >= taxonomyFields[i - 1].name,
      `taxonomyFields should be sorted: ${taxonomyFields[i - 1].name} <= ${taxonomyFields[i].name}`,
    );
  }
});

test("Dataset.fromTokens().primer() returns in-memory provenance", (t) => {
  const ds = wasm.Dataset.fromTokens([
    { name: { property: "test" }, value: "#fff" },
  ]);
  const p = ds.primer();

  t.is(p.tokenCount, 1);
  t.is(p.provenance.source, "in-memory");
  t.is(p.taxonomyFields.length, 0, "in-memory datasets have no fields");
});

// ---------------------------------------------------------------------------
// Dataset.resolveReference() — legacy-slug reference resolution (spike)
// ---------------------------------------------------------------------------

test("resolveReference: resolves a direct-value token by legacy slug", (t) => {
  // Build a minimal cascade dataset matching the viewer's token format.
  // "black" is a direct-value palette token.
  const ds = wasm.Dataset.fromTokens([
    {
      name: { property: "color", colorFamily: "black" },
      $schema:
        "https://opensource.adobe.com/spectrum-design-data/schemas/token-types/color.json",
      value: "rgb(0, 0, 0)",
      uuid: "test-black-0000-0000-0000-000000000001",
    },
  ]);

  const r = ds.resolveReference("{black}", {});
  t.truthy(r, "should return a result");
  t.deepEqual(r.value, "rgb(0, 0, 0)");
  t.deepEqual(r.chain, ["{black}", "rgb(0, 0, 0)"]);
});

test("resolveReference: resolves a color-set token with context discrimination", (t) => {
  // Two cascade variants for "blue-100" — light and dark.
  const ds = wasm.Dataset.fromTokens([
    {
      name: {
        property: "color",
        colorFamily: "blue",
        scaleIndex: 100,
        colorScheme: "light",
      },
      $schema:
        "https://opensource.adobe.com/spectrum-design-data/schemas/token-types/color.json",
      value: "rgb(245, 249, 255)",
      uuid: "test-blue100-light-0000-0000-000000000001",
    },
    {
      name: {
        property: "color",
        colorFamily: "blue",
        scaleIndex: 100,
        colorScheme: "dark",
      },
      $schema:
        "https://opensource.adobe.com/spectrum-design-data/schemas/token-types/color.json",
      value: "rgb(14, 23, 63)",
      uuid: "test-blue100-dark-0000-0000-000000000001",
    },
  ]);

  const light = ds.resolveReference("{blue-100}", { colorScheme: "light" });
  t.truthy(light);
  t.deepEqual(light.value, "rgb(245, 249, 255)", "should pick light variant");

  const dark = ds.resolveReference("{blue-100}", { colorScheme: "dark" });
  t.truthy(dark);
  t.deepEqual(dark.value, "rgb(14, 23, 63)", "should pick dark variant");
});

test("resolveReference: follows a one-hop alias chain", (t) => {
  // accent-background-color-default (alias) → blue-100 (concrete value in light context).
  // Uses real cascade naming: state-based property → generate_legacy_name produces
  // "accent-background-color-default", and colorFamily-based → "blue-100".
  const lightUUID = "test-blue100-light-0000-0000-000000000002";
  const ds = wasm.Dataset.fromTokens([
    {
      name: {
        property: "color",
        colorFamily: "blue",
        scaleIndex: 100,
        colorScheme: "light",
      },
      value: "rgb(245, 249, 255)",
      uuid: lightUUID,
    },
    {
      name: {
        property: "accent-background-color",
        state: "default",
        colorScheme: "light",
      },
      $schema:
        "https://opensource.adobe.com/spectrum-design-data/schemas/token-types/alias.json",
      $ref: lightUUID,
      uuid: "test-accent-bg-default-light-0000-000000000001",
    },
  ]);

  // Note: extract_legacy_key({ property: "accent-background-color", state: "default" })
  // → "accent-background-color-default" (via generate_legacy_name).
  const r = ds.resolveReference("{accent-background-color-default}", {
    colorScheme: "light",
  });
  t.truthy(r, "alias chain should resolve");
  t.deepEqual(r.value, "rgb(245, 249, 255)");
  // Chain: [{accent-background-color-default}, {blue-100}, rgb(245, 249, 255)]
  t.is(
    r.chain.length,
    3,
    `chain length expected 3, got: ${JSON.stringify(r.chain)}`,
  );
  t.is(r.chain[0], "{accent-background-color-default}");
  t.is(r.chain[2], "rgb(245, 249, 255)");
});

test("resolveReference: returns undefined for an unknown token name", (t) => {
  const ds = wasm.Dataset.fromTokens([
    {
      name: { property: "color", colorFamily: "blue" },
      value: "blue",
      uuid: "any",
    },
  ]);
  const r = ds.resolveReference("{totally-made-up}", {});
  t.is(r, undefined);
});

test("resolveReference: result has expected shape", (t) => {
  const ds = wasm.Dataset.fromTokens([
    {
      name: { property: "color", colorFamily: "black" },
      value: "rgb(0, 0, 0)",
      uuid: "shape-black-0000-0000-0000-000000000001",
    },
  ]);
  const r = ds.resolveReference("black", {});
  t.truthy(r);
  t.true(Array.isArray(r.chain));
  t.true(r.chain.length >= 1);
  // value is the raw JSON value (string for color, number for dimension, etc.)
  t.true(r.value !== null && r.value !== undefined);
});

// ── embedded dataset smoke test ──────────────────────────────────────────────

test("resolveReference: embedded dataset resolves a known palette token", (t) => {
  const ds = wasm.Dataset.embedded();
  // "black" is a stable direct-value palette token in the embedded Spectrum dataset.
  const r = ds.resolveReference("{black}", {});
  t.truthy(r, "should resolve 'black' in embedded dataset");
  t.true(Array.isArray(r.chain) && r.chain.length >= 2);
  t.truthy(r.value);
});

test("resolveReference: embedded dataset resolves blue-100 with light context", (t) => {
  const ds = wasm.Dataset.embedded();
  const r = ds.resolveReference("{blue-100}", { colorScheme: "light" });
  t.truthy(r, "should resolve 'blue-100' in light context");
  t.deepEqual(r.value, "rgb(245, 249, 255)");
  t.is(r.chain[0], "{blue-100}");
});

test("resolveReference: embedded dataset resolves blue-100 with dark context", (t) => {
  const ds = wasm.Dataset.embedded();
  const r = ds.resolveReference("{blue-100}", { colorScheme: "dark" });
  t.truthy(r, "should resolve 'blue-100' in dark context");
  t.deepEqual(r.value, "rgb(14, 23, 63)");
});
