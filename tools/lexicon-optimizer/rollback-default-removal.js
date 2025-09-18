#!/usr/bin/env node

import { readFileSync, writeFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🔄 ROLLBACK "-default" SUFFIX REMOVAL');
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
    const newJsonData = {};

    // Process each token in the file
    for (const [tokenName, tokenDef] of Object.entries(jsonData)) {
      if (
        typeof tokenDef === "object" &&
        tokenDef !== null &&
        !tokenName.includes("$schema")
      ) {
        let newTokenName = tokenName;
        let newTokenDef = { ...tokenDef };

        // Check if token name should have "-default" added back
        // This is a heuristic - we'll add "-default" to tokens that look like they should have it
        const shouldHaveDefault =
          tokenName.includes("-color") &&
          !tokenName.includes("-hover") &&
          !tokenName.includes("-selected") &&
          !tokenName.includes("-disabled") &&
          !tokenName.includes("-focus") &&
          !tokenName.includes("-pressed") &&
          !tokenName.includes("-active") &&
          !tokenName.endsWith("-default");

        if (shouldHaveDefault) {
          newTokenName = tokenName + "-default";
          fileChanges++;
        }

        // Check if token value should reference a "-default" token
        if (
          tokenDef.value &&
          typeof tokenDef.value === "string" &&
          tokenDef.value.includes("}")
        ) {
          const oldValue = tokenDef.value;
          newTokenDef.value = tokenDef.value.replace(
            /([a-zA-Z0-9-]+)}/g,
            (match, tokenRef) => {
              // Add -default to color tokens that don't already have a state
              if (
                tokenRef.includes("-color") &&
                !tokenRef.includes("-hover") &&
                !tokenRef.includes("-selected") &&
                !tokenRef.includes("-disabled") &&
                !tokenRef.includes("-focus") &&
                !tokenRef.includes("-pressed") &&
                !tokenRef.includes("-active") &&
                !tokenRef.endsWith("-default")
              ) {
                return tokenRef + "-default}";
              }
              return match;
            },
          );

          if (oldValue !== newTokenDef.value) {
            fileChanges++;
          }
        }

        newJsonData[newTokenName] = newTokenDef;
      } else {
        // Keep non-token properties as-is
        newJsonData[tokenName] = tokenDef;
      }
    }

    if (fileChanges > 0) {
      // Write the updated file
      writeFileSync(
        filePath,
        JSON.stringify(newJsonData, null, 2) + "\n",
        "utf8",
      );
      console.log(`✅ ${file}: ${fileChanges} changes rolled back`);
      totalChanges += fileChanges;
      filesChanged++;
    }
  } catch (error) {
    console.error(`❌ Error processing ${file}:`, error.message);
  }
}

console.log("\n📊 SUMMARY");
console.log("-".repeat(40));
console.log(`Files changed: ${filesChanged}`);
console.log(`Total changes rolled back: ${totalChanges}`);

if (totalChanges > 0) {
  console.log("\n✅ Rollback complete!");
  console.log('\n🎯 The "-default" suffixes have been restored');
} else {
  console.log("\n✅ No rollback needed - no changes to revert");
}

console.log(
  '\n⚠️  NOTE: This rollback script uses heuristics to determine which tokens should have "-default"',
);
console.log("   You may need to manually review and adjust some tokens");
