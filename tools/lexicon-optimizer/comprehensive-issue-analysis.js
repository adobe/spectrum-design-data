#!/usr/bin/env node

import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load both reports
const componentReport = JSON.parse(
  readFileSync("detailed-analysis.json", "utf8"),
);
const tokenReport = JSON.parse(readFileSync("tokens-only.json", "utf8"));

console.log("🔍 COMPREHENSIVE ISSUE ANALYSIS");
console.log("=".repeat(60));

// 1. Component Property Analysis
console.log("\n📝 COMPONENT PROPERTY ANALYSIS");
console.log("-".repeat(40));

const propertyNames = componentReport.lexicon.propertyNames;
const sortedProperties = Object.entries(propertyNames).sort(
  (a, b) => b[1] - a[1],
);

console.log("Most common property names:");
sortedProperties.slice(0, 15).forEach(([prop, count]) => {
  console.log(`  "${prop}" - ${count} occurrences`);
});

// Look for potential typos in component properties
console.log("\n🔍 Potential typos in component properties:");
const potentialTypos = [];
for (let i = 0; i < sortedProperties.length; i++) {
  for (let j = i + 1; j < sortedProperties.length; j++) {
    const [prop1, count1] = sortedProperties[i];
    const [prop2, count2] = sortedProperties[j];

    const similarity = calculateSimilarity(prop1, prop2);
    if (
      similarity > 0.7 &&
      similarity < 1.0 &&
      Math.abs(prop1.length - prop2.length) <= 2
    ) {
      potentialTypos.push({
        prop1,
        count1,
        prop2,
        count2,
        similarity,
      });
    }
  }
}

if (potentialTypos.length > 0) {
  potentialTypos.slice(0, 10).forEach((typo) => {
    console.log(
      `  "${typo.prop1}" (${typo.count1}) vs "${typo.prop2}" (${typo.count2}) - ${Math.round(typo.similarity * 100)}% similar`,
    );
  });
} else {
  console.log("  ✅ No obvious typos found in component properties");
}

// 2. Token Segment Analysis
console.log("\n🔤 TOKEN SEGMENT ANALYSIS");
console.log("-".repeat(40));

const segments = tokenReport.lexicon.segments;
console.log(`Total unique segments: ${segments.length}`);

// Look for potential typos in token segments
console.log("\n🔍 Potential typos in token segments:");
const segmentTypos = [];
for (let i = 0; i < segments.length; i++) {
  for (let j = i + 1; j < segments.length; j++) {
    const seg1 = segments[i];
    const seg2 = segments[j];

    const similarity = calculateSimilarity(seg1, seg2);
    if (
      similarity > 0.7 &&
      similarity < 1.0 &&
      Math.abs(seg1.length - seg2.length) <= 2
    ) {
      segmentTypos.push({ seg1, seg2, similarity });
    }
  }
}

if (segmentTypos.length > 0) {
  segmentTypos.slice(0, 15).forEach((typo) => {
    console.log(
      `  "${typo.seg1}" vs "${typo.seg2}" - ${Math.round(typo.similarity * 100)}% similar`,
    );
  });
} else {
  console.log("  ✅ No obvious typos found in token segments");
}

// 3. Specific Token Issues
console.log("\n🎨 SPECIFIC TOKEN ISSUES");
console.log("-".repeat(40));

// Look for tokens with unusual patterns
const problematicTokens = [];
const allTokens = [];

// Collect all token names from patterns
Object.entries(tokenReport.patterns).forEach(([pattern, tokens]) => {
  if (tokens && Array.isArray(tokens)) {
    tokens.forEach((token) => {
      if (token.tokenName) {
        allTokens.push(token.tokenName);
      }
    });
  }
});

// Check for problematic patterns
allTokens.forEach((tokenName) => {
  if (tokenName.includes("--")) {
    problematicTokens.push({
      token: tokenName,
      issue: "Contains double separators",
    });
  }
  if (tokenName.startsWith("-") || tokenName.endsWith("-")) {
    problematicTokens.push({
      token: tokenName,
      issue: "Starts or ends with separator",
    });
  }
  if (tokenName.includes(" ")) {
    problematicTokens.push({ token: tokenName, issue: "Contains spaces" });
  }
  if (tokenName.match(/[A-Z]/)) {
    problematicTokens.push({
      token: tokenName,
      issue: "Contains uppercase letters",
    });
  }
});

