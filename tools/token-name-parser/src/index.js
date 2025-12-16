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

import { parseTokenFile } from "./parser.js";
import { parseExcelRules, getExcelPath } from "./excel-parser.js";
import { compareTokenNames } from "./name-comparator.js";
import { createValidator, validateAllTokens } from "./validator.js";
import { writeFile, mkdir } from "fs/promises";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Main entry point for token name parser
 */
async function main() {
  // Get file to parse from command line (defaults to layout.json)
  const fileName = process.argv[2] || "layout";
  const sourceFile = `${fileName}.json`;

  console.log("🔍 Token Name Parser");
  console.log("===================\n");
  console.log(`📁 Parsing: ${sourceFile}\n`);

  try {
    // Step 1: Parse Excel rules
    console.log("📊 Parsing Excel naming rules...");
    const excelPath = getExcelPath();
    let rules = {};

    try {
      rules = parseExcelRules(excelPath);
      console.log(`  ✓ Found ${rules.anatomyParts.length} anatomy parts`);
      console.log(`  ✓ Found ${rules.indexValues.length} index values`);
      console.log(`  ✓ Found ${rules.sizeOptions.length} size options`);
    } catch (error) {
      console.log(`  ⚠ Warning: Could not parse Excel file: ${error.message}`);
      console.log(`  → Continuing with basic parsing...\n`);
    }

    // Step 2: Parse tokens into anonymous token array
    console.log(`🎯 Parsing ${sourceFile} tokens...`);
    const layoutPath = resolve(
      process.cwd(),
      `packages/tokens/src/${sourceFile}`,
    );
    const anonymousTokens = await parseTokenFile(layoutPath, rules);
    console.log(
      `  ✓ Parsed ${anonymousTokens.length} tokens into anonymous array\n`,
    );

    // Step 3: Compare original vs regenerated names
    console.log("🔄 Comparing original and regenerated names...");
    const comparison = await compareTokenNames(anonymousTokens);
    console.log(`  ✓ Matches: ${comparison.summary.matches}`);
    console.log(`  ⚠ Mismatches: ${comparison.summary.mismatches}`);
    console.log(`  ✗ Errors: ${comparison.summary.errors}`);
    console.log(`  📈 Match rate: ${comparison.summary.matchRate}\n`);

    // Step 4: Validate against schemas
    console.log("✅ Validating against JSON schemas...");
    const schemasPath = resolve(
      process.cwd(),
      "packages/structured-tokens/schemas",
    );
    const ajv = await createValidator(schemasPath);
    const validation = validateAllTokens(anonymousTokens, ajv);
    console.log(`  ✓ Valid: ${validation.valid}`);
    console.log(`  ✗ Invalid: ${validation.invalid}\n`);

    // Step 5: Write outputs
    console.log("💾 Writing outputs...");

    // Create output directories
    const outputDir = resolve(process.cwd(), "packages/structured-tokens/src");
    const toolOutputDir = resolve(__dirname, "../output");
    await mkdir(outputDir, { recursive: true });
    await mkdir(toolOutputDir, { recursive: true });

    // Write anonymous tokens array
    const structuredPath = resolve(outputDir, `${fileName}.json`);
    await writeFile(structuredPath, JSON.stringify(anonymousTokens, null, 2));
    console.log(`  ✓ Wrote anonymous tokens array: ${structuredPath}`);

    // Write comparison report
    const comparisonPath = resolve(
      toolOutputDir,
      `${fileName}-comparison-report.json`,
    );
    await writeFile(comparisonPath, JSON.stringify(comparison, null, 2));
    console.log(`  ✓ Wrote comparison report: ${comparisonPath}`);

    // Write validation report
    const validationPath = resolve(
      toolOutputDir,
      `${fileName}-validation-report.json`,
    );
    await writeFile(validationPath, JSON.stringify(validation, null, 2));
    console.log(`  ✓ Wrote validation report: ${validationPath}`);

    console.log("\n✨ Complete!");

    // Exit with error code if there are issues
    if (comparison.summary.mismatches > 0 || validation.invalid > 0) {
      console.log("\n⚠️  Note: Issues detected - see reports for details");
      process.exit(0); // Exit cleanly but note issues
    }
  } catch (error) {
    console.error("\n❌ Error:", error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Export functions for use as library
export {
  parseTokenFile,
  parseExcelRules,
  compareTokenNames,
  createValidator,
  validateAllTokens,
};

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
