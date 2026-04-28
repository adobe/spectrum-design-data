// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0

// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

/**
 * Generates naming exception entries for all MEDIUM-confidence active tokens.
 * Categorizes each by its primary gap type and merges into naming-exceptions.json.
 */

import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const EXCEPTIONS_PATH = resolve(
  __dirname,
  "../../../packages/tokens/naming-exceptions.json",
);
const DECOMPOSITIONS_PATH = resolve(
  __dirname,
  "../output/all-decompositions.json",
);

function categorize(result) {
  const gapTypes = result.gaps.map((g) => g.type);
  const prop = result.nameObject.property || "";

  // Typography taxonomy
  if (
    gapTypes.includes("typography-weight") ||
    gapTypes.includes("typography-family") ||
    gapTypes.includes("typography-script")
  ) {
    return { category: "typography-taxonomy", proposal: "001" };
  }

  // Dual-variant (two variant-like values, e.g., blue + primary)
  if (prop.includes("primary") || prop.includes("secondary")) {
    return { category: "dual-variant", proposal: "002" };
  }

  // Static-color compound
  if (prop.includes("black-color") || prop.includes("white-color")) {
    return { category: "static-color-compound", proposal: "002" };
  }

  // Variant qualifiers (subtle, subdued → style field)
  if (gapTypes.includes("variant-qualifier")) {
    return { category: "variant-qualifier", proposal: "002" };
  }

  // Context modifiers (elevated, pasteboard, ambient)
  if (gapTypes.includes("context-modifier")) {
    return { category: "context-modifier", proposal: "004" };
  }

  // Numeric scale index
  if (
    gapTypes.includes("numeric-scale-index") &&
    gapTypes.length === 1 &&
    result.unmatchedSegments.length === 0
  ) {
    return { category: "numeric-scale-index", proposal: "003" };
  }

  // Drop-shadow properties
  if (gapTypes.includes("drop-shadow-property")) {
    return { category: "drop-shadow-property", proposal: "004" };
  }

  // Spacing-between
  if (gapTypes.includes("spacing-between")) {
    return { category: "spacing-between", proposal: null };
  }

  // Spatial qualifiers
  if (gapTypes.includes("spatial-qualifier")) {
    return { category: "spatial-qualifier", proposal: "006" };
  }

  // Compound states (selected + hover, focus + hover)
  if (
    !result.roundtrips &&
    result.gaps.length === 0 &&
    result.unmatchedSegments.length === 0
  ) {
    const state = result.nameObject.state || "";
    if (
      prop.includes("selected") ||
      prop.includes("focus") ||
      prop.includes("emphasized")
    ) {
      return { category: "compound-state", proposal: "005" };
    }
    // Remaining ordering-only
    return { category: "ordering-mismatch", proposal: "002" };
  }

  // Unmatched segments
  if (result.unmatchedSegments.length > 0) {
    return { category: "vocabulary-gap", proposal: "006" };
  }

  // Catch-all
  return { category: "unclassified", proposal: null };
}

function main() {
  const results = JSON.parse(readFileSync(DECOMPOSITIONS_PATH, "utf-8"));
  const active = results.filter((r) => !r.deprecated && !r.private);
  const medium = active.filter((r) => r.confidence === "MEDIUM");

  const exceptionsData = JSON.parse(readFileSync(EXCEPTIONS_PATH, "utf-8"));
  const existingTokens = new Set(exceptionsData.exceptions.map((e) => e.token));

  const newEntries = [];
  const categoryCounts = {};

  for (const r of medium) {
    if (existingTokens.has(r.tokenName)) continue;

    const { category, proposal } = categorize(r);
    categoryCounts[category] = (categoryCounts[category] || 0) + 1;

    const entry = {
      token: r.tokenName,
      file: r.sourceFile,
      category,
    };

    if (proposal) {
      entry.proposal = proposal;
    }

    const gapDescs = r.gaps.map((g) => g.description).filter(Boolean);
    if (gapDescs.length > 0) {
      entry.reason = gapDescs[0];
    } else if (!r.roundtrips) {
      entry.reason = `Ordering mismatch: serializes as "${r.serialized}"`;
    } else {
      entry.reason = "Unclassified MEDIUM confidence";
    }

    newEntries.push(entry);
  }

  // Update category counts in the categories section
  for (const [cat, count] of Object.entries(categoryCounts)) {
    if (!exceptionsData.categories[cat]) {
      exceptionsData.categories[cat] = {
        description: `Tokens categorized as ${cat}`,
        count: 0,
        status: "needs-spec-decision",
      };
    }
    exceptionsData.categories[cat].count += count;
  }

  // Add proposal references to categories
  const proposalMap = {
    "typography-taxonomy": "001",
    "dual-variant": "002",
    "static-color-compound": "002",
    "variant-qualifier": "002",
    "ordering-mismatch": "002",
    "numeric-scale-index": "003",
    "drop-shadow-property": "004",
    "context-modifier": "004",
    "compound-state": "005",
    "spatial-qualifier": "006",
    "vocabulary-gap": "006",
  };

  for (const [cat, proposal] of Object.entries(proposalMap)) {
    if (exceptionsData.categories[cat]) {
      exceptionsData.categories[cat].proposal = proposal;
    }
  }

  // Merge new entries
  exceptionsData.exceptions.push(...newEntries);

  // Sort exceptions by category then token name
  exceptionsData.exceptions.sort((a, b) => {
    if (a.category !== b.category) return a.category.localeCompare(b.category);
    return a.token.localeCompare(b.token);
  });

  writeFileSync(
    EXCEPTIONS_PATH,
    JSON.stringify(exceptionsData, null, 2) + "\n",
  );

  console.log("=== EXCEPTIONS GENERATED ===");
  console.log(`New entries: ${newEntries.length}`);
  console.log(`Total entries: ${exceptionsData.exceptions.length}`);
  console.log("\nBy category:");
  for (const [cat, count] of Object.entries(categoryCounts).sort(
    ([, a], [, b]) => b - a,
  )) {
    console.log(`  ${cat}: ${count}`);
  }
}

main();
