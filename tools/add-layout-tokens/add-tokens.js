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
import { randomUUID } from "node:crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const CSV_PATH =
  "/Users/nbaldwin/Downloads/Spectrum Semantic Tokens (synced) - Layout (1).csv";
const LAYOUT_PATH = join(__dirname, "../../packages/tokens/src/layout.json");

// Schemas
const ALIAS_SCHEMA =
  "https://opensource.adobe.com/spectrum-design-data/schemas/token-types/alias.json";
const DIMENSION_SCHEMA =
  "https://opensource.adobe.com/spectrum-design-data/schemas/token-types/dimension.json";

// Test mode - set to false to write changes
const TEST_MODE = false;
const TEST_LIMIT = 200; // All tokens

/**
 * Concise comment fragments for each taxonomy term
 * These are combined to form the full comment
 */
const COMMENT_FRAGMENTS = {
  // Structure (column F)
  structure: {
    base: "base UI elements",
    text: "text content",
    list: "list structures",
    table: "table structures",
    container: "containers",
    "drop-target": "drop targets",
    "focus-ring": "focus indicators",
    accessory: "accessory elements",
    banner: "banner components",
    tab: "tab components",
    popover: "popover components",
  },

  // Sub structure (column G)
  subStructure: {
    item: "items",
    cell: "cells",
  },

  // Property (column H)
  property: {
    gap: "spacing between child elements",
    padding: "internal spacing",
    indent: "indentation",
    "dash-length": "dash length",
    "dash-gap": "dash gap spacing",
  },

  // Orientation (column I)
  orientation: {
    horizontal: "horizontal",
    vertical: "vertical",
  },

  // Shape (column J)
  shape: {
    uniform: "uniform dimensions",
  },

  // Position (column K)
  position: {
    start: "start position",
    end: "end position",
    affixed: "affixed position",
  },

  // Size (column L)
  size: {
    "2x-small": "2x-small size",
    "extra-small": "extra-small size",
    small: "small size",
    medium: "medium size",
    large: "large size",
    "extra-large": "extra-large size",
    "2x-large": "2x-large size",
    "3x-large": "3x-large size",
    "4x-large": "4x-large size",
    regular: "regular",
    compact: "compact",
    spacious: "spacious",
  },

  // Density (column M)
  density: {
    compact: "compact density",
    regular: "regular density",
    spacious: "spacious density",
  },
};

/**
 * Generate a concise comment based on taxonomy terms
 */
function generateComment(taxonomy) {
  const {
    structure,
    subStructure,
    property,
    orientation,
    shape,
    position,
    size,
    density,
  } = taxonomy;

  const parts = [];

  // Start with property (what the token is for)
  if (property) {
    const propLower = property.toLowerCase();
    const propFragment = COMMENT_FRAGMENTS.property[propLower];
    if (propFragment) {
      parts.push(propFragment);
    }
  }

  // Add orientation if present
  if (orientation) {
    const orientLower = orientation.toLowerCase();
    const orientFragment = COMMENT_FRAGMENTS.orientation[orientLower];
    if (orientFragment) {
      // Insert before the property description or add separately
      if (parts.length > 0 && property?.toLowerCase() === "padding") {
        parts[0] = `${orientFragment} ${parts[0]}`;
      }
    }
  }

  // Add shape modifier if present
  if (shape) {
    const shapeLower = shape.toLowerCase();
    const shapeFragment = COMMENT_FRAGMENTS.shape[shapeLower];
    if (shapeFragment) {
      parts.push(`with ${shapeFragment}`);
    }
  }

  // Add structure context
  if (structure) {
    const structLower = structure.toLowerCase();
    const structFragment = COMMENT_FRAGMENTS.structure[structLower];
    if (structFragment) {
      parts.push(`for ${structFragment}`);
    }
  }

  // Add sub-structure if present
  if (subStructure) {
    const subLower = subStructure.toLowerCase();
    const subFragment = COMMENT_FRAGMENTS.subStructure[subLower];
    if (subFragment) {
      parts.push(subFragment);
    }
  }

  // Add size at the end
  if (size) {
    const sizeLower = size.toLowerCase();
    const sizeFragment = COMMENT_FRAGMENTS.size[sizeLower];
    if (sizeFragment) {
      parts.push(`at ${sizeFragment}`);
    }
  }

  // Add density if present and different from size
  if (density && density.toLowerCase() !== size?.toLowerCase()) {
    const densityLower = density.toLowerCase();
    const densityFragment = COMMENT_FRAGMENTS.density[densityLower];
    if (densityFragment) {
      parts.push(`(${densityFragment})`);
    }
  }

  // Combine parts
  let comment = parts.join(" ");

  // Capitalize first letter
  if (comment) {
    comment = comment.charAt(0).toUpperCase() + comment.slice(1);
  }

  return comment || "";
}

