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

import {
  INTENT_SEMANTIC_MAPPINGS,
  VARIANT_MAPPINGS,
} from "../config/intent-mappings.js";

/**
 * Find tokens that match a component name across all categories
 * @param {Record<string, Record<string, unknown>>} tokenData - Token data by category
 * @param {string} componentName - Component name to match
 * @param {Object} [options] - Options
 * @param {boolean} [options.excludePrivate=false] - Exclude private tokens
 * @param {boolean} [options.excludeDeprecated=false] - Exclude deprecated tokens
 * @returns {Array<{ name: string, category: string, value: unknown, description?: string }>}
 */
export function findComponentTokens(tokenData, componentName, options = {}) {
  const { excludePrivate = false, excludeDeprecated = false } = options;
  const componentTokens = [];
  const componentLower = componentName.toLowerCase();

  for (const [category, tokens] of Object.entries(tokenData)) {
    if (!tokens || typeof tokens !== "object") continue;

    for (const [name, token] of Object.entries(tokens)) {
      if (!token || typeof token !== "object") continue;
      if (excludePrivate && token.private) continue;
      if (excludeDeprecated && token.deprecated) continue;
      if (!name.toLowerCase().includes(componentLower)) continue;

      componentTokens.push({
        name,
        category,
        value: token.value,
        description: token.description,
      });
    }
  }

  return componentTokens;
}

/**
 * Check if a token name matches the given intent (including semantic mappings)
 * @param {string} nameLower - Token name lowercased
 * @param {string} intentLower - Intent lowercased
 * @returns {boolean}
 */
export function tokenNameMatchesIntent(nameLower, intentLower) {
  if (nameLower.includes(intentLower)) return true;
  const mapping = INTENT_SEMANTIC_MAPPINGS[intentLower];
  if (mapping) {
    return mapping.some((sub) => nameLower.includes(sub));
  }
  return false;
}

/**
 * Find semantic color tokens matching an intent
 * @param {Record<string, unknown>} semanticColors - Semantic color palette tokens
 * @param {string} intent - Design intent (e.g. primary, error, success)
 * @param {number} limit - Max results to return
 * @returns {Array<{ name: string, value: unknown, category: string, type: string }>}
 */
export function findSemanticColorsByIntent(semanticColors, intent, limit) {
  if (!semanticColors || typeof semanticColors !== "object") return [];
  const recommendations = [];
  const intentLower = intent.toLowerCase();

  for (const [name, token] of Object.entries(semanticColors)) {
    if (!token || typeof token !== "object") continue;
    const nameLower = name.toLowerCase();
    if (!tokenNameMatchesIntent(nameLower, intentLower)) continue;

    recommendations.push({
      name,
      value: token.value,
      category: "semantic-color-palette",
      type: "semantic",
    });
  }

  return recommendations.slice(0, limit);
}

/**
 * Check if a token name matches the given variant (using variant mappings)
 * @param {string} nameLower - Token name lowercased
 * @param {string} variantLower - Variant lowercased
 * @returns {boolean}
 */
export function tokenNameMatchesVariant(nameLower, variantLower) {
  if (nameLower.includes(variantLower)) return true;
  const mapping = VARIANT_MAPPINGS[variantLower];
  if (mapping) {
    return mapping.some((sub) => nameLower.includes(sub));
  }
  return false;
}

/**
 * Find semantic color tokens matching a variant
 * @param {Record<string, unknown>} semanticColors - Semantic color palette tokens
 * @param {string} variant - Variant name (e.g. accent, negative)
 * @param {number} limit - Max results to return
 * @returns {Array<{ name: string, value: unknown, category: string, type: string }>}
 */
export function findSemanticColorsByVariant(semanticColors, variant, limit) {
  if (!semanticColors || typeof semanticColors !== "object") return [];
  const semanticTokens = [];
  const variantLower = variant.toLowerCase();

  for (const [name, token] of Object.entries(semanticColors)) {
    if (!token || typeof token !== "object") continue;
    const nameLower = name.toLowerCase();
    if (!tokenNameMatchesVariant(nameLower, variantLower)) continue;

    semanticTokens.push({
      name,
      value: token.value,
      category: "semantic-color-palette",
      type: "semantic",
    });
  }

  return semanticTokens.slice(0, limit);
}

/**
 * Find tokens matching a use case string (name or description)
 * @param {Record<string, Record<string, unknown>>} tokenData - Token data by category
 * @param {string} useCase - Use case search string
 * @param {number} limit - Max results
 * @param {Object} [options] - Options
 * @param {boolean} [options.excludePrivate=true] - Exclude private tokens
 * @returns {Array<{ name: string, category: string, value: unknown, description?: string }>}
 */
export function findTokensByUseCase(tokenData, useCase, limit, options = {}) {
  const { excludePrivate = true } = options;
  const useCaseLower = useCase.toLowerCase();
  const useCaseTokens = [];

  for (const [category, tokens] of Object.entries(tokenData)) {
    if (!tokens || typeof tokens !== "object") continue;

    for (const [name, token] of Object.entries(tokens)) {
      if (!token || typeof token !== "object") continue;
      if (excludePrivate && token.private) continue;

      const nameMatch = name.toLowerCase().includes(useCaseLower);
      const descMatch =
        token.description &&
        String(token.description).toLowerCase().includes(useCaseLower);

      if (nameMatch || descMatch) {
        useCaseTokens.push({
          name,
          category,
          value: token.value,
          description: token.description,
        });
      }
    }
  }

  return useCaseTokens.slice(0, limit);
}

/**
 * Group an array of tokens by their category
 * @param {Array<{ category: string, [key: string]: unknown }>} tokens - Tokens with category
 * @returns {Record<string, Array<unknown>>}
 */
export function groupTokensByCategory(tokens) {
  if (!Array.isArray(tokens)) return {};
  return tokens.reduce((acc, token) => {
    const category = token?.category;
    if (category == null) return acc;
    if (!acc[category]) acc[category] = [];
    acc[category].push(token);
    return acc;
  }, /** @type {Record<string, Array<unknown>>} */ ({}));
}
