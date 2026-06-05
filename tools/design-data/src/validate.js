// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

/**
 * Layer-1 (JSON-Schema structural) validation for design token datasets.
 *
 * The wasm Dataset.validate() runs Layer-2 relational rules only — it explicitly
 * omits Layer-1 because JSON-Schema validation requires filesystem access not
 * available in wasm. This module fills that gap for Node.js callers.
 *
 * Mirrors the Rust implementation in sdk/core/src/validate/structural.rs using
 * Ajv 2020-12 (same draft as the Rust jsonschema crate).
 *
 * Schema source: packages/tokens/schemas/  (also published in @adobe/spectrum-tokens)
 */

import { createRequire } from "node:module";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import Ajv from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { loadDataset, walkTokenFiles } from "./load.js";

// ---------------------------------------------------------------------------
// Schema directory resolution
// ---------------------------------------------------------------------------

/**
 * Attempt to locate the Spectrum token schemas directory by resolving
 * @adobe/spectrum-tokens (the npm package that ships them).
 *
 * @returns {string|null} Absolute path to the schemas/ directory, or null.
 */
function resolveSpectrumTokensSchemaDir() {
  try {
    const req = createRequire(import.meta.url);
    const pkgJson = req.resolve("@adobe/spectrum-tokens/package.json");
    return join(dirname(pkgJson), "schemas");
  } catch {
    return null;
  }
}

/**
 * Return the schemas directory to use.
 *
 * @param {string|null|undefined} schemaPath - Caller-supplied override (the
 *   directory that contains token-types/ and token-file.json). If omitted the
 *   function falls back to @adobe/spectrum-tokens.
 * @param {{ required?: boolean }} [opts]
 * @returns {string|null} Absolute path to the schemas directory, or null when
 *   no path was supplied AND auto-discovery failed (only when required is false).
 * @throws {Error} When schemaPath is provided but does not exist or lacks
 *   token-types/; or when required is true and no path can be auto-resolved.
 */
export function resolveSchemaDir(schemaPath, { required = true } = {}) {
  if (schemaPath) {
    if (!existsSync(schemaPath)) {
      throw new Error(
        `schema_path does not exist: "${schemaPath}". ` +
          `Point it at the directory that contains token-types/ and token-file.json.`,
      );
    }
    const typesDir = join(schemaPath, "token-types");
    if (!existsSync(typesDir)) {
      throw new Error(
        `schema_path "${schemaPath}" does not contain a token-types/ subdirectory. ` +
          `Expected a schemas/ root that contains token-types/*.json and token-file.json.`,
      );
    }
    return schemaPath;
  }

  const fallback = resolveSpectrumTokensSchemaDir();
  if (fallback && existsSync(join(fallback, "token-types"))) {
    return fallback;
  }

  if (required) {
    throw new Error(
      `Cannot locate the Spectrum token schemas directory. ` +
        `Either install @adobe/spectrum-tokens or pass an explicit schema_path ` +
        `pointing at a directory containing token-types/ and token-file.json.`,
    );
  }

  return null;
}

// ---------------------------------------------------------------------------
// Ajv setup
// ---------------------------------------------------------------------------

/**
 * Build an Ajv 2020-12 instance with all token-type schemas and token-file.json
 * pre-registered so relative $ref resolution works offline.
 *
 * @param {string} schemaDir - Absolute path to schemas/ directory.
 * @returns {import('ajv').default} Configured Ajv instance.
 */
export function loadSchemaValidator(schemaDir) {
  const ajv = new Ajv({ strict: false, allErrors: true });
  addFormats(ajv);

  // Register all token-type schemas by $id.
  const typesDir = join(schemaDir, "token-types");
  for (const file of readdirSync(typesDir).filter((f) => f.endsWith(".json"))) {
    const schema = JSON.parse(readFileSync(join(typesDir, file), "utf-8"));
    const id = schema["$id"];
    if (!id)
      throw new Error(
        `Token-type schema "${file}" is missing a required $id field`,
      );
    if (!ajv.getSchema(id)) ajv.addSchema(schema, id);
  }

  // Register token-file.json.
  const tokenFileSchema = JSON.parse(
    readFileSync(join(schemaDir, "token-file.json"), "utf-8"),
  );
  const tokenFileId = tokenFileSchema["$id"];
  if (!tokenFileId)
    throw new Error(`token-file.json is missing a required $id field`);
  if (!ajv.getSchema(tokenFileId)) ajv.addSchema(tokenFileSchema, tokenFileId);

  return ajv;
}

// ---------------------------------------------------------------------------
// Per-token validation
// ---------------------------------------------------------------------------

