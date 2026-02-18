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

import { getTokenData, getFlatTokenMap } from "../data/tokens.js";

/**
 * Create token-related MCP tools
 * @returns {Array} Array of token tools
 */
export function createTokenTools() {
  return [
    {
      name: "query-tokens",
      description:
        "Search Spectrum tokens by name, type, or category. Categories: color-aliases, color-component, color-palette, icons, layout, layout-component, semantic-color-palette, typography.",
      inputSchema: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Filter by name, type, or description",
          },
          category: { type: "string", description: "Filter by category" },
          type: { type: "string", description: "Filter by token type" },
          limit: {
            type: "number",
            description: "Max results (default: 50)",
            default: 50,
          },
        },
      },
      handler: async (args) => {
        const { query, category, type, limit = 50 } = args;
        const tokenData = await getTokenData();
        let results = [];
        for (const [fileName, tokens] of Object.entries(tokenData)) {
          if (
            category &&
            !fileName.toLowerCase().includes(category.toLowerCase())
          ) {
            continue;
          }
          const processedTokens = processTokens(tokens, fileName, query, type);
          results.push(...processedTokens);
        }
        results = results.slice(0, limit);
        return { total: results.length, tokens: results };
      },
    },
    {
      name: "query-tokens-by-value",
      description: "Find tokens by direct or resolved value (follows aliases).",
      inputSchema: {
        type: "object",
        properties: {
          value: {
            type: "string",
            description: "Value to match (e.g. 1px, #000)",
          },
          exact: {
            type: "boolean",
            description: "Exact match (default: true)",
            default: true,
          },
          limit: {
            type: "number",
            description: "Max results (default: 50)",
            default: 50,
          },
        },
        required: ["value"],
      },
      handler: async (args) => {
        const { value: searchValue, exact = true, limit = 50 } = args;
        const [tokenData, flatMap] = await Promise.all([
          getTokenData(),
          getFlatTokenMap(),
        ]);
        const results = [];
        const norm = (v) =>
          v === null || v === undefined ? "" : String(v).toLowerCase();
        const s = norm(searchValue);

        const resolvedValuesToCheck = (resolved) => {
          if (resolved === null || resolved === undefined) return [];
          if (typeof resolved === "object" && !Array.isArray(resolved)) {
            return Object.values(resolved).flatMap(resolvedValuesToCheck);
          }
          return [resolved];
        };

        for (const [fileName, tokens] of Object.entries(tokenData)) {
          const category = fileName.replace(".json", "");
          if (!tokens || typeof tokens !== "object") continue;

          for (const [name, token] of Object.entries(tokens)) {
            if (!token || typeof token !== "object") continue;
            const directValue = token.value;
            const resolved = resolveTokenValue(token, flatMap, new Set(), name);
            const toCheck = [directValue, ...resolvedValuesToCheck(resolved)];
            const matched = toCheck.some((v) => {
              const n = norm(v);
              return exact ? n === s : n.includes(s);
            });
            if (!matched) continue;

            const resolvedDisplay =
              typeof resolved === "object" && resolved !== null
                ? Object.entries(resolved)
                    .map(([k, v]) => `${k}: ${v}`)
                    .join(", ")
                : resolved;
            const directMatches =
              directValue !== undefined &&
              matchesValue(directValue, searchValue, exact);
            const matchType = directMatches ? "direct" : "alias";

            results.push({
              name,
              category,
              directValue:
                directValue !== undefined
                  ? directValue
                  : token.sets
                    ? JSON.stringify(token.sets)
                    : undefined,
              resolvedValue: resolvedDisplay ?? directValue,
              matchType,
            });
          }
        }

        const sliced = results.slice(0, limit);
        return { total: sliced.length, tokens: sliced };
      },
    },
    {
      name: "get-token-details",
      description: "Get full token data by path (flat token name).",
      inputSchema: {
        type: "object",
        properties: {
          tokenPath: {
            type: "string",
            description: "Token path/name",
            required: true,
          },
          category: { type: "string", description: "Category to search in" },
        },
        required: ["tokenPath"],
      },
      handler: async (args) => {
        const { tokenPath, category } = args;
        const tokenData = await getTokenData();

        // Search for the token in all categories or specific category
        const categoriesToSearch = category
          ? [category]
          : Object.keys(tokenData);

        for (const cat of categoriesToSearch) {
          const categoryData = tokenData[cat + ".json"] || tokenData[cat];
          if (!categoryData) continue;

          const token = findTokenByPath(categoryData, tokenPath);
          if (token) {
            return {
              path: tokenPath,
              category: cat,
              token,
            };
          }
        }

        throw new Error(`Token not found: ${tokenPath}`);
      },
    },
    {
      name: "get-component-tokens",
      description:
        "Get tokens whose name contains a component (e.g. button, input).",
      inputSchema: {
        type: "object",
        properties: {
          componentName: {
            type: "string",
            description: "Component name substring",
          },
        },
        required: ["componentName"],
      },
      handler: async ({ componentName }) => {
        const data = await getTokenData();
        const componentTokens = [];
        const componentLower = componentName.toLowerCase();

        Object.entries(data).forEach(([category, tokens]) => {
          if (!tokens) return;
          Object.entries(tokens).forEach(([name, token]) => {
            if (name.toLowerCase().includes(componentLower)) {
              const entry = { name, category, value: token.value };
              if (token.description) entry.description = token.description;
              if (token.deprecated) entry.deprecated = true;
              if (token.private) entry.private = true;
              componentTokens.push(entry);
            }
          });
        });

        const groupedTokens = componentTokens.reduce((acc, token) => {
          if (!acc[token.category]) acc[token.category] = [];
          acc[token.category].push(token);
          return acc;
        }, {});

        return {
          tokensByCategory: groupedTokens,
          totalTokens: componentTokens.length,
        };
      },
    },
  ];
}

