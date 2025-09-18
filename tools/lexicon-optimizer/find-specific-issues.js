#!/usr/bin/env node

import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load the detailed analysis
const report = JSON.parse(readFileSync("detailed-analysis.json", "utf8"));

console.log("🔍 DETAILED ISSUE ANALYSIS");
console.log("=".repeat(60));

// 1. Find potential typos in component properties
console.log("\n📝 COMPONENT PROPERTY TYPO ANALYSIS");
console.log("-".repeat(40));

const propertyNames = report.lexicon.propertyNames;
const sortedProperties = Object.entries(propertyNames).sort(
  (a, b) => b[1] - a[1],
);

// Look for similar property names that might be typos
const potentialTypos = [];
for (let i = 0; i < sortedProperties.length; i++) {
  for (let j = i + 1; j < sortedProperties.length; j++) {
    const [prop1, count1] = sortedProperties[i];
    const [prop2, count2] = sortedProperties[j];

    // Calculate similarity (simple Levenshtein-like)
    const similarity = calculateSimilarity(prop1, prop2);
    if (similarity > 0.7 && similarity < 1.0) {
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
  console.log("Potential typos found:");
  potentialTypos.slice(0, 10).forEach((typo) => {
    console.log(
      `  "${typo.prop1}" (${typo.count1}) vs "${typo.prop2}" (${typo.count2}) - ${Math.round(typo.similarity * 100)}% similar`,
    );
  });
} else {
  console.log("✅ No obvious typos found in component properties");
}

// 2. Find inconsistent naming patterns
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

// 3. Find token segments that might be typos
console.log("\n🔤 TOKEN SEGMENT TYPO ANALYSIS");
console.log("-".repeat(40));

const segments = report.tokens.segments;
const sortedSegments = segments.sort();

const segmentTypos = [];
for (let i = 0; i < sortedSegments.length; i++) {
  for (let j = i + 1; j < sortedSegments.length; j++) {
    const seg1 = sortedSegments[i];
    const seg2 = sortedSegments[j];

    const similarity = calculateSimilarity(seg1, seg2);
    if (similarity > 0.7 && similarity < 1.0) {
      segmentTypos.push({ seg1, seg2, similarity });
    }
  }
}

if (segmentTypos.length > 0) {
  console.log("Potential token segment typos:");
  segmentTypos.slice(0, 15).forEach((typo) => {
    console.log(
      `  "${typo.seg1}" vs "${typo.seg2}" - ${Math.round(typo.similarity * 100)}% similar`,
    );
  });
} else {
  console.log("✅ No obvious typos found in token segments");
}

// 4. Find inconsistent token naming patterns
console.log("\n🎨 TOKEN NAMING INCONSISTENCIES");
console.log("-".repeat(40));

// Look for tokens that don't follow common patterns
const tokenPatterns = {};
Object.keys(report.tokens.patterns).forEach((pattern) => {
  const tokens = report.tokens.patterns[pattern];
  if (tokens && tokens.length > 0) {
    const tokenNames = tokens.map((t) => t.tokenName).filter(Boolean);
    if (tokenNames.length > 0) {
      tokenPatterns[pattern] = tokenNames;
    }
  }
});

// Find patterns with many variations
Object.entries(tokenPatterns).forEach(([pattern, tokens]) => {
  if (tokens.length > 5) {
    const variations = [...new Set(tokens.map((t) => t.toLowerCase()))];
    if (variations.length > 3) {
      console.log(`Pattern "${pattern}" has ${variations.length} variations:`);
      variations.slice(0, 5).forEach((variation) => {
        const count = tokens.filter(
          (t) => t.toLowerCase() === variation,
        ).length;
        console.log(`  - "${variation}" (${count} occurrences)`);
      });
    }
  }
});

// 5. Find specific problematic tokens
console.log("\n🚨 SPECIFIC PROBLEMATIC TOKENS");
console.log("-".repeat(40));

// Look for tokens with unusual patterns
const problematicTokens = [];
Object.entries(tokenPatterns).forEach(([pattern, tokens]) => {
  tokens.forEach((tokenName) => {
    // Check for unusual patterns
    if (tokenName.includes("--") || tokenName.includes("__")) {
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
});

if (problematicTokens.length > 0) {
  console.log("Tokens with potential issues:");
  problematicTokens.slice(0, 10).forEach((issue) => {
    console.log(`  "${issue.token}" - ${issue.issue}`);
  });
} else {
  console.log("✅ No obvious token formatting issues found");
}

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