if (problematicTokens.length > 0) {
  console.log("Tokens with potential formatting issues:");
  problematicTokens.slice(0, 10).forEach((issue) => {
    console.log(`  "${issue.token}" - ${issue.issue}`);
  });
} else {
  console.log("  ✅ No obvious token formatting issues found");
}

// 4. Inconsistent Naming Patterns
console.log("\n🎯 NAMING PATTERN INCONSISTENCIES");
console.log("-".repeat(40));

// Group properties by pattern
const patterns = {};
Object.keys(propertyNames).forEach((prop) => {
  const pattern = getNamingPattern(prop);
  if (!patterns[pattern]) patterns[pattern] = [];
  patterns[pattern].push(prop);
});

// Find patterns with inconsistencies
Object.entries(patterns).forEach(([pattern, props]) => {
  if (props.length > 1) {
    const variations = [...new Set(props.map((p) => p.toLowerCase()))];
    if (variations.length > 1) {
      console.log(`Pattern "${pattern}":`);
      variations.forEach((variation) => {
        const count = props.filter((p) => p.toLowerCase() === variation).length;
        console.log(`  - "${variation}" (${count} occurrences)`);
      });
    }
  }
});

// 5. Enum Value Analysis
console.log("\n📋 ENUM VALUE ANALYSIS");
console.log("-".repeat(40));

const enumValues = componentReport.lexicon.enumValues;
const sortedEnums = Object.entries(enumValues).sort((a, b) => b[1] - a[1]);

console.log("Most common enum values:");
sortedEnums.slice(0, 15).forEach(([value, count]) => {
  console.log(`  "${value}" - ${count} occurrences`);
});

// Look for potential typos in enum values
console.log("\n🔍 Potential typos in enum values:");
const enumTypos = [];
for (let i = 0; i < sortedEnums.length; i++) {
  for (let j = i + 1; j < sortedEnums.length; j++) {
    const [value1, count1] = sortedEnums[i];
    const [value2, count2] = sortedEnums[j];

    const similarity = calculateSimilarity(value1, value2);
    if (
      similarity > 0.7 &&
      similarity < 1.0 &&
      Math.abs(value1.length - value2.length) <= 2
    ) {
      enumTypos.push({
        value1,
        count1,
        value2,
        count2,
        similarity,
      });
    }
  }
}

if (enumTypos.length > 0) {
  enumTypos.slice(0, 10).forEach((typo) => {
    console.log(
      `  "${typo.value1}" (${typo.count1}) vs "${typo.value2}" (${typo.count2}) - ${Math.round(typo.similarity * 100)}% similar`,
    );
  });
} else {
  console.log("  ✅ No obvious typos found in enum values");
}

// 6. Summary
console.log("\n📊 SUMMARY");
console.log("-".repeat(40));
console.log(
  `Component properties analyzed: ${Object.keys(propertyNames).length}`,
);
console.log(`Token segments analyzed: ${segments.length}`);
console.log(`Potential property typos: ${potentialTypos.length}`);
console.log(`Potential segment typos: ${segmentTypos.length}`);
console.log(`Potential enum typos: ${enumTypos.length}`);
console.log(`Problematic tokens: ${problematicTokens.length}`);

// Helper functions
function calculateSimilarity(str1, str2) {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;

  if (longer.length === 0) return 1.0;

  const distance = levenshteinDistance(longer, shorter);
  return (longer.length - distance) / longer.length;
}

function levenshteinDistance(str1, str2) {
  const matrix = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1,
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}

function getNamingPattern(prop) {
  if (prop.startsWith("is")) return "boolean";
  if (prop.startsWith("has")) return "boolean";
  if (prop.startsWith("can")) return "boolean";
  if (prop.endsWith("Size")) return "size";
  if (prop.endsWith("Color")) return "color";
  if (prop.endsWith("Width")) return "dimension";
  if (prop.endsWith("Height")) return "dimension";
  if (prop.endsWith("Gap")) return "spacing";
  if (prop.endsWith("Padding")) return "spacing";
  if (prop.endsWith("Margin")) return "spacing";
  return "other";
}

console.log("\n✅ Analysis complete!");
