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
 * One-time migration: nests flat token lifecycle fields (`deprecated`,
 * `deprecated_comment`, `replaced_by`, `plannedRemoval`, `introduced`) into a single
 * `lifecycle` object, renaming `deprecated` -> `deprecatedIn` and the snake_case
 * fields to camelCase, so the token schema matches the component schema's existing
 * nested `lifecycle` pattern. See design-data-spec/spec/token-format.md.
 *
 * Also renames the existing nested `lifecycle.deprecated` -> `lifecycle.deprecatedIn`
 * on components (root, anatomy[], states[], options.*.values[]) for the same reason —
 * a no-op today (no component currently has this field set) but kept for correctness
 * as the schema changed.
 *
 * Each token's `lifecycle` object is inserted at the position of the first flat
 * lifecycle field it replaces, preserving surrounding key order so the diff stays
 * minimal. Run `prettier --write` on the touched files afterward — this repo's
 * default prettier config reproduces the on-disk token format byte-for-byte, so the
 * resulting diff shows only the intended lifecycle changes.
 *
 * Usage: node packages/design-data/scripts/migrate-lifecycle-nesting.js [--dry-run]
 */

import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..", "..", "..");
const tokensDir = join(repoRoot, "packages", "design-data", "tokens");
const componentsDir = join(repoRoot, "packages", "design-data", "components");

const dryRun = process.argv.includes("--dry-run");

// Token flat field -> lifecycle key, in the canonical order the nested object
// should be written in.
const TOKEN_LIFECYCLE_FIELD_MAP = [
  ["introduced", "introduced"],
  ["deprecated", "deprecatedIn"],
  ["deprecated_comment", "deprecatedComment"],
  ["replaced_by", "replacedBy"],
  ["plannedRemoval", "plannedRemoval"],
];
const TOKEN_LIFECYCLE_FLAT_KEYS = new Set(
  TOKEN_LIFECYCLE_FIELD_MAP.map(([flat]) => flat),
);

/**
 * Rebuild a token object with its flat lifecycle fields nested under `lifecycle`,
 * inserted at the position of the first such field, preserving all other key order.
 * Returns the original object unchanged (same reference) if it has none of the
 * flat lifecycle fields.
 */
function nestTokenLifecycle(token) {
  const keys = Object.keys(token);
  if (!keys.some((k) => TOKEN_LIFECYCLE_FLAT_KEYS.has(k))) return token;

  const lifecycle = {};
  for (const [flat, nested] of TOKEN_LIFECYCLE_FIELD_MAP) {
    if (Object.hasOwn(token, flat)) lifecycle[nested] = token[flat];
  }

  const rebuilt = {};
  let inserted = false;
  for (const key of keys) {
    if (TOKEN_LIFECYCLE_FLAT_KEYS.has(key)) {
      if (!inserted) {
        rebuilt.lifecycle = lifecycle;
        inserted = true;
      }
      continue;
    }
    rebuilt[key] = token[key];
  }
  return rebuilt;
}

/**
 * Rename `lifecycle.deprecated` -> `lifecycle.deprecatedIn` in place, if present.
 * Returns whether a rename occurred, so callers can avoid rewriting (and thereby
 * reformatting) files with no actual change.
 */
function renameNestedDeprecated(obj) {
  if (
    obj &&
    typeof obj === "object" &&
    obj.lifecycle &&
    typeof obj.lifecycle === "object" &&
    Object.hasOwn(obj.lifecycle, "deprecated")
  ) {
    const { deprecated, ...rest } = obj.lifecycle;
    obj.lifecycle = { deprecatedIn: deprecated, ...rest };
    return true;
  }
  return false;
}

/** Returns whether any nested `lifecycle.deprecated` was renamed. */
function migrateComponent(component) {
  let changed = renameNestedDeprecated(component);
  for (const part of component.anatomy ?? []) {
    changed = renameNestedDeprecated(part) || changed;
  }
  for (const state of component.states ?? []) {
    changed = renameNestedDeprecated(state) || changed;
  }
  for (const option of Object.values(component.options ?? {})) {
    for (const value of option.values ?? []) {
      changed = renameNestedDeprecated(value) || changed;
    }
  }
  return changed;
}

function main() {
  let tokensChanged = 0;
  let filesChanged = [];

  for (const file of readdirSync(tokensDir).filter((f) =>
    f.endsWith(".tokens.json"),
  )) {
    const filePath = join(tokensDir, file);
    const tokens = JSON.parse(readFileSync(filePath, "utf8"));
    let changedInFile = 0;
    const migrated = tokens.map((token) => {
      const result = nestTokenLifecycle(token);
      if (result !== token) changedInFile++;
      return result;
    });
    if (changedInFile > 0) {
      tokensChanged += changedInFile;
      filesChanged.push(filePath);
      if (!dryRun) {
        writeFileSync(filePath, JSON.stringify(migrated, null, 2) + "\n");
      }
    }
  }

  let componentsChanged = 0;
  for (const file of readdirSync(componentsDir).filter((f) =>
    f.endsWith(".json"),
  )) {
    const filePath = join(componentsDir, file);
    const component = JSON.parse(readFileSync(filePath, "utf8"));
    if (migrateComponent(component)) {
      componentsChanged++;
      filesChanged.push(filePath);
      if (!dryRun) {
        writeFileSync(filePath, JSON.stringify(component, null, 2) + "\n");
      }
    }
  }

  console.log(`Tokens migrated:      ${tokensChanged}`);
  console.log(`Components migrated:  ${componentsChanged}`);
  console.log(`Files touched:        ${filesChanged.length}`);
  if (dryRun) {
    console.log("\n(dry run — no files written)");
  } else if (filesChanged.length > 0) {
    console.log(
      "\nRun `npx prettier --write <files>` on the touched files to normalize formatting.",
    );
  }
}

main();
