/*
Copyright 2026 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

/**
 * Hoists set-level deprecation to the token top level when every set entry is
 * deprecated. Makes set-only vs top-level deprecation equivalent for diffing.
 *
 * @param {object} tokenData - full token map (name -> token object)
 * @returns {object} deep-cloned token data with normalization applied
 */
export default function normalizeDeprecation(tokenData) {
  const normalized = structuredClone(tokenData);
  for (const token of Object.values(normalized)) {
    if (typeof token !== "object" || token === null || !token.sets) {
      continue;
    }
    const setEntries = Object.values(token.sets);
    if (setEntries.length === 0) {
      continue;
    }
    const allSetsDeprecated = setEntries.every(
      (s) => typeof s === "object" && s !== null && s.deprecated === true,
    );
    if (!allSetsDeprecated) {
      continue;
    }
    if (!token.deprecated) {
      token.deprecated = true;
    }
    for (const setEntry of Object.values(token.sets)) {
      if (typeof setEntry === "object" && setEntry !== null) {
        delete setEntry.deprecated;
      }
    }
  }
  return normalized;
}
