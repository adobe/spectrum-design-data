#!/usr/bin/env node

import { readFileSync, writeFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🔧 REMOVING "-default" SUFFIX EXPERIMENT');
console.log("=".repeat(60));

// Token files to process
const tokensPath = join(__dirname, "../../packages/tokens/src");
const tokenFiles = readdirSync(tokensPath).filter((file) =>
  file.endsWith(".json"),
);

console.log(`📁 Processing ${tokenFiles.length} token files...`);

let totalChanges = 0;
let filesChanged = 0;

for (const file of tokenFiles) {
  try {
    const filePath = join(tokensPath, file);
    const fileContent = readFileSync(filePath, "utf8");
    const jsonData = JSON.parse(fileContent);

    let fileChanges = 0;
    const changes = [];

    // Process each token in the file
    for (const [tokenName, tokenDef] of Object.entries(jsonData)) {
      if (
        typeof tokenDef === "object" &&
        tokenDef !== null &&
        !tokenName.includes("$schema")
      ) {
        // Check if token name ends with "-default"
        if (tokenName.endsWith("-default")) {
          const newTokenName = tokenName.replace("-default", "");
          changes.push({
            oldName: tokenName,
            newName: newTokenName,
            definition: tokenDef,
          });
          fileChanges++;
        }

        // Check if token value references a "-default" token
        if (
          tokenDef.value &&
          typeof tokenDef.value === "string" &&
          tokenDef.value.includes("-default}")
        ) {
          const newValue = tokenDef.value.replace(/-default}/g, "}");
          changes.push({
            oldName: tokenName,
            newName: tokenName,
            oldValue: tokenDef.value,
            newValue: newValue,
            definition: tokenDef,
          });
          fileChanges++;
        }
      }
    }

    if (fileChanges > 0) {
      console.log(`\n📝 ${file}: ${fileChanges} changes needed`);

      // Show first few changes as examples
      changes.slice(0, 3).forEach((change) => {
        if (change.oldName !== change.newName) {
          console.log(`  Token: "${change.oldName}" → "${change.newName}"`);
        }
        if (change.oldValue && change.newValue) {
          console.log(`  Value: "${change.oldValue}" → "${change.newValue}"`);
        }
      });

      if (changes.length > 3) {
        console.log(`  ... and ${changes.length - 3} more changes`);
      }

      totalChanges += fileChanges;
      filesChanged++;
    }
  } catch (error) {
    console.warn(`⚠️  Warning: Could not process ${file}:`, error.message);
  }
}

console.log("\n📊 SUMMARY");
console.log("-".repeat(40));
console.log(`Files with changes: ${filesChanged}`);
console.log(`Total changes needed: ${totalChanges}`);
console.log(`Token files processed: ${tokenFiles.length}`);

if (totalChanges > 0) {
  console.log("\n💡 NEXT STEPS:");
  console.log("1. Review the changes above");
  console.log("2. Run the actual transformation script");
  console.log("3. Test that all references work");
  console.log("4. Commit the changes to this branch");
} else {
  console.log('\n✅ No "-default" suffixes found to remove');
}

console.log("\n🎯 To proceed with the transformation, run:");
console.log("node tools/lexicon-optimizer/apply-default-removal.js");
