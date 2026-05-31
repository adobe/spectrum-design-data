// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0

// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { loadFieldCatalog } from "./field-catalog.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Load all registries into a unified index.
 * Registry files are resolved from the field catalog declarations rather than
 * a hardcoded mapping.
 *
 * Returns { byField, terms, tokenNameMap, serializationOrder, allFields } where:
 * - byField[fieldName] = Set of known ids
 * - terms = sorted list of { segments: string[], field: string, id: string }
 *   for greedy longest-match parsing
 * - tokenNameMap = id -> tokenName for serialization
 * - serializationOrder = field names ordered by serialization.position
 * - allFields = Map of all field declarations from the catalog
 */
export function loadRegistries() {
  const { registryFiles, serializationOrder, allFields } = loadFieldCatalog();

  const byField = {};
  const allTerms = [];
  const tokenNameMap = {}; // id -> tokenName for serialization

  for (const [field, filePath] of Object.entries(registryFiles)) {
    const data = JSON.parse(readFileSync(filePath, "utf-8"));
    const ids = new Set();

    for (const entry of data.values) {
      ids.add(entry.id);
      const segments = entry.id.split("-");
      allTerms.push({ segments, field, id: entry.id });

      // Track tokenName for legacy serialization
      if (entry.tokenName) {
        tokenNameMap[entry.id] = entry.tokenName;
      }

      // Also index aliases for matching
      if (entry.aliases) {
        for (const alias of entry.aliases) {
          const aliasId = alias.toLowerCase().replace(/\s+/g, "-");
          ids.add(aliasId);
          allTerms.push({ segments: aliasId.split("-"), field, id: entry.id });
        }
      }
    }

    byField[field] = ids;
  }

  // Sort by segment count descending for greedy longest-match
  allTerms.sort((a, b) => b.segments.length - a.segments.length);

  return {
    byField,
    terms: allTerms,
    tokenNameMap,
    serializationOrder,
    allFields,
  };
}

/**
 * Try to match the longest registry term starting at a given position
 * in a list of name segments.
 *
 * @param {string[]} segments - kebab-split token name segments
 * @param {number} startIndex - position to start matching from
 * @param {Array} terms - sorted term list from loadRegistries
 * @param {string|null} preferField - prefer matches of this field type
 * @returns {{ field: string, id: string, length: number } | null}
 */
export function matchLongestTerm(
  segments,
  startIndex,
  terms,
  preferField = null,
) {
  const remaining = segments.length - startIndex;
  let bestMatch = null;

  for (const term of terms) {
    if (term.segments.length > remaining) continue;

    let matches = true;
    for (let i = 0; i < term.segments.length; i++) {
      if (segments[startIndex + i] !== term.segments[i]) {
        matches = false;
        break;
      }
    }

    if (matches) {
      if (!bestMatch || term.segments.length > bestMatch.length) {
        bestMatch = {
          field: term.field,
          id: term.id,
          length: term.segments.length,
        };
      } else if (
        term.segments.length === bestMatch.length &&
        preferField &&
        term.field === preferField
      ) {
        bestMatch = {
          field: term.field,
          id: term.id,
          length: term.segments.length,
        };
      }
    }
  }

  return bestMatch;
}

/**
 * Find all possible matches for a given set of segments at a position.
 * Returns all matches (not just longest) for disambiguation.
 */
export function findAllMatches(segments, startIndex, terms) {
  const remaining = segments.length - startIndex;
  const matches = [];

  for (const term of terms) {
    if (term.segments.length > remaining) continue;

    let isMatch = true;
    for (let i = 0; i < term.segments.length; i++) {
      if (segments[startIndex + i] !== term.segments[i]) {
        isMatch = false;
        break;
      }
    }

    if (isMatch) {
      matches.push({
        field: term.field,
        id: term.id,
        length: term.segments.length,
      });
    }
  }

  return matches;
}
