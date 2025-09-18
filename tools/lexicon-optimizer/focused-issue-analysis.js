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

console.log("🔍 FOCUSED ISSUE ANALYSIS");
console.log("=".repeat(60));

// 1. Component Property Analysis
console.log("\n📝 COMPONENT PROPERTY ANALYSIS");
console.log("-".repeat(40));

const propertyNames = componentReport.lexicon.propertyNames;
const sortedProperties = Object.entries(propertyNames).sort(
  (a, b) => b[1] - a[1],
);

console.log("Most common property names:");
sortedProperties.slice(0, 20).forEach(([prop, count]) => {
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
      similarity > 0.8 &&
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

// Look for potential typos in token segments (excluding numbers)
const nonNumericSegments = segments.filter((seg) => !/^\d+$/.test(seg));
console.log(`Non-numeric segments: ${nonNumericSegments.length}`);

console.log("\nMost common non-numeric segments:");
const segmentCounts = {};
nonNumericSegments.forEach((seg) => {
  segmentCounts[seg] = (segmentCounts[seg] || 0) + 1;
});

const sortedSegments = Object.entries(segmentCounts)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 20);

sortedSegments.forEach(([seg, count]) => {
  console.log(`  "${seg}" - ${count} occurrences`);
});

// Look for potential typos in non-numeric segments
console.log("\n🔍 Potential typos in token segments:");
const segmentTypos = [];
for (let i = 0; i < nonNumericSegments.length; i++) {
  for (let j = i + 1; j < nonNumericSegments.length; j++) {
    const seg1 = nonNumericSegments[i];
    const seg2 = nonNumericSegments[j];

    const similarity = calculateSimilarity(seg1, seg2);
    if (
      similarity > 0.8 &&
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

// 3. Enum Value Analysis
console.log("\n📋 ENUM VALUE ANALYSIS");
console.log("-".repeat(40));

const enumValues = componentReport.lexicon.enumValues;
const sortedEnums = Object.entries(enumValues).sort((a, b) => b[1] - a[1]);

console.log("Most common enum values:");
sortedEnums.slice(0, 20).forEach(([value, count]) => {
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
      similarity > 0.8 &&
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

// 4. Specific Issues Found
console.log("\n🚨 SPECIFIC ISSUES FOUND");
console.log("-".repeat(40));

// Check for the known typo we found earlier
const knownIssues = [];
if (propertyNames["isDetatched"]) {
  knownIssues.push({
    type: "typo",
    location: "component property",
    issue: "isDetatched",
    suggestion: "isDetached",
    count: propertyNames["isDetatched"],
  });
}

if (propertyNames["isDetached"]) {
  knownIssues.push({
    type: "inconsistency",
    location: "component property",
    issue: "isDetached (correct)",
    suggestion: "standardize with isDetatched",
    count: propertyNames["isDetached"],
  });
}

if (knownIssues.length > 0) {
  knownIssues.forEach((issue) => {
    console.log(
      `  ${issue.type.toUpperCase()}: "${issue.issue}" in ${issue.location} (${issue.count} occurrences)`,
    );
    console.log(`    Suggestion: ${issue.suggestion}`);
  });
} else {
  console.log("  ✅ No known issues found");
}

// 5. Summary
console.log("\n📊 SUMMARY");
console.log("-".repeat(40));
console.log(
  `Component properties analyzed: ${Object.keys(propertyNames).length}`,
);
console.log(`Token segments analyzed: ${segments.length}`);
console.log(`Non-numeric segments: ${nonNumericSegments.length}`);
console.log(`Potential property typos: ${potentialTypos.length}`);
console.log(`Potential segment typos: ${segmentTypos.length}`);
console.log(`Potential enum typos: ${enumTypos.length}`);
console.log(`Known issues: ${knownIssues.length}`);

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

console.log("\n✅ Analysis complete!");
