// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0

// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

/**
 * Generates token renames for ordering mismatches.
 *
 * For each token whose existing name doesn't match the spec serialization order,
 * this script:
 * 1. Marks the old token as deprecated with `renamed` pointing to the new name
 * 2. Creates a new token entry with the spec-order name and the original value/sets
 *
 * Usage: node src/generate-renames.js [--dry-run]
 */

import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { loadRegistries } from "./registry-index.js";
import { decompose } from "./decomposer.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TOKENS_DIR = resolve(__dirname, "../../../packages/tokens/src");

const TOKEN_FILES = [
  "semantic-color-palette.json",
  "color-aliases.json",
  "color-component.json",
  "icons.json",
  "layout.json",
  "layout-component.json",
  "typography.json",
];

const dryRun = process.argv.includes("--dry-run");

async function main() {
  const registry = loadRegistries();
  let totalRenames = 0;
  let totalSkipped = 0;

  for (const filename of TOKEN_FILES) {
    const filePath = resolve(TOKENS_DIR, filename);
    const data = JSON.parse(readFileSync(filePath, "utf-8"));
    const renames = [];

    for (const [tokenName, tokenData] of Object.entries(data)) {
      // Skip already-deprecated tokens
      if (tokenData.deprecated) continue;
      // Skip private tokens
      if (tokenData.private) continue;

      const result = decompose(tokenName, tokenData, registry, filename);

      // Only rename if:
      // 1. No gaps (all segments assigned)
      // 2. No unmatched segments
      // 3. Doesn't roundtrip (ordering mismatch)
      if (result.gaps.length > 0 || result.unmatchedSegments.length > 0)
        continue;
      if (result.roundtrips) continue;

      const newName = result.serialized;

      // Safety: don't rename if the new name already exists
      if (data[newName]) {
        console.log(
          `  SKIP ${tokenName} -> ${newName} (target already exists)`,
        );
        totalSkipped++;
        continue;
      }

      // Safety: skip if property looks like a misclassified field value
      // (e.g., "black-color", "color-primary" — signs of a bad decomposition)
      const prop = result.nameObject.property || "";
      const suspiciousProps = [
        "color-primary",
        "black-color",
        "white-color",
        "color-inverse",
        "color-turquoise",
        "brown-color",
        "turquoise-color",
        "padding-2x",
        "component-bold",
        "component-medium",
        "component-regular",
        "rounding-increment",
      ];
      if (suspiciousProps.some((p) => prop === p || prop.includes(p))) {
        console.log(
          `  SKIP ${tokenName} -> ${newName} (suspicious property: "${prop}")`,
        );
        totalSkipped++;
        continue;
      }

      // Safety: skip if the new name drops segments from the original
      const origSegCount = tokenName.split("-").length;
      const newSegCount = newName.split("-").length;
      if (newSegCount < origSegCount - 1) {
        console.log(
          `  SKIP ${tokenName} -> ${newName} (segment count dropped from ${origSegCount} to ${newSegCount})`,
        );
        totalSkipped++;
        continue;
      }

      renames.push({ oldName: tokenName, newName, tokenData });
    }

    if (renames.length === 0) continue;

    console.log(`\n${filename}: ${renames.length} renames`);

    for (const { oldName, newName, tokenData } of renames) {
      if (dryRun) {
        console.log(`  ${oldName} -> ${newName}`);
        continue;
      }

      // Create new token entry with spec-order name
      // Copy all value-related fields, omit deprecated/renamed metadata
      const newEntry = {};
      for (const [key, value] of Object.entries(tokenData)) {
        // Copy everything except deprecated metadata
        if (!["deprecated", "deprecated_comment", "renamed"].includes(key)) {
          newEntry[key] = value;
        }
      }
      data[newName] = newEntry;

      // Mark old token as deprecated
      data[oldName].deprecated = true;
      data[oldName].deprecated_comment =
        `Renamed to spec-order name. Use \`${newName}\` instead.`;
      data[oldName].renamed = newName;

      console.log(`  ${oldName} -> ${newName}`);
    }

    totalRenames += renames.length;

    if (!dryRun && renames.length > 0) {
      // Sort keys alphabetically for consistent output
      const sorted = {};
      for (const key of Object.keys(data).sort()) {
        sorted[key] = data[key];
      }
      writeFileSync(filePath, JSON.stringify(sorted, null, 2) + "\n");
      console.log(`  Written ${filename}`);
    }
  }

  console.log(`\n=== SUMMARY ===`);
  console.log(`Total renames: ${totalRenames}`);
  console.log(`Skipped (target exists): ${totalSkipped}`);
  if (dryRun) {
    console.log("(dry run — no files modified)");
  }
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
