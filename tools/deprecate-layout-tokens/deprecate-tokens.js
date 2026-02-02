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

import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const CSV_PATH =
  "/Users/nbaldwin/Downloads/Spectrum Semantic Tokens (synced) - Layout [mapping] (2).csv";
const LAYOUT_COMPONENT_PATH = join(
  __dirname,
  "../../packages/tokens/src/layout-component.json",
);
const LAYOUT_PATH = join(__dirname, "../../packages/tokens/src/layout.json");

// Test mode - set to false to process all tokens
const TEST_MODE = false;
const TEST_LIMIT = 1000; // Not used when TEST_MODE is false

/**
 * Parse CSV content into array of objects
 */
function parseCSV(content) {
  const lines = content.trim().split("\n");
  const headers = lines[0].split(",");

  const records = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    // Handle CSV with commas inside quoted fields
    const values = parseCSVLine(line);

    records.push({
      existingToken: values[0]?.trim() || "",
      defaultValue: values[1]?.trim() || "",
      replacementToken: values[2]?.trim() || "",
      value: values[3]?.trim() || "",
      diff: values[4]?.trim() || "",
      notes: values[5]?.trim() || "",
    });
  }

  return records;
}

/**
 * Parse a single CSV line, handling quoted fields with commas
 */
function parseCSVLine(line) {
  const values = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      values.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  values.push(current); // Don't forget the last field

  return values;
}

/**
 * Create deprecation fields for a token
 * Returns an object with: deprecated, deprecated_comment, and optionally renamed
 */
function createDeprecationFields(replacementToken, notes) {
  const isDeprecateOnly = replacementToken.toUpperCase() === "DEPRECATE";

  const fields = {
    deprecated: true,
    deprecated_comment: isDeprecateOnly
      ? notes
      : notes
        ? `Use semantic token ${replacementToken} instead. ${notes}`
        : `Use semantic token ${replacementToken} instead.`,
  };

  // Only add renamed if there's an actual replacement token
  if (!isDeprecateOnly) {
    fields.renamed = replacementToken;
  }

  return fields;
}

/**
 * Process tokens and update JSON files
 */
function processTokens(
  records,
  layoutComponentData,
  layoutData,
  testMode = false,
) {
  const stats = {
    processed: 0,
    skippedNoChange: 0,
    updatedInLayoutComponent: 0,
    updatedInLayout: 0,
    notFoundInEitherFile: [],
    shownDeprecateExample: false,
  };

  const recordsToProcess = testMode ? records.slice(0, TEST_LIMIT) : records;

  for (const record of recordsToProcess) {
    const { existingToken, replacementToken, notes } = record;

    // Skip if no token name
    if (!existingToken) continue;

    // Skip if "NO CHANGE"
    if (replacementToken.toUpperCase() === "NO CHANGE") {
      stats.skippedNoChange++;
      continue;
    }

    stats.processed++;

    // Create deprecation fields
    const deprecationFields = createDeprecationFields(replacementToken, notes);

    let foundInAnyFile = false;

    // Check layout-component.json
    if (layoutComponentData[existingToken]) {
      // Add flat deprecation keys directly to token
      Object.assign(layoutComponentData[existingToken], deprecationFields);
      stats.updatedInLayoutComponent++;
      foundInAnyFile = true;
      if (testMode) {
        const isDeprecateOnly = replacementToken.toUpperCase() === "DEPRECATE";
        console.log(
          `✅ Updated in layout-component.json: ${existingToken}${isDeprecateOnly ? " [DEPRECATE]" : ""}`,
        );
        // Print first deprecation fields for verification, and first DEPRECATE case
        if (
          stats.updatedInLayoutComponent === 1 ||
          (isDeprecateOnly && !stats.shownDeprecateExample)
        ) {
          stats.shownDeprecateExample =
            stats.shownDeprecateExample || isDeprecateOnly;
          console.log(
            `   ${isDeprecateOnly ? "DEPRECATE" : "Standard"} deprecation fields:`,
          );
          console.log(
            JSON.stringify(deprecationFields, null, 4)
              .split("\n")
              .map((l) => "   " + l)
              .join("\n"),
          );
        }
      }
    }

    // Check layout.json
    if (layoutData[existingToken]) {
      // Add flat deprecation keys directly to token
      Object.assign(layoutData[existingToken], deprecationFields);
      stats.updatedInLayout++;
      foundInAnyFile = true;
      if (testMode) {
        console.log(`✅ Updated in layout.json: ${existingToken}`);
      }
    }

    if (!foundInAnyFile) {
      stats.notFoundInEitherFile.push(existingToken);
      if (testMode) {
        console.log(`⚠️  Not found in either file: ${existingToken}`);
      }
    }
  }

  return stats;
}

/**
 * Main function
 */
function main() {
  console.log("🔧 Token Deprecation Script");
  console.log("===========================\n");

  if (TEST_MODE) {
    console.log(`⚠️  TEST MODE: Only processing first ${TEST_LIMIT} tokens\n`);
  }

  // Read CSV
  console.log("📄 Reading CSV file...");
  const csvContent = readFileSync(CSV_PATH, "utf-8");
  const records = parseCSV(csvContent);
  console.log(`   Found ${records.length} records in CSV\n`);

  // Read JSON files
  console.log("📄 Reading JSON files...");
  const layoutComponentData = JSON.parse(
    readFileSync(LAYOUT_COMPONENT_PATH, "utf-8"),
  );
  const layoutData = JSON.parse(readFileSync(LAYOUT_PATH, "utf-8"));
  console.log(
    `   layout-component.json: ${Object.keys(layoutComponentData).length} tokens`,
  );
  console.log(`   layout.json: ${Object.keys(layoutData).length} tokens\n`);

  // Process tokens
  console.log("🔄 Processing tokens...\n");
  const stats = processTokens(
    records,
    layoutComponentData,
    layoutData,
    TEST_MODE,
  );

  // Write updated JSON files (only if not in test mode, or if we want to test writing)
  if (!TEST_MODE) {
    console.log("\n💾 Writing updated JSON files...");
    writeFileSync(
      LAYOUT_COMPONENT_PATH,
      JSON.stringify(layoutComponentData, null, 2) + "\n",
    );
    writeFileSync(LAYOUT_PATH, JSON.stringify(layoutData, null, 2) + "\n");
    console.log("   ✅ Files updated successfully\n");
  } else {
    console.log(
      "\n⚠️  TEST MODE: Files not written. Set TEST_MODE = false to write changes.\n",
    );
  }

  // Print summary
  console.log("📊 Summary");
  console.log("==========");
  console.log(`   Total records in CSV: ${records.length}`);
  console.log(`   Processed: ${stats.processed}`);
  console.log(`   Skipped (NO CHANGE): ${stats.skippedNoChange}`);
  console.log(
    `   Updated in layout-component.json: ${stats.updatedInLayoutComponent}`,
  );
  console.log(`   Updated in layout.json: ${stats.updatedInLayout}`);
  console.log(
    `   Not found in either file: ${stats.notFoundInEitherFile.length}`,
  );

  if (stats.notFoundInEitherFile.length > 0) {
    console.log("\n⚠️  Tokens not found in source files:");
    stats.notFoundInEitherFile.forEach((token) => {
      console.log(`      - ${token}`);
    });
  }

  console.log("\n✅ Done!");
}

main();
