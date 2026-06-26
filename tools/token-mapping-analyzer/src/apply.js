// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0

// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

/**
 * Apply a single taxonomy field decomposition across all cascade token files.
 *
 * Usage: node src/apply.js --field <fieldName> [--write]
 *
 * For each cascade token whose inline name.property contains a term belonging to
 * <fieldName>'s registry, extracts that term into its own field when the
 * decomposer is HIGH confidence and the result roundtrips. Dry-run by default.
 *
 * ponytail: one writer for all fields, parameterized by --field; no per-field modules.
 */

import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { loadRegistries } from "./registry-index.js";
import { decompose, serialize } from "./decomposer.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "../../..");
const CASCADE_DIR = resolve(REPO_ROOT, "packages/design-data/tokens");

const CASCADE_FILES = [
  "color-aliases.tokens.json",
  "color-component.tokens.json",
  "color-palette.tokens.json",
  "icons.tokens.json",
  "layout-component.tokens.json",
  "layout.tokens.json",
  "semantic-color-palette.tokens.json",
  "typography.tokens.json",
];

function parseArgs() {
  const args = process.argv.slice(2);
  const fieldIdx = args.indexOf("--field");
  const field = fieldIdx !== -1 ? args[fieldIdx + 1] : null;
  const write = args.includes("--write");
  if (!field) {
    console.error("Usage: node src/apply.js --field <fieldName> [--write]");
    process.exit(1);
  }
  return { field, write };
}

export function applyField(tokens, field, registry, filename) {
  let applied = 0;

  for (const token of tokens) {
    if (!token.name || typeof token.name !== "object") continue;
    if (token.name[field] !== undefined) continue; // already migrated

    // Reconstruct the legacy key from the inline name object.
    // mode-set fields (scale, colorScheme, contrast) are excluded by serializationOrder.
    const legacyKey = serialize(
      token.name,
      registry.tokenNameMap,
      registry.serializationOrder,
    );
    if (!legacyKey) continue;

    const result = decompose(
      legacyKey,
      { deprecated: !!token.deprecated },
      registry,
      filename,
    );

    // Only apply when: HIGH confidence, roundtrips, field was extracted, property trimmed
    if (
      result.confidence !== "HIGH" ||
      !result.roundtrips ||
      result.nameObject[field] === undefined ||
      !result.nameObject.property // guard: property must remain non-empty
    )
      continue;

    // Safety re-serialize: patched name must still produce the same legacy key
    const patched = {
      ...token.name,
      [field]: result.nameObject[field],
      property: result.nameObject.property,
    };
    if (
      serialize(patched, registry.tokenNameMap, registry.serializationOrder) !==
      legacyKey
    )
      continue;

    token.name[field] = result.nameObject[field];
    token.name.property = result.nameObject.property;
    applied++;
  }

  return applied;
}

async function main() {
  const { field, write } = parseArgs();
  const registry = loadRegistries();

  if (!registry.byField[field]) {
    console.error(
      `Unknown field: "${field}". Known fields: ${Object.keys(registry.byField).join(", ")}`,
    );
    process.exit(1);
  }

  let totalTokens = 0,
    alreadyHas = 0,
    totalApplied = 0;

  for (const filename of CASCADE_FILES) {
    const filePath = resolve(CASCADE_DIR, filename);
    const tokens = JSON.parse(readFileSync(filePath, "utf-8"));

    // Count pre-existing field values
    const hadField = tokens.filter(
      (t) => typeof t.name === "object" && t.name?.[field] !== undefined,
    ).length;
    totalTokens += tokens.filter((t) => typeof t.name === "object").length;
    alreadyHas += hadField;

    const applied = applyField(tokens, field, registry, filename);
    totalApplied += applied;

    if (write && applied > 0) {
      writeFileSync(filePath, JSON.stringify(tokens, null, 2) + "\n");
    }
    if (applied > 0 || hadField > 0) {
      console.log(
        `  ${filename}: ${applied} applied, ${hadField} already had field`,
      );
    }
  }

  const eligible = totalTokens - alreadyHas;
  const pct =
    eligible > 0 ? ((totalApplied / eligible) * 100).toFixed(1) : "0.0";

  console.log(
    `\n=== ${field} decomposition${write ? " (WROTE)" : " (dry run)"} ===`,
  );
  console.log(`  Total name-object tokens: ${totalTokens}`);
  console.log(`  Already has "${field}":   ${alreadyHas}`);
  console.log(`  Applied:                  ${totalApplied}`);
  console.log(`  Skipped (low confidence): ${eligible - totalApplied}`);
  console.log(`  Adoption (of eligible):   ${pct}%`);
  if (!write && totalApplied > 0) {
    console.log("\nRun with --write to persist.");
  }
}

// Only run when this file is the entry point (not when imported by tests)
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
