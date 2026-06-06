// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

import { writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import test from "ava";
import {
  resolveSchemaDir,
  loadSchemaValidator,
  validateTokenAgainstSchema,
  validateDataset,
} from "../src/validate.js";

// ---------------------------------------------------------------------------
// Minimal schemas for testing — written to a temp directory
// ---------------------------------------------------------------------------

const SCHEMA_ID_BASE = "https://example.com/test-schemas";

/** A minimal color token schema (Draft 2020-12). */
const COLOR_SCHEMA = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: `${SCHEMA_ID_BASE}/token-types/color.json`,
  allOf: [{ $ref: "token.json" }],
  type: "object",
  properties: {
    value: { type: "string", description: "CSS color value" },
  },
};

/** A base token schema with required uuid and value. */
const TOKEN_SCHEMA = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: `${SCHEMA_ID_BASE}/token-types/token.json`,
  type: "object",
  required: ["value", "uuid"],
  properties: {
    value: {},
    uuid: { type: "string" },
    $schema: { type: "string" },
    name: { type: "object" },
  },
};

/** The token-file.json schema — minimal, just requires an object. */
const TOKEN_FILE_SCHEMA = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: `${SCHEMA_ID_BASE}/token-file.json`,
  type: "object",
};

const VALID_COLOR_TOKEN = {
  $schema: `${SCHEMA_ID_BASE}/token-types/color.json`,
  uuid: randomUUID(),
  value: "#ff0000",
  name: { property: "accent-color" },
};

// Token with a valid $schema but missing required 'value' field.
const INVALID_TOKEN_MISSING_VALUE = {
  $schema: `${SCHEMA_ID_BASE}/token-types/color.json`,
  uuid: randomUUID(),
  // Missing 'value'
};

// Token with an unknown $schema URL.
const TOKEN_UNKNOWN_SCHEMA = {
  $schema: "https://example.com/test-schemas/token-types/unknown.json",
  uuid: randomUUID(),
  value: "red",
};

// ---------------------------------------------------------------------------
// Temp directory setup
// ---------------------------------------------------------------------------

const TMP = join(
  tmpdir(),
  "design-data-js-validate-" + randomUUID().slice(0, 8),
);
const SCHEMA_DIR = join(TMP, "schemas");
const TOKEN_TYPES_DIR = join(SCHEMA_DIR, "token-types");
const DATASET_DIR = join(TMP, "tokens");

test.before(() => {
  // Write minimal schemas.
  mkdirSync(TOKEN_TYPES_DIR, { recursive: true });
  writeFileSync(
    join(TOKEN_TYPES_DIR, "color.json"),
    JSON.stringify(COLOR_SCHEMA),
  );
  writeFileSync(
    join(TOKEN_TYPES_DIR, "token.json"),
    JSON.stringify(TOKEN_SCHEMA),
  );
  writeFileSync(
    join(SCHEMA_DIR, "token-file.json"),
    JSON.stringify(TOKEN_FILE_SCHEMA),
  );

  // Write a minimal token dataset.
  mkdirSync(DATASET_DIR, { recursive: true });
  writeFileSync(
    join(DATASET_DIR, "test.tokens.json"),
    JSON.stringify([VALID_COLOR_TOKEN]),
  );
});

test.after(() => rmSync(TMP, { recursive: true, force: true }));

// ---------------------------------------------------------------------------
// resolveSchemaDir tests
// ---------------------------------------------------------------------------

test("resolveSchemaDir returns explicit path when it exists and has token-types/", (t) => {
  const resolved = resolveSchemaDir(SCHEMA_DIR);
  t.is(resolved, SCHEMA_DIR);
});

test("resolveSchemaDir throws when schemaPath does not exist", (t) => {
  t.throws(() => resolveSchemaDir(join(TMP, "nonexistent")), {
    message: /does not exist/,
  });
});

test("resolveSchemaDir throws when schemaPath lacks token-types/", (t) => {
  // Create a dir without token-types/ sub-dir
  const noTypes = join(TMP, "no-types");
  mkdirSync(noTypes, { recursive: true });
  t.throws(() => resolveSchemaDir(noTypes), {
    message: /token-types/,
  });
});

// ---------------------------------------------------------------------------
// loadSchemaValidator tests
// ---------------------------------------------------------------------------

test("loadSchemaValidator compiles schemas by $id", (t) => {
  const ajv = loadSchemaValidator(SCHEMA_DIR);
  const validate = ajv.getSchema(`${SCHEMA_ID_BASE}/token-types/color.json`);
  t.truthy(validate, "color schema should be registered");
});

// ---------------------------------------------------------------------------
// validateTokenAgainstSchema tests
// ---------------------------------------------------------------------------

test("validateTokenAgainstSchema passes a structurally valid token", (t) => {
  const result = validateTokenAgainstSchema(VALID_COLOR_TOKEN, SCHEMA_DIR);
  t.true(
    result.valid,
    `Expected valid but got errors: ${JSON.stringify(result.errors)}`,
  );
  t.deepEqual(result.errors, []);
});

test("validateTokenAgainstSchema catches a token missing required field", (t) => {
  const result = validateTokenAgainstSchema(
    INVALID_TOKEN_MISSING_VALUE,
    SCHEMA_DIR,
  );
  t.false(result.valid);
  t.true(result.errors.length > 0, "Expected at least one error");
  t.true(
    result.errors.some(
      (e) => e.message.includes("value") || e.severity === "error",
    ),
    `Expected error about missing value, got: ${JSON.stringify(result.errors)}`,
  );
});

test("validateTokenAgainstSchema reports unknown $schema URL as error", (t) => {
  const result = validateTokenAgainstSchema(TOKEN_UNKNOWN_SCHEMA, SCHEMA_DIR);
  t.false(result.valid);
  t.true(result.errors.length > 0);
  t.true(
    result.errors[0].message.includes("Unknown $schema"),
    `Expected unknown schema error, got: ${result.errors[0].message}`,
  );
});

test("validateTokenAgainstSchema passes a token without $schema (cascade)", (t) => {
  const noSchema = {
    uuid: randomUUID(),
    value: "#abc",
    name: { property: "test" },
  };
  const result = validateTokenAgainstSchema(noSchema, SCHEMA_DIR);
  t.true(result.valid);
  t.deepEqual(result.errors, []);
});

// ---------------------------------------------------------------------------
// validateDataset tests (Layer-1 + Layer-2 single-pass path)
// ---------------------------------------------------------------------------

test("validateDataset returns valid for a well-formed token dataset", async (t) => {
  const result = await validateDataset(DATASET_DIR, { schemaPath: SCHEMA_DIR });
  t.true(
    result.valid,
    `Expected valid but got errors: ${JSON.stringify(result.errors)}`,
  );
  t.deepEqual(result.errors, []);
});

test("validateDataset catches Layer-1 errors from invalid token files", async (t) => {
  const dir = join(TMP, "invalid-tokens-" + randomUUID().slice(0, 8));
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, "bad.tokens.json"),
    JSON.stringify([
      {
        $schema: `${SCHEMA_ID_BASE}/token-types/color.json`,
        uuid: randomUUID(),
      },
    ]), // missing value
  );
  const result = await validateDataset(dir, { schemaPath: SCHEMA_DIR });
  t.false(result.valid);
  t.true(result.errors.length > 0, "Expected at least one Layer-1 error");
  rmSync(dir, { recursive: true, force: true });
});