/**
 * Parse CSV line handling quoted fields
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
      values.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  values.push(current.trim());

  return values;
}

/**
 * Parse CSV content
 */
function parseCSV(content) {
  const lines = content.trim().split("\n");

  // Row 1 is groupings (skip)
  // Row 2 is column headers
  const headers = parseCSVLine(lines[1]);

  const records = [];
  for (let i = 2; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);

    // Skip empty rows
    if (!values[0]) continue;

    records.push({
      tokenName: values[0], // A: Generated token name
      defaultValue: values[1], // B: Default value
      aliasValue: values[2], // C: Alias value
      source: values[3], // D: Source
      tokenType: values[4], // E: Token type
      structure: values[5], // F: Structure
      subStructure: values[6], // G: Sub structure
      property: values[7], // H: Property
      orientation: values[8], // I: Orientation
      shape: values[9], // J: Shape
      position: values[10], // K: Position
      size: values[11], // L: Size
      density: values[12], // M: Density
      index: values[13], // N: Index
    });
  }

  return records;
}

/**
 * Create token object
 */
function createToken(record) {
  const hasAlias = record.aliasValue && record.aliasValue.trim();

  const token = {
    $schema: hasAlias ? ALIAS_SCHEMA : DIMENSION_SCHEMA,
    value: hasAlias ? `{${record.aliasValue}}` : record.defaultValue,
    uuid: randomUUID(),
  };

  // Generate comment from taxonomy
  const comment = generateComment({
    structure: record.structure,
    subStructure: record.subStructure,
    property: record.property,
    orientation: record.orientation,
    shape: record.shape,
    position: record.position,
    size: record.size,
    density: record.density,
  });

  if (comment) {
    token.comment = comment;
  }

  return token;
}

/**
 * Main function
 */
function main() {
  console.log("🔧 Add Layout Tokens Script");
  console.log("===========================\n");

  if (TEST_MODE) {
    console.log(`⚠️  TEST MODE: Only processing first ${TEST_LIMIT} tokens\n`);
  }

  // Read CSV
  console.log("📄 Reading CSV file...");
  const csvContent = readFileSync(CSV_PATH, "utf-8");
  const records = parseCSV(csvContent);
  console.log(`   Found ${records.length} token records in CSV\n`);

  // Read layout.json
  console.log("📄 Reading layout.json...");
  const layoutData = JSON.parse(readFileSync(LAYOUT_PATH, "utf-8"));
  const existingTokenCount = Object.keys(layoutData).length;
  console.log(`   Existing tokens: ${existingTokenCount}\n`);

  // Process tokens
  console.log("🔄 Processing tokens...\n");

  const stats = {
    added: 0,
    updated: 0,
    skippedExists: 0,
    skippedNoName: 0,
  };

  const recordsToProcess = TEST_MODE ? records.slice(0, TEST_LIMIT) : records;

  for (const record of recordsToProcess) {
    // Skip if no token name
    if (!record.tokenName) {
      stats.skippedNoName++;
      continue;
    }

    const existingToken = layoutData[record.tokenName];

    // If token exists and has uuid, skip
    if (existingToken && existingToken.uuid) {
      stats.skippedExists++;
      if (TEST_MODE) {
        console.log(`⏭️  Skipped (exists with uuid): ${record.tokenName}`);
      }
      continue;
    }

    // If token exists but missing uuid, add uuid
    if (existingToken && !existingToken.uuid) {
      existingToken.uuid = randomUUID();
      stats.updated++;
      if (TEST_MODE) {
        console.log(`🔄 Updated (added uuid): ${record.tokenName}`);
      }
      continue;
    }

    // Create and add new token
    const token = createToken(record);
    layoutData[record.tokenName] = token;
    stats.added++;

    if (TEST_MODE) {
      console.log(`✅ Added: ${record.tokenName}`);
      console.log(
        `   ${JSON.stringify(token, null, 2)
          .split("\n")
          .map((l) => "   " + l)
          .join("\n")}\n`,
      );
    }
  }

  // Write updated layout.json
  if (!TEST_MODE) {
    console.log("\n💾 Writing updated layout.json...");
    writeFileSync(LAYOUT_PATH, JSON.stringify(layoutData, null, 2) + "\n");
    console.log("   ✅ File updated successfully\n");
  } else {
    console.log(
      "\n⚠️  TEST MODE: File not written. Set TEST_MODE = false to write changes.\n",
    );
  }

  // Print summary
  console.log("📊 Summary");
  console.log("==========");
  console.log(`   Total records in CSV: ${records.length}`);
  console.log(`   Added: ${stats.added}`);
  console.log(`   Updated (added uuid): ${stats.updated}`);
  console.log(`   Skipped (already exists): ${stats.skippedExists}`);
  console.log(`   Skipped (no name): ${stats.skippedNoName}`);
  console.log(`   Final token count: ${Object.keys(layoutData).length}`);

  console.log("\n✅ Done!");
}

main();
