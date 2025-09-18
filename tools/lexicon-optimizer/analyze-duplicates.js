#!/usr/bin/env node

/*
Copyright 2024 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

import { readFileSync } from "fs";

// Levenshtein distance function to find similar strings
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
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1, // deletion
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}

// Find potential duplicates and typos
function findDuplicatesAndTypos(items, category, maxDistance = 2) {
  const duplicates = [];
  const typos = [];

  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const item1 = items[i];
      const item2 = items[j];
      const distance = levenshteinDistance(item1, item2);

      if (distance === 0) {
        duplicates.push({ item1, item2, distance, category });
      } else if (distance <= maxDistance) {
        typos.push({ item1, item2, distance, category });
      }
    }
  }

  return { duplicates, typos };
}

// Load the lexicon report
const report = JSON.parse(readFileSync("clean-report.json", "utf8"));

console.log("🔍 Analyzing lexicon for duplicates and potential typos...\n");

// Analyze property names
console.log("📝 PROPERTY NAMES ANALYSIS");
console.log("=".repeat(50));
const propertyAnalysis = findDuplicatesAndTypos(
  report.lexicon.propertyNames,
  "propertyNames",
);

if (propertyAnalysis.duplicates.length > 0) {
  console.log("\n🚨 EXACT DUPLICATES FOUND:");
  propertyAnalysis.duplicates.forEach(({ item1, item2, category }) => {
    console.log(`  - "${item1}" and "${item2}" (${category})`);
  });
}

if (propertyAnalysis.typos.length > 0) {
  console.log("\n⚠️  POTENTIAL TYPOS (similar names):");
  propertyAnalysis.typos.forEach(({ item1, item2, distance, category }) => {
    console.log(
      `  - "${item1}" vs "${item2}" (distance: ${distance}, ${category})`,
    );
  });
}

// Analyze enum values
console.log("\n\n🎯 ENUM VALUES ANALYSIS");
console.log("=".repeat(50));
const enumAnalysis = findDuplicatesAndTypos(
  report.lexicon.enumValues,
  "enumValues",
);

if (enumAnalysis.duplicates.length > 0) {
  console.log("\n🚨 EXACT DUPLICATES FOUND:");
  enumAnalysis.duplicates.forEach(({ item1, item2, category }) => {
    console.log(`  - "${item1}" and "${item2}" (${category})`);
  });
}

if (enumAnalysis.typos.length > 0) {
  console.log("\n⚠️  POTENTIAL TYPOS (similar names):");
  enumAnalysis.typos.forEach(({ item1, item2, distance, category }) => {
    console.log(
      `  - "${item1}" vs "${item2}" (distance: ${distance}, ${category})`,
    );
  });
}

// Analyze component titles
console.log("\n\n📋 COMPONENT TITLES ANALYSIS");
console.log("=".repeat(50));
const titleAnalysis = findDuplicatesAndTypos(
  report.lexicon.componentTitles,
  "componentTitles",
);

if (titleAnalysis.duplicates.length > 0) {
  console.log("\n🚨 EXACT DUPLICATES FOUND:");
  titleAnalysis.duplicates.forEach(({ item1, item2, category }) => {
    console.log(`  - "${item1}" and "${item2}" (${category})`);
  });
}

if (titleAnalysis.typos.length > 0) {
  console.log("\n⚠️  POTENTIAL TYPOS (similar names):");
  titleAnalysis.typos.forEach(({ item1, item2, distance, category }) => {
    console.log(
      `  - "${item1}" vs "${item2}" (distance: ${distance}, ${category})`,
    );
  });
}

// Look for specific patterns that might indicate typos
console.log("\n\n🔍 SPECIFIC PATTERN ANALYSIS");
console.log("=".repeat(50));

// Check for common typo patterns
const propertyNames = report.lexicon.propertyNames;
const enumValues = report.lexicon.enumValues;

// Look for "isDetached" vs "isDetatched" (common typo)
const detachedVariants = propertyNames.filter(
  (name) => name.includes("Detach") || name.includes("detach"),
);
if (detachedVariants.length > 1) {
  console.log('\n🔍 "Detached" variants found:');
  detachedVariants.forEach((name) => console.log(`  - "${name}"`));
}

// Look for size inconsistencies
const sizeValues = enumValues.filter((value) =>
  ["s", "m", "l", "xl", "xs", "xxl", "xxxl", "small"].includes(value),
);
console.log("\n📏 Size values found:");
sizeValues.forEach((value) => console.log(`  - "${value}"`));

// Look for boolean property naming inconsistencies
const booleanProps = propertyNames.filter(
  (name) =>
    name.startsWith("is") ||
    name.startsWith("has") ||
    name.startsWith("show") ||
    name.startsWith("hide"),
);
console.log("\n🔘 Boolean property patterns:");
const isProps = booleanProps.filter((name) => name.startsWith("is"));
const hasProps = booleanProps.filter((name) => name.startsWith("has"));
const showProps = booleanProps.filter((name) => name.startsWith("show"));
const hideProps = booleanProps.filter((name) => name.startsWith("hide"));

console.log(`  - "is*" properties: ${isProps.length}`);
console.log(`  - "has*" properties: ${hasProps.length}`);
console.log(`  - "show*" properties: ${showProps.length}`);
console.log(`  - "hide*" properties: ${hideProps.length}`);

// Look for potential case inconsistencies
const caseIssues = [];
for (let i = 0; i < propertyNames.length; i++) {
  for (let j = i + 1; j < propertyNames.length; j++) {
    const prop1 = propertyNames[i];
    const prop2 = propertyNames[j];
    if (prop1.toLowerCase() === prop2.toLowerCase() && prop1 !== prop2) {
      caseIssues.push({ prop1, prop2 });
    }
  }
}

if (caseIssues.length > 0) {
  console.log("\n🔤 Case inconsistency issues:");
  caseIssues.forEach(({ prop1, prop2 }) => {
    console.log(`  - "${prop1}" vs "${prop2}"`);
  });
}

console.log("\n✅ Analysis complete!");
