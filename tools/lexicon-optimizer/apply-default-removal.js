#!/usr/bin/env node

import { readFileSync, writeFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🔧 APPLYING "-default" SUFFIX REMOVAL');
console.log("=".repeat(60));

// Token files to process
const tokensPath = join(__dirname, "../../packages/tokens/src");
const tokenFiles = readdirSync(tokensPath).filter((file) =>
  file.endsWith(".json"),
);

console.log(`📁 Processing ${tokenFiles.length} token files...`);

let totalChanges = 0;
let filesChanged = 0;
const changesLog = [];

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

        // Check if token name ends with "-default"
        if (tokenName.endsWith("-default")) {
          newTokenName = tokenName.replace("-default", "");
          changesLog.push({
            file: file,
            type: "token-rename",
            oldName: tokenName,
            newName: newTokenName,
          });
          fileChanges++;
        }

        // Check if token value references a "-default" token
        if (
          tokenDef.value &&
          typeof tokenDef.value === "string" &&
          tokenDef.value.includes("-default}")
        ) {
          const oldValue = tokenDef.value;
          newTokenDef.value = tokenDef.value.replace(/-default}/g, "}");
          changesLog.push({
            file: file,
            type: "value-update",
            tokenName: newTokenName,
            oldValue: oldValue,
            newValue: newTokenDef.value,
          });
          fileChanges++;
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
      console.log(`✅ ${file}: ${fileChanges} changes applied`);
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
console.log(`Total changes applied: ${totalChanges}`);

if (totalChanges > 0) {
  console.log("\n📝 CHANGES LOG:");
  console.log("-".repeat(40));

  // Group changes by type
  const tokenRenames = changesLog.filter((c) => c.type === "token-rename");
  const valueUpdates = changesLog.filter((c) => c.type === "value-update");

  if (tokenRenames.length > 0) {
    console.log(`\n🔄 Token renames (${tokenRenames.length}):`);
    tokenRenames.slice(0, 10).forEach((change) => {
      console.log(
        `  ${change.file}: "${change.oldName}" → "${change.newName}"`,
      );
    });
    if (tokenRenames.length > 10) {
      console.log(`  ... and ${tokenRenames.length - 10} more`);
    }
  }

  if (valueUpdates.length > 0) {
    console.log(`\n🔗 Value updates (${valueUpdates.length}):`);
    valueUpdates.slice(0, 10).forEach((change) => {
      console.log(`  ${change.file}: "${change.tokenName}"`);
      console.log(`    "${change.oldValue}" → "${change.newValue}"`);
    });
    if (valueUpdates.length > 10) {
      console.log(`  ... and ${valueUpdates.length - 10} more`);
    }
  }

  console.log("\n✅ Transformation complete!");
  console.log("\n🎯 NEXT STEPS:");
  console.log("1. Test that all references work correctly");
  console.log("2. Run your build process to verify");
  console.log(
    '3. Commit the changes: git add . && git commit -m "feat: remove -default suffix from token names"',
  );
  console.log("4. Test the changes thoroughly before merging");
} else {
  console.log('\n✅ No changes needed - no "-default" suffixes found');
}
