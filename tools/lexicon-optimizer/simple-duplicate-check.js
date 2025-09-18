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

// Load the lexicon report
const report = JSON.parse(readFileSync("clean-report.json", "utf8"));

console.log("🔍 Analyzing lexicon for duplicates and potential typos...\n");

// Check for exact duplicates
function findExactDuplicates(items, category) {
  const seen = new Set();
  const duplicates = [];

  for (const item of items) {
    if (seen.has(item)) {
      duplicates.push(item);
    } else {
      seen.add(item);
    }
  }

  return duplicates;
}

// Check for case-insensitive duplicates
function findCaseInsensitiveDuplicates(items, category) {
  const seen = new Map();
  const duplicates = [];

  for (const item of items) {
    const lower = item.toLowerCase();
    if (seen.has(lower)) {
      duplicates.push({ original: seen.get(lower), duplicate: item });
    } else {
      seen.set(lower, item);
    }
  }

  return duplicates;
}

// Check for common typo patterns
function findCommonTypos(items, category) {
  const typos = [];

  // Look for "detached" vs "detatched" typo
  const detachedVariants = items.filter(
    (item) => item.includes("Detach") || item.includes("detach"),
  );
  if (detachedVariants.length > 1) {
    typos.push({
      type: "detached_typo",
      items: detachedVariants,
      suggestion: 'Check spelling: "detached" vs "detatched"',
    });
  }

  // Look for similar boolean patterns
  const booleanPatterns = {
    is: items.filter((item) => item.startsWith("is")),
    has: items.filter((item) => item.startsWith("has")),
    show: items.filter((item) => item.startsWith("show")),
    hide: items.filter((item) => item.startsWith("hide")),
  };

  // Check for inconsistent patterns
  const allBoolean = [
    ...booleanPatterns.is,
    ...booleanPatterns.has,
    ...booleanPatterns.show,
    ...booleanPatterns.hide,
  ];
  const similarPairs = [];

  for (let i = 0; i < allBoolean.length; i++) {
    for (let j = i + 1; j < allBoolean.length; j++) {
      const item1 = allBoolean[i];
      const item2 = allBoolean[j];

      // Check if they're very similar (1-2 character difference)
      if (Math.abs(item1.length - item2.length) <= 1) {
        const diff = item1
          .split("")
          .filter((char, idx) => char !== item2[idx]).length;
        if (diff <= 2 && diff > 0) {
          similarPairs.push({ item1, item2, diff });
        }
      }
    }
  }

  if (similarPairs.length > 0) {
    typos.push({
      type: "similar_boolean_properties",
      items: similarPairs,
      suggestion: "Check for typos in boolean property names",
    });
  }

  return typos;
}

// Analyze property names
console.log("📝 PROPERTY NAMES ANALYSIS");
console.log("=".repeat(50));

const propertyDuplicates = findExactDuplicates(
  report.lexicon.propertyNames,
  "propertyNames",
);
if (propertyDuplicates.length > 0) {
  console.log("\n🚨 EXACT DUPLICATES FOUND:");
  propertyDuplicates.forEach((dup) => console.log(`  - "${dup}"`));
} else {
  console.log("\n✅ No exact duplicates found in property names");
}

const propertyCaseDuplicates = findCaseInsensitiveDuplicates(
  report.lexicon.propertyNames,
  "propertyNames",
);
if (propertyCaseDuplicates.length > 0) {
  console.log("\n🔤 CASE-INSENSITIVE DUPLICATES:");
  propertyCaseDuplicates.forEach(({ original, duplicate }) => {
    console.log(`  - "${original}" vs "${duplicate}"`);
  });
} else {
  console.log("\n✅ No case-insensitive duplicates found in property names");
}

const propertyTypos = findCommonTypos(
  report.lexicon.propertyNames,
  "propertyNames",
);
if (propertyTypos.length > 0) {
  console.log("\n⚠️  POTENTIAL TYPOS:");
  propertyTypos.forEach((typo) => {
    console.log(`\n  ${typo.type.toUpperCase()}:`);
    if (typo.items) {
      typo.items.forEach((item) => console.log(`    - "${item}"`));
    }
    if (typo.items && typo.items.length > 0) {
      typo.items.forEach(({ item1, item2, diff }) => {
        console.log(`    - "${item1}" vs "${item2}" (${diff} char difference)`);
      });
    }
    console.log(`    💡 ${typo.suggestion}`);
  });
}

// Analyze enum values
console.log("\n\n🎯 ENUM VALUES ANALYSIS");
console.log("=".repeat(50));

const enumDuplicates = findExactDuplicates(
  report.lexicon.enumValues,
  "enumValues",
);
if (enumDuplicates.length > 0) {
  console.log("\n🚨 EXACT DUPLICATES FOUND:");
  enumDuplicates.forEach((dup) => console.log(`  - "${dup}"`));
} else {
  console.log("\n✅ No exact duplicates found in enum values");
}

// Look for specific patterns
console.log("\n\n🔍 SPECIFIC PATTERN ANALYSIS");
console.log("=".repeat(50));

// Check for size value inconsistencies
const sizeValues = report.lexicon.enumValues.filter((value) =>
  ["s", "m", "l", "xl", "xs", "xxl", "xxxl", "small"].includes(value),
);
console.log("\n📏 Size values found:");
sizeValues.forEach((value) => console.log(`  - "${value}"`));

// Check for boolean property patterns
const booleanProps = report.lexicon.propertyNames.filter(
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

console.log(
  `  - "is*" properties (${isProps.length}): ${isProps.slice(0, 5).join(", ")}${isProps.length > 5 ? "..." : ""}`,
);
console.log(
  `  - "has*" properties (${hasProps.length}): ${hasProps.slice(0, 5).join(", ")}${hasProps.length > 5 ? "..." : ""}`,
);
console.log(
  `  - "show*" properties (${showProps.length}): ${showProps.join(", ")}`,
);
console.log(
  `  - "hide*" properties (${hideProps.length}): ${hideProps.join(", ")}`,
);

// Look for potential "detached" typo specifically
const detachedProps = report.lexicon.propertyNames.filter((name) =>
  name.toLowerCase().includes("detach"),
);
if (detachedProps.length > 0) {
  console.log('\n🔍 "Detached" related properties:');
  detachedProps.forEach((prop) => console.log(`  - "${prop}"`));
}

console.log("\n✅ Analysis complete!");
