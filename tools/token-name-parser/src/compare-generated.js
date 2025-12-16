#!/usr/bin/env node

/*
Copyright 2025 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

import { generateTokenFile } from "./token-generator.js";
import { readFile, writeFile, mkdir } from "fs/promises";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { detailedDiff } from "deep-object-diff";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  console.log("🔄 Generating layout.json from structured tokens...\n");

  try {
    // Paths
    const structuredPath = resolve(
      process.cwd(),
      "packages/structured-tokens/src/layout.json",
    );
    const originalPath = resolve(
      process.cwd(),
      "packages/tokens/src/layout.json",
    );
    const outputDir = resolve(__dirname, "../output");
    const generatedPath = resolve(outputDir, "generated-layout.json");
    const diffPath = resolve(outputDir, "layout-diff.json");

    await mkdir(outputDir, { recursive: true });

    // Generate from structured tokens
    console.log("📝 Generating tokens...");
    const stats = await generateTokenFile(structuredPath, generatedPath);
    console.log(`  ✓ Generated ${stats.totalTokens} tokens`);
    console.log(`  ✓ Written to: ${generatedPath}\n`);

    // Load both files for comparison
    console.log("🔍 Comparing with original...");
    const originalContent = await readFile(originalPath, "utf8");
    const generatedContent = await readFile(generatedPath, "utf8");

    const original = JSON.parse(originalContent);
    const generated = JSON.parse(generatedContent);

    // Deep comparison
    const diff = detailedDiff(original, generated);

    // Count differences
    const addedCount = Object.keys(diff.added || {}).length;
    const deletedCount = Object.keys(diff.deleted || {}).length;
    const updatedCount = Object.keys(diff.updated || {}).length;

    console.log(`  Original tokens: ${Object.keys(original).length}`);
    console.log(`  Generated tokens: ${Object.keys(generated).length}`);
    console.log(`  Added: ${addedCount}`);
    console.log(`  Deleted: ${deletedCount}`);
    console.log(`  Updated: ${updatedCount}\n`);

    // Save diff
    await writeFile(diffPath, JSON.stringify(diff, null, 2));
    console.log(`  ✓ Diff saved to: ${diffPath}\n`);

    // Check for perfect match
    if (addedCount === 0 && deletedCount === 0 && updatedCount === 0) {
      console.log(
        "✅ Perfect match! Generated tokens are identical to original.\n",
      );
      return;
    }

    // Show some differences
    if (deletedCount > 0) {
      console.log("❌ Deleted (in original but not generated):");
      const deletedKeys = Object.keys(diff.deleted);
      deletedKeys.slice(0, 5).forEach((key) => {
        console.log(`  - ${key}`);
      });
      if (deletedKeys.length > 5) {
        console.log(`  ... and ${deletedKeys.length - 5} more`);
      }
      console.log();
    }

    if (addedCount > 0) {
      console.log("➕ Added (in generated but not original):");
      const addedKeys = Object.keys(diff.added);
      addedKeys.slice(0, 5).forEach((key) => {
        console.log(`  + ${key}`);
      });
      if (addedKeys.length > 5) {
        console.log(`  ... and ${addedKeys.length - 5} more`);
      }
      console.log();
    }

    if (updatedCount > 0) {
      console.log("🔄 Updated (different values):");
      const updatedKeys = Object.keys(diff.updated);
      updatedKeys.slice(0, 3).forEach((key) => {
        console.log(`  ~ ${key}`);
        console.log(
          `    Original:  ${JSON.stringify(original[key], null, 2).slice(0, 100)}...`,
        );
        console.log(
          `    Generated: ${JSON.stringify(generated[key], null, 2).slice(0, 100)}...`,
        );
      });
      if (updatedKeys.length > 3) {
        console.log(`  ... and ${updatedKeys.length - 3} more`);
      }
      console.log();
    }

    console.log("💡 See full diff in:", diffPath);
  } catch (error) {
    console.error("\n❌ Error:", error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
