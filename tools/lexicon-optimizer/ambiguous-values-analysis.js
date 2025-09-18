#!/usr/bin/env node

import { readFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log("🔍 AMBIGUOUS VALUES ANALYSIS");
console.log("=".repeat(60));

// Ambiguous terms that should be avoided without component context
const ambiguousTerms = [
  "default",
  "normal",
  "regular",
  "standard",
  "basic",
  "simple",
  "primary",
  "secondary",
  "tertiary",
  "small",
  "medium",
  "large",
  "extra",
  "base",
  "main",
  "core",
  "common",
  "typical",
  "usual",
  "standard",
];

// Load all token files
const tokensPath = join(__dirname, "../../packages/tokens/src");
const tokenFiles = readdirSync(tokensPath).filter((file) =>
  file.endsWith(".json"),
);

console.log(`\n📁 Analyzing ${tokenFiles.length} token files...`);

const ambiguousTokens = [];
const componentTokens = [];
const allTokens = [];

for (const file of tokenFiles) {
  try {
    const filePath = join(tokensPath, file);
    const fileContent = readFileSync(filePath, "utf8");
    const jsonData = JSON.parse(fileContent);
    const category = file.replace(".json", "");

    // Extract all token names and their definitions
    for (const [tokenName, tokenDef] of Object.entries(jsonData)) {
      if (
        typeof tokenDef === "object" &&
        tokenDef !== null &&
        !tokenName.includes("$schema")
      ) {
        allTokens.push({
          name: tokenName,
          category: category,
          definition: tokenDef,
          hasComponent: !!tokenDef.component,
        });

        // Check if token has component property
        if (tokenDef.component) {
          componentTokens.push({
            name: tokenName,
            category: category,
            component: tokenDef.component,
            definition: tokenDef,
          });
        }
      }
    }
  } catch (error) {
    console.warn(`Warning: Could not load token file ${file}:`, error.message);
  }
}

console.log(`\n📊 Found ${allTokens.length} total tokens`);
console.log(`📊 Found ${componentTokens.length} component-specific tokens`);

// Analyze tokens for ambiguous values
console.log("\n🔍 ANALYZING FOR AMBIGUOUS VALUES");
console.log("-".repeat(50));

const ambiguousPatterns = {};

allTokens.forEach((token) => {
  const tokenName = token.name;
  const segments = tokenName.split("-");

  // Check each segment for ambiguous terms
  segments.forEach((segment, index) => {
    if (ambiguousTerms.includes(segment.toLowerCase())) {
      const context = {
        tokenName: tokenName,
        category: token.category,
        ambiguousSegment: segment,
        position: index,
        totalSegments: segments.length,
        hasComponent: token.hasComponent,
        component: token.definition.component || null,
        isLastSegment: index === segments.length - 1,
        isFirstSegment: index === 0,
        surroundingSegments: {
          before: index > 0 ? segments[index - 1] : null,
          after: index < segments.length - 1 ? segments[index + 1] : null,
        },
      };

      if (!ambiguousPatterns[segment]) {
        ambiguousPatterns[segment] = [];
      }
      ambiguousPatterns[segment].push(context);
    }
  });
});

// Report findings
console.log("\n🚨 AMBIGUOUS VALUES FOUND");
console.log("=".repeat(50));

Object.entries(ambiguousPatterns)
  .sort((a, b) => b[1].length - a[1].length)
  .forEach(([term, tokens]) => {
    console.log(`\n📝 "${term}" - ${tokens.length} occurrences`);
    console.log("-".repeat(30));

    // Group by severity
    const highRisk = tokens.filter(
      (t) =>
        t.isLastSegment || // At the end of token name
        (!t.hasComponent && t.position === 0) || // No component context and at start
        (t.surroundingSegments.before && t.surroundingSegments.after), // Surrounded by other terms
    );

    const mediumRisk = tokens.filter(
      (t) => t.hasComponent && t.position > 0 && !t.isLastSegment,
    );

    const lowRisk = tokens.filter(
      (t) => t.hasComponent && t.position === 0, // Component context at start
    );

    if (highRisk.length > 0) {
      console.log(`  🔴 HIGH RISK (${highRisk.length}):`);
      highRisk.slice(0, 5).forEach((token) => {
        console.log(`    "${token.tokenName}" (${token.category})`);
        if (token.component) {
          console.log(`      Component: ${token.component}`);
        }
      });
      if (highRisk.length > 5) {
        console.log(`    ... and ${highRisk.length - 5} more`);
      }
    }

    if (mediumRisk.length > 0) {
      console.log(`  🟡 MEDIUM RISK (${mediumRisk.length}):`);
      mediumRisk.slice(0, 3).forEach((token) => {
        console.log(`    "${token.tokenName}" (${token.category})`);
        console.log(`      Component: ${token.component}`);
      });
      if (mediumRisk.length > 3) {
        console.log(`    ... and ${mediumRisk.length - 3} more`);
      }
    }

    if (lowRisk.length > 0) {
      console.log(`  🟢 LOW RISK (${lowRisk.length}):`);
      lowRisk.slice(0, 3).forEach((token) => {
        console.log(`    "${token.tokenName}" (${token.category})`);
        console.log(`      Component: ${token.component}`);
      });
      if (lowRisk.length > 3) {
        console.log(`    ... and ${lowRisk.length - 3} more`);
      }
    }
  });

// Summary statistics
console.log("\n📊 SUMMARY STATISTICS");
console.log("=".repeat(50));

const totalAmbiguous = Object.values(ambiguousPatterns).flat().length;
const highRiskCount = Object.values(ambiguousPatterns)
  .flat()
  .filter(
    (t) =>
      t.isLastSegment ||
      (!t.hasComponent && t.position === 0) ||
      (t.surroundingSegments.before && t.surroundingSegments.after),
  ).length;
const mediumRiskCount = Object.values(ambiguousPatterns)
  .flat()
  .filter((t) => t.hasComponent && t.position > 0 && !t.isLastSegment).length;
const lowRiskCount = Object.values(ambiguousPatterns)
  .flat()
  .filter((t) => t.hasComponent && t.position === 0).length;

console.log(`Total ambiguous occurrences: ${totalAmbiguous}`);
console.log(`High risk (unclear context): ${highRiskCount}`);
console.log(`Medium risk (some context): ${mediumRiskCount}`);
console.log(`Low risk (clear component context): ${lowRiskCount}`);

// Recommendations
console.log("\n💡 RECOMMENDATIONS");
console.log("=".repeat(50));

console.log("1. HIGH PRIORITY FIXES:");
console.log("   - Remove ambiguous terms from end of token names");
console.log("   - Add component context to tokens without component property");
console.log("   - Replace generic terms with specific property names");

console.log("\n2. MEDIUM PRIORITY FIXES:");
console.log("   - Review component-specific tokens for clarity");
console.log("   - Consider if ambiguous terms add value");

console.log("\n3. LOW PRIORITY:");
console.log("   - These tokens have clear component context");

console.log("\n4. GENERAL GUIDELINES:");
console.log('   - Use specific property names instead of "default"');
console.log("   - Include component context in token names");
console.log("   - Prefer explicit over implicit naming");

console.log("\n✅ Analysis complete!");