/**
 * Process tokens based on search criteria
 * @param {Object} tokens - Token data structure
 * @param {string} fileName - Name of the token file
 * @param {string} query - Search query
 * @param {string} type - Type filter
 * @returns {Array} Processed tokens
 */
function processTokens(tokens, fileName, query, type) {
  const results = [];
  const category = fileName.replace(".json", "");

  function traverse(obj, path = "") {
    for (const [key, value] of Object.entries(obj)) {
      const currentPath = path ? `${path}.${key}` : key;

      if (value && typeof value === "object") {
        if (value.$value !== undefined || value.value !== undefined) {
          // This is a token
          const tokenType = value.$type || value.type || "unknown";

          // Apply type filter
          if (type && tokenType !== type) {
            continue;
          }

          // Apply query filter
          if (query && !matchesQuery(currentPath, value, query)) {
            continue;
          }

          const entry = {
            name: key,
            category,
            value: value.$value || value.value,
          };
          if (value.$description || value.description)
            entry.description = value.$description || value.description;
          if (value.deprecated) entry.deprecated = true;
          if (value.private) entry.private = true;
          if (value.deprecated_comment)
            entry.deprecated_comment = value.deprecated_comment;
          if (value.renamed) entry.renamed = value.renamed;
          results.push(entry);
        } else {
          // Recurse into nested objects
          traverse(value, currentPath);
        }
      }
    }
  }

  traverse(tokens);
  return results;
}

/**
 * Find a token by its path
 * @param {Object} tokens - Token data structure
 * @param {string} path - Token path (e.g., "color.blue.100")
 * @returns {Object|null} Token object or null if not found
 */
function findTokenByPath(tokens, path) {
  const parts = path.split(".");
  let current = tokens;

  for (const part of parts) {
    if (current[part] === undefined) {
      return null;
    }
    current = current[part];
  }

  return current;
}

/**
 * Check if a token matches the search query
 * @param {string} path - Token path
 * @param {Object} token - Token object
 * @param {string} query - Search query
 * @returns {boolean} Whether the token matches
 */
function matchesQuery(path, token, query) {
  const searchText = query.toLowerCase();

  // Search in path
  if (path.toLowerCase().includes(searchText)) {
    return true;
  }

  // Search in description
  const description = token.$description || token.description || "";
  if (description.toLowerCase().includes(searchText)) {
    return true;
  }

  // Search in value (for string values)
  const value = token.$value || token.value || "";
  if (typeof value === "string" && value.toLowerCase().includes(searchText)) {
    return true;
  }

  return false;
}

/**
 * Extract token name from alias reference value {token-name}
 * @param {string} value - Raw value
 * @returns {string|null} Token name or null if not a reference
 */
function extractReference(value) {
  if (typeof value !== "string") return null;
  const m = value.match(/^\{([^}]+)\}$/);
  return m ? m[1] : null;
}

/**
 * Resolve a token's value (follow alias chains, handle sets). Detects cycles.
 * @param {Object} token - Token object
 * @param {Object} flatMap - Flat map of tokenName -> token
 * @param {Set<string>} visited - Token names already visited (cycle detection)
 * @param {string} currentName - Current token name (for visited set)
 * @returns {string|number|Object|null} Resolved value; for sets, object of setKey -> resolved value
 */
function resolveTokenValue(token, flatMap, visited, currentName) {
  if (!token || typeof token !== "object") return null;
  if (visited.has(currentName)) return null;
  visited.add(currentName);

  if (token.sets && typeof token.sets === "object") {
    const out = {};
    for (const [setKey, setToken] of Object.entries(token.sets)) {
      const resolved = resolveTokenValue(
        setToken,
        flatMap,
        new Set(visited),
        `${currentName}.${setKey}`,
      );
      out[setKey] = resolved;
    }
    return out;
  }

  const raw = token.value;
  if (raw === undefined) return null;
  const ref = extractReference(raw);
  if (ref) {
    const refToken = flatMap[ref];
    if (!refToken) return null;
    return resolveTokenValue(refToken, flatMap, visited, ref);
  }
  return raw;
}

/**
 * Check if a value matches the search string (exact or contains)
 * @param {string|number} value - Token value
 * @param {string} searchValue - Search string
 * @param {boolean} exact - Whether to require exact match
 * @returns {boolean}
 */
function matchesValue(value, searchValue, exact) {
  const n =
    value === null || value === undefined ? "" : String(value).toLowerCase();
  const s = String(searchValue).toLowerCase();
  return exact ? n === s : n.includes(s);
}
