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
 * Filesystem dataset loader for @adobe/design-data-wasm.
 *
 * Walks a directory for *.tokens.json files (cascade array format), merges them,
 * and returns a Dataset built via Dataset.fromTokens(). This mirrors the token-loading
 * behaviour of `design-data query/resolve/validate/diff <dataPath>` but runs in-process.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

let _wasmModule;

async function getWasm() {
  if (!_wasmModule) {
    _wasmModule = await import("@adobe/design-data-wasm");
  }
  return _wasmModule;
}

/**
 * Walk `dir` recursively and collect all `*.tokens.json` file paths.
 * Results are sorted for stable, deterministic ordering.
 *
 * @param {string} dir
 * @returns {string[]}
 */
export function walkTokenFiles(dir) {
  const results = [];
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      results.push(...walkTokenFiles(fullPath));
    } else if (entry.endsWith(".tokens.json")) {
      results.push(fullPath);
    }
  }
  return results.sort();
}

/**
 * Load all cascade token files from `dirPath` and return a Dataset.
 *
 * Accepts the cascade array format: each `.tokens.json` file must contain a
 * JSON array of token objects (the same format `Dataset.fromTokens()` expects).
 * Files in object-map (legacy) format are skipped with a warning.
 *
 * @param {string} dirPath - Path to the token dataset directory.
 * @returns {Promise<import('@adobe/design-data-wasm').Dataset>}
 */
export async function loadDataset(dirPath) {
  const { Dataset } = await getWasm();
  const files = walkTokenFiles(dirPath);
  const tokens = [];
  for (const file of files) {
    let content;
    try {
      content = JSON.parse(readFileSync(file, "utf-8"));
    } catch (e) {
      console.warn(
        `[design-data-js] Skipping unparseable file: ${file} — ${e.message}`,
      );
      continue;
    }
    if (Array.isArray(content)) {
      tokens.push(...content);
    } else {
      // Legacy object-map format is not supported by Dataset.fromTokens() —
      // the wasm surface only handles cascade arrays. Warn and skip.
      console.warn(
        `[design-data-js] Skipping legacy object-map file (not cascade format): ${file}`,
      );
    }
  }
  return Dataset.fromTokens(tokens);
}

/**
 * Build a Dataset directly from an already-parsed token array.
 * Use this when the caller has already read and parsed the token files to avoid
 * a second filesystem pass.
 *
 * @param {object[]} tokens - Flat array of cascade-format token objects.
 * @returns {Promise<import('@adobe/design-data-wasm').Dataset>}
 */
export async function buildDataset(tokens) {
  const { Dataset } = await getWasm();
  return Dataset.fromTokens(tokens);
}

/**
 * Synchronous variant using the already-loaded wasm module.
 * The caller is responsible for ensuring the module is initialised first.
 *
 * @param {string} dirPath
 * @param {{ Dataset: typeof import('@adobe/design-data-wasm').Dataset }} wasm
 * @returns {import('@adobe/design-data-wasm').Dataset}
 */
export function loadDatasetSync(dirPath, wasm) {
  const files = walkTokenFiles(dirPath);
  const tokens = [];
  for (const file of files) {
    let content;
    try {
      content = JSON.parse(readFileSync(file, "utf-8"));
    } catch (e) {
      console.warn(
        `[design-data-js] Skipping unparseable file: ${file} — ${e.message}`,
      );
      continue;
    }
    if (Array.isArray(content)) {
      tokens.push(...content);
    }
  }
  return wasm.Dataset.fromTokens(tokens);
}