/**
 * Validate a single token object against its declared $schema, returning any
 * Ajv errors as Layer-1 diagnostics.
 *
 * @param {object} token - Token object (must have $schema and value fields).
 * @param {import('ajv').default} ajv - Pre-configured Ajv instance.
 * @param {string} [context] - Optional label for error messages (e.g. filename/key).
 * @returns {{ severity: string, message: string, path?: string, ruleId?: undefined }[]}
 */
function validateTokenSchema(token, ajv, context = "") {
  const schemaId = token["$schema"];
  if (!schemaId) return []; // Missing $schema is allowed for cascade tokens.

  const validate = ajv.getSchema(schemaId);
  if (!validate) {
    return [
      {
        severity: "error",
        message: `Unknown $schema URL "${schemaId}"${context ? ` in ${context}` : ""}.`,
      },
    ];
  }

  const valid = validate(token);
  if (valid) return [];

  return (validate.errors ?? []).map((err) => ({
    severity: "error",
    message: `${err.instancePath || "(root)"} ${err.message}${context ? ` [${context}]` : ""}`,
    path: err.instancePath || undefined,
  }));
}

/**
 * Validate a single token against its $schema.  Convenience wrapper that
 * handles schema directory resolution and Ajv setup.
 *
 * @param {object} token
 * @param {string} schemaDir - Resolved schemas/ directory (from resolveSchemaDir).
 * @returns {{ valid: boolean, errors: object[], warnings: object[] }}
 */
export function validateTokenAgainstSchema(token, schemaDir) {
  const ajv = loadSchemaValidator(schemaDir);
  const errors = validateTokenSchema(token, ajv);
  return { valid: errors.length === 0, errors, warnings: [] };
}

// ---------------------------------------------------------------------------
// Dataset-level validation (Layer-1 + Layer-2 merged)
// ---------------------------------------------------------------------------

/**
 * Run full validation (Layer-1 JSON-Schema + Layer-2 relational) over a dataset
 * directory, returning a merged ValidationResult.
 *
 * @param {string} datasetPath - Path to the token dataset directory.
 * @param {object} [opts]
 * @param {string|null} [opts.schemaPath] - Override schemas/ directory.
 * @param {string|null} [opts.exceptionsPath] - NOT supported in the in-process path
 *   (exceptions apply to SPEC-007 naming in the relational layer which requires the
 *   CLI). Pass null or omit; throws if a non-null value is provided.
 * @param {boolean} [opts.strict] - Promote warnings to errors.
 * @returns {Promise<{ valid: boolean, errors: object[], warnings: object[] }>}
 */
export async function validateDataset(
  datasetPath,
  { schemaPath, exceptionsPath, strict = false } = {},
) {
  if (exceptionsPath) {
    throw new Error(
      `exceptionsPath is not supported by the in-process validator (it applies to SPEC-007 ` +
        `naming checks in the relational layer which requires the CLI). ` +
        `Omit exceptionsPath or use the design-data CLI directly: design-data validate --exceptions-path.`,
    );
  }

  // Layer-1: JSON-Schema structural validation.
  const resolvedSchemaDir = resolveSchemaDir(schemaPath ?? null, {
    required: true,
  });
  const ajv = loadSchemaValidator(resolvedSchemaDir);
  const layer1Errors = [];

  // Walk token files and validate each token's $schema.
  const tokenFiles = walkTokenFiles(datasetPath);
  for (const file of tokenFiles) {
    let parsed;
    try {
      parsed = JSON.parse(readFileSync(file, "utf-8"));
    } catch {
      layer1Errors.push({
        severity: "error",
        message: `Failed to parse ${file}`,
      });
      continue;
    }
    if (!Array.isArray(parsed)) continue; // Legacy object-map format — loadDataset (Layer-2) warns and skips these.
    const tokens = parsed;
    for (const token of tokens) {
      const diags = validateTokenSchema(token, ajv, file);
      layer1Errors.push(...diags);
    }
  }

  // Layer-2: relational rules via wasm.
  const ds = await loadDataset(datasetPath);
  const layer2Result = ds.validate();

  const allErrors = [
    ...layer1Errors.filter((d) => d.severity === "error"),
    ...layer2Result.errors,
  ];
  const allWarnings = [
    ...layer1Errors.filter((d) => d.severity !== "error"),
    ...layer2Result.warnings,
  ];

  if (strict && allWarnings.length > 0) {
    return {
      valid: false,
      errors: [...allErrors, ...allWarnings],
      warnings: [],
    };
  }

  return {
    valid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings,
  };
}
