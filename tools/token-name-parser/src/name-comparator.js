/*
Copyright 2025 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

import { regenerateTokenName } from "./name-regenerator.js";

/**
 * Compare original token names with regenerated names
 * @param {Array} parsedTokens - Array of anonymous tokens
 * @returns {Promise<Object>} Comparison report
 */
export async function compareTokenNames(parsedTokens) {
  const matches = [];
  const mismatches = [];
  const errors = [];

  for (const token of parsedTokens) {
    const originalName = token.name.original;
    const nameStructure = token.name.structure;

    try {
      const regenerated = await regenerateTokenName(nameStructure);

      // Compare names
      if (originalName === regenerated) {
        matches.push({
          name: originalName,
          category: nameStructure.category,
          validation: token.validation,
        });
      } else {
        mismatches.push({
          originalName,
          regeneratedName: regenerated,
          category: nameStructure.category,
          nameStructure,
          validation: token.validation,
          difference: calculateDifference(originalName, regenerated),
        });
      }
    } catch (error) {
      errors.push({
        originalName,
        error: error.message,
        nameStructure,
      });
    }
  }

  const total = parsedTokens.length;
  const matchCount = matches.length;
  const mismatchCount = mismatches.length;
  const errorCount = errors.length;

  return {
    summary: {
      total,
      matches: matchCount,
      mismatches: mismatchCount,
      errors: errorCount,
      matchRate:
        total > 0 ? ((matchCount / total) * 100).toFixed(2) + "%" : "0%",
    },
    matches,
    mismatches,
    errors,
    statistics: {
      byCategory: calculateCategoryStatistics(
        parsedTokens,
        matches,
        mismatches,
      ),
    },
  };
}

/**
 * Calculate the difference between two strings
 * @param {string} original - Original string
 * @param {string} regenerated - Regenerated string
 * @returns {Object} Difference information
 */
function calculateDifference(original, regenerated) {
  if (original === regenerated) {
    return { type: "exact-match" };
  }

  // Check for substring match
  if (original.includes(regenerated)) {
    return {
      type: "regenerated-is-substring",
      note: `Regenerated '${regenerated}' is contained in original '${original}'`,
    };
  }

  if (regenerated.includes(original)) {
    return {
      type: "original-is-substring",
      note: `Original '${original}' is contained in regenerated '${regenerated}'`,
    };
  }

  // Calculate edit distance (simple character difference)
  const originalParts = original.split("-");
  const regeneratedParts = regenerated.split("-");

  return {
    type: "different",
    originalParts,
    regeneratedParts,
    partCountDiff: originalParts.length - regeneratedParts.length,
  };
}

/**
 * Calculate statistics by token category
 * @param {Array} parsedTokens - All parsed tokens
 * @param {Array} matches - Matching tokens
 * @param {Array} mismatches - Mismatching tokens
 * @returns {Object} Statistics by category
 */
function calculateCategoryStatistics(parsedTokens, matches, mismatches) {
  const stats = {};

  for (const token of parsedTokens) {
    const category = token.name.structure.category;

    if (!stats[category]) {
      stats[category] = {
        total: 0,
        matches: 0,
        mismatches: 0,
        matchRate: "0%",
      };
    }

    stats[category].total++;
  }

  for (const match of matches) {
    if (stats[match.category]) {
      stats[match.category].matches++;
    }
  }

  for (const mismatch of mismatches) {
    if (stats[mismatch.category]) {
      stats[mismatch.category].mismatches++;
    }
  }

  // Calculate match rates
  for (const category of Object.keys(stats)) {
    const { total, matches } = stats[category];
    stats[category].matchRate =
      total > 0 ? ((matches / total) * 100).toFixed(2) + "%" : "0%";
  }

  return stats;
}

export default { compareTokenNames };
