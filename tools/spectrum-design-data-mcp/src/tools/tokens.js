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

import { getTokenData } from "../data/tokens.js";

/**
 * Create token-related MCP tools
 * @returns {Array} Array of token tools
 */
export function createTokenTools() {
  return [
    {
      name: "query-tokens",
      description:
        "Search and retrieve Spectrum design tokens by name, type, or category",
      inputSchema: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description:
              "Search query to filter tokens (searches names, types, categories)",
          },
          category: {
            type: "string",
            description:
              'Filter by token category (e.g., "color", "layout", "typography")',
          },
          type: {
            type: "string",
            description: 'Filter by token type (e.g., "alias", "component")',
          },
          limit: {
            type: "number",
            description: "Maximum number of tokens to return (default: 50)",
            default: 50,
          },
        },
      },
      handler: async (args) => {
        const { query, category, type, limit = 50 } = args;
        const tokenData = await getTokenData();

        let results = [];

        // Search through all token files
        for (const [fileName, tokens] of Object.entries(tokenData)) {
          // Skip if category filter doesn't match
          if (
            category &&
            !fileName.toLowerCase().includes(category.toLowerCase())
          ) {
            continue;
          }

          // Process tokens based on their structure
          const processedTokens = processTokens(tokens, fileName, query, type);
          results.push(...processedTokens);
        }

        // Apply limit
        results = results.slice(0, limit);

        return {
          total: results.length,
          tokens: results,
          query: { query, category, type, limit },
        };
      },
    },
    {
      name: "get-token-categories",
      description:
        "Get all available token categories in the Spectrum design system",
      inputSchema: {
        type: "object",
        properties: {},
      },
      handler: async () => {
        const tokenData = await getTokenData();
        const categories = Object.keys(tokenData).map((fileName) => {
          // Extract category from filename (e.g., "color-palette.json" -> "color-palette")
          return fileName.replace(".json", "");
        });

        return {
          categories,
          total: categories.length,
        };
      },
    },
    {
      name: "get-token-details",
      description:
        "Get detailed information about a specific token by its path",
      inputSchema: {
        type: "object",
        properties: {
          tokenPath: {
            type: "string",
            description: 'The full path to the token (e.g., "color.blue.100")',
            required: true,
          },
          category: {
            type: "string",
            description: 'Token category to search in (e.g., "color-palette")',
          },
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
      name: "find-tokens-by-use-case",
      description:
        'Find appropriate design tokens for specific component use cases (e.g., "button background", "text color", "border", "spacing")',
      inputSchema: {
        type: "object",
        properties: {
          useCase: {
            type: "string",
            description:
              'The use case or purpose (e.g., "button background", "text color", "border", "spacing", "error state")',
          },
          componentType: {
            type: "string",
            description:
              'Optional: Type of component being built (e.g., "button", "input", "card")',
          },
        },
        required: ["useCase"],
      },
      handler: async ({ useCase, componentType }) => {
        const data = await getTokenData();
        const recommendations = [];

        // Smart token recommendations based on use case
        const useCaseLower = useCase.toLowerCase();
        const compTypeLower = (componentType || "").toLowerCase();

        // Define use case mappings
        const useCasePatterns = {
          background: [
            "color-component",
            "semantic-color-palette",
            "color-palette",
          ],
          text: ["color-component", "semantic-color-palette", "typography"],
          border: ["color-component", "semantic-color-palette"],
          spacing: ["layout", "layout-component"],
          padding: ["layout", "layout-component"],
          margin: ["layout", "layout-component"],
          font: ["typography"],
          icon: ["icons", "layout"],
          error: ["semantic-color-palette", "color-component"],
          success: ["semantic-color-palette", "color-component"],
          warning: ["semantic-color-palette", "color-component"],
          accent: ["semantic-color-palette", "color-component"],
          button: ["color-component", "layout-component"],
          input: ["color-component", "layout-component"],
          card: ["color-component", "layout-component"],
        };

        // Find relevant categories
        const relevantCategories = [];
        for (const [pattern, categories] of Object.entries(useCasePatterns)) {
          if (
            useCaseLower.includes(pattern) ||
            compTypeLower.includes(pattern)
          ) {
            relevantCategories.push(...categories);
          }
        }

        // If no specific patterns match, search all categories
        const categoriesToSearch =
          relevantCategories.length > 0
            ? [...new Set(relevantCategories)]
            : Object.keys(data);

        // Search within relevant categories
        for (const category of categoriesToSearch) {
          const filename = category.includes(".json")
            ? category
            : `${category}.json`;
          const tokens = data[filename];
          if (!tokens) continue;

          Object.entries(tokens).forEach(([name, token]) => {
            const nameMatch =
              name.toLowerCase().includes(useCaseLower) ||
              (componentType && name.toLowerCase().includes(compTypeLower));
            const descMatch =
              token.description &&
              token.description.toLowerCase().includes(useCaseLower);

            if (nameMatch || descMatch) {
              recommendations.push({
                name,
                category: filename,
                value: token.value,
                description: token.description,
                schema: token.$schema,
                uuid: token.uuid,
                private: token.private || false,
                relevanceReason: nameMatch ? "name match" : "description match",
              });
            }
          });
        }

        // Sort by relevance (non-private first, then by name match)
        recommendations.sort((a, b) => {
          if (a.private !== b.private) return a.private ? 1 : -1;
          if (a.relevanceReason !== b.relevanceReason) {
            return a.relevanceReason === "name match" ? -1 : 1;
          }
          return a.name.localeCompare(b.name);
        });

        return {
          useCase,
          componentType,
          recommendations: recommendations.slice(0, 20), // Limit to top 20
          totalFound: recommendations.length,
          searchedCategories: categoriesToSearch,
        };
      },
    },
    {
      name: "get-component-tokens",
      description: "Get all tokens related to a specific component type",
      inputSchema: {
        type: "object",
        properties: {
          componentName: {
            type: "string",
            description:
              'Name of the component (e.g., "button", "input", "card", "modal")',
          },
        },
        required: ["componentName"],
      },
      handler: async ({ componentName }) => {
        const data = await getTokenData();
        const componentTokens = [];
        const componentLower = componentName.toLowerCase();

        // Search through all token categories for component-specific tokens
        Object.entries(data).forEach(([category, tokens]) => {
          if (!tokens) return;

          Object.entries(tokens).forEach(([name, token]) => {
            if (name.toLowerCase().includes(componentLower)) {
              componentTokens.push({
                name,
                category,
                value: token.value,
                description: token.description,
                schema: token.$schema,
                uuid: token.uuid,
                private: token.private || false,
              });
            }
          });
        });

        // Group by category for better organization
        const groupedTokens = componentTokens.reduce((acc, token) => {
          if (!acc[token.category]) acc[token.category] = [];
          acc[token.category].push(token);
          return acc;
        }, {});

        return {
          componentName,
          tokensByCategory: groupedTokens,
          totalTokens: componentTokens.length,
        };
      },
    },
    {
      name: "get-design-recommendations",
      description:
        "Get design token recommendations for common design decisions and component states",
      inputSchema: {
        type: "object",
        properties: {
          intent: {
            type: "string",
            description:
              'Design intent (e.g., "primary", "secondary", "accent", "negative", "notice", "positive", "informative")',
          },
          state: {
            type: "string",
            description:
              'Component state (e.g., "default", "hover", "focus", "active", "disabled", "selected")',
          },
          context: {
            type: "string",
            description:
              'Usage context (e.g., "button", "input", "text", "background", "border", "icon")',
          },
        },
        required: ["intent"],
      },
      handler: async ({ intent, state, context }) => {
        const data = await getTokenData();
        const recommendations = {
          colors: [],
          layout: [],
          typography: [],
        };

        const intentLower = intent.toLowerCase();
        const stateLower = (state || "").toLowerCase();
        const contextLower = (context || "").toLowerCase();

        // Search semantic colors first (these are typically the best recommendations)
        const semanticColors = data["semantic-color-palette.json"] || {};
        Object.entries(semanticColors).forEach(([name, token]) => {
          const nameLower = name.toLowerCase();

          // Intent matching
          const intentMatch =
            nameLower.includes(intentLower) ||
            (intentLower === "error" && nameLower.includes("negative")) ||
            (intentLower === "success" && nameLower.includes("positive")) ||
            (intentLower === "warning" && nameLower.includes("notice"));

          // State matching
          const stateMatch = !state || nameLower.includes(stateLower);

          // Context matching
          const contextMatch = !context || nameLower.includes(contextLower);

          if (intentMatch && stateMatch && contextMatch) {
            recommendations.colors.push({
              name,
              value: token.value,
              category: "semantic-color-palette",
              type: "semantic",
              confidence: "high",
            });
          }
        });

        // Search component colors if semantic colors don't provide enough options
        if (recommendations.colors.length < 3) {
          const componentColors = data["color-component.json"] || {};
          Object.entries(componentColors).forEach(([name, token]) => {
            const nameLower = name.toLowerCase();

            // Intent and context matching for component colors
            const intentMatch = nameLower.includes(intentLower);
            const contextMatch = !context || nameLower.includes(contextLower);
            const stateMatch = !state || nameLower.includes(stateLower);

            if ((intentMatch || contextMatch) && stateMatch) {
              recommendations.colors.push({
                name,
                value: token.value,
                category: "color-component",
                type: "component",
                confidence: "medium",
              });
            }
          });
        }

        // Layout recommendations if context suggests spacing/sizing
        if (
          context &&
          ["button", "input", "spacing", "padding", "margin"].some((c) =>
            contextLower.includes(c),
          )
        ) {
          const layoutComponent = data["layout-component.json"] || {};
          Object.entries(layoutComponent).forEach(([name, token]) => {
            const nameLower = name.toLowerCase();

            if (
              contextLower &&
              nameLower.includes(contextLower) &&
              nameLower.includes(stateLower || "size")
            ) {
              recommendations.layout.push({
                name,
                value: token.value,
                category: "layout-component",
                type: "spacing",
                confidence: "high",
              });
            }
          });
        }

        // Typography recommendations for text contexts
        if (
          context &&
          ["text", "label", "heading", "body"].some((c) =>
            contextLower.includes(c),
          )
        ) {
          const typography = data["typography.json"] || {};
          Object.entries(typography).forEach(([name, token]) => {
            const nameLower = name.toLowerCase();

            if (nameLower.includes(contextLower)) {
              recommendations.typography.push({
                name,
                value: token.value,
                category: "typography",
                type: "text",
                confidence: "high",
              });
            }
          });
        }

        // Sort by confidence and limit results
        ["colors", "layout", "typography"].forEach((category) => {
          recommendations[category] = recommendations[category]
            .sort((a, b) => {
              const confidenceOrder = { high: 0, medium: 1, low: 2 };
              return (
                confidenceOrder[a.confidence] - confidenceOrder[b.confidence]
              );
            })
            .slice(0, 10);
        });

        return {
          intent,
          state,
          context,
          recommendations,
          totalFound:
            recommendations.colors.length +
            recommendations.layout.length +
            recommendations.typography.length,
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

          results.push({
            name: key,
            path: currentPath,
            category,
            type: tokenType,
            value: value.$value || value.value,
            description: value.$description || value.description,
            extensions: value.$extensions || value.extensions,
          });
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
