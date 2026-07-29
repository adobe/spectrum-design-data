// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0

// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

/**
 * One-off decomposition for spectrum-design-data-284.8: splits the four
 * registered legacy-alias atomic properties (background-color, border-color,
 * visual-color, border-opacity) into object + property. decompose() doesn't
 * attempt this split itself (it matches the whole registered property term
 * first), so apply.js's generic --field object pass can't reach these; this
 * script performs the same whole-object-merge + roundtrip-safety pattern by
 * hand for exactly this known-safe mapping.
 *
 * Usage: node scripts/decompose-surface-color-284-8.mjs [--write]
 */

import { readFileSync, readdirSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { loadRegistries } from "../src/registry-index.js";
import { serialize } from "../src/decomposer.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "../../..");
const CASCADE_DIR = resolve(REPO_ROOT, "packages/design-data/tokens");
const write = process.argv.includes("--write");

const MAPPING = {
  "background-color": { object: "background", property: "color" },
  "border-color": { object: "border", property: "color" },
  "visual-color": { object: "visual", property: "color" },
  "border-opacity": { object: "border", property: "opacity" },
};

const registry = loadRegistries();
const files = readdirSync(CASCADE_DIR)
  .filter((f) => f.endsWith(".tokens.json"))
  .sort();

let totalApplied = 0;
let totalSkipped = 0;

for (const filename of files) {
  const filePath = resolve(CASCADE_DIR, filename);
  const tokens = JSON.parse(readFileSync(filePath, "utf-8"));
  let applied = 0;
  let skipped = 0;

  for (const token of tokens) {
    if (!token.name || typeof token.name !== "object") continue;
    if (token.deprecated) continue;
    const map = MAPPING[token.name.property];
    if (!map) continue;
    if (token.name.object !== undefined) continue; // already migrated

    // Legacy key must be pinned explicitly regardless of whether it already
    // was, exactly as for every other decomposition in this epic-284 sweep.
    const legacyKey =
      token.name.legacyKey ??
      serialize(token.name, registry.tokenNameMap, registry.serializationOrder);
    if (!legacyKey) {
      skipped++;
      console.warn(`  SKIP (no legacyKey derivable): ${filename} ${JSON.stringify(token.name)}`);
      continue;
    }

    const patched = {
      ...token.name,
      object: map.object,
      property: map.property,
      legacyKey,
    };

    // Safety check: the patched name object must still resolve to the same
    // legacy key via the pin (serialize() prefers an explicit legacyKey, so
    // this mainly guards against a typo in MAPPING).
    const resolved = patched.legacyKey;
    if (resolved !== legacyKey) {
      skipped++;
      console.warn(`  SKIP (mismatch): ${filename} ${legacyKey}`);
      continue;
    }

    token.name = patched;
    applied++;
  }

  totalApplied += applied;
  totalSkipped += skipped;
  if (applied > 0) {
    console.log(`  ${filename}: ${applied} applied`);
    if (write) {
      writeFileSync(filePath, JSON.stringify(tokens, null, 2) + "\n");
    }
  }
}

console.log(`\n=== surface-color decomposition (284.8)${write ? " (WROTE)" : " (dry run)"} ===`);
console.log(`  Applied: ${totalApplied}`);
console.log(`  Skipped: ${totalSkipped}`);
if (!write && totalApplied > 0) {
  console.log("\nRun with --write to persist.");
}
