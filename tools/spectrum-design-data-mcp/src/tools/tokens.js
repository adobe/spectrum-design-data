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
import { RESULT_LIMITS } from "../constants.js";
import { USE_CASE_PATTERNS } from "../config/intent-mappings.js";
import { validateLimit, validateStringParam } from "../utils/validation.js";
import { tokenNameMatchesIntent } from "../utils/token-helpers.js";

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
        const query = validateStringParam(args?.query, "query");
        const category = validateStringParam(args?.category, "category");
        const type = validateStringParam(args?.type, "type");
        const limit = validateLimit(
          args?.limit,
          RESULT_LIMITS.DEFAULT_TOKEN_LIMIT,
          100,
        );

        const tokenData = await getTokenData();
        let results = [];

        if (tokenData && typeof tokenData === "object") {
          for (const [fileName, tokens] of Object.entries(tokenData)) {
            if (
              category &&
              !String(fileName).toLowerCase().includes(category.toLowerCase())
            ) {
              continue;
            }
            if (!tokens || typeof tokens !== "object") continue;

            const processedTokens = processTokens(
              tokens,
              fileName,
              query ?? "",
              type,
            );
            results.push(...processedTokens);
          }
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
      name: "get-token-categories",
      description:
        "Get all available token categories in the Spectrum design system",
      inputSchema: {
        type: "object",
        properties: {},
      },
      handler: async () => {
        const tokenData = await getTokenData();
        const categories =
          tokenData && typeof tokenData === "object"
            ? Object.keys(tokenData).map((fileName) =>
                String(fileName).replace(".json", ""),
              )
            : [];

        return {
          categories,
          total: categories.length,
        };
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
        const tokenPath =
          args?.tokenPath != null ? String(args.tokenPath) : undefined;
        const category = validateStringParam(args?.category, "category");

        if (!tokenPath || tokenPath.trim() === "") {
          throw new Error("tokenPath is required");
        }

        const tokenData = await getTokenData();
        const categoriesToSearch =
          category != null && category !== ""
            ? [category]
            : tokenData && typeof tokenData === "object"
              ? Object.keys(tokenData)
              : [];

        for (const cat of categoriesToSearch) {
          const key = cat.endsWith(".json") ? cat : `${cat}.json`;
          const categoryData = tokenData?.[key] ?? tokenData?.[cat];
          if (!categoryData || typeof categoryData !== "object") continue;

          const token = findTokenByPath(categoryData, tokenPath);
          if (token) {
            return {
              path: tokenPath,
              category: cat.replace(".json", ""),
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
      handler: async (args) => {
        const useCase =
          args?.useCase != null ? String(args.useCase) : undefined;
        const componentType = validateStringParam(
          args?.componentType,
          "componentType",
        );

        if (!useCase || useCase.trim() === "") {
          throw new Error("useCase is required");
        }

        const data = await getTokenData();
        const recommendations = [];
        const useCaseLower = useCase.toLowerCase();
        const compTypeLower = (componentType ?? "").toLowerCase();

        const relevantCategories = [];
        for (const [pattern, categories] of Object.entries(USE_CASE_PATTERNS)) {
          if (
            useCaseLower.includes(pattern) ||
            compTypeLower.includes(pattern)
          ) {
            relevantCategories.push(...categories);
          }
        }

        const categoriesToSearch =
          relevantCategories.length > 0
            ? [...new Set(relevantCategories)]
            : data && typeof data === "object"
              ? Object.keys(data)
              : [];

        for (const category of categoriesToSearch) {
          const filename = category.includes(".json")
            ? category
            : `${category}.json`;
          const tokens = data?.[filename];
          if (!tokens || typeof tokens !== "object") continue;

          for (const [name, token] of Object.entries(tokens)) {
            if (!token || typeof token !== "object") continue;

            const nameMatch =
              name.toLowerCase().includes(useCaseLower) ||
              (componentType != null &&
                name.toLowerCase().includes(compTypeLower));
            const descMatch =
              token.description != null &&
              String(token.description).toLowerCase().includes(useCaseLower);

            if (nameMatch || descMatch) {
              recommendations.push({
                name,
                category: filename,
                value: token.value,
                description: token.description,
                schema: token.$schema,
                uuid: token.uuid,
                private: token.private === true,
                deprecated: token.deprecated === true,
                deprecated_comment: token.deprecated_comment,
                renamed: token.renamed,
                relevanceReason: nameMatch ? "name match" : "description match",
              });
            }
          }
        }

        recommendations.sort((a, b) => {
          if (a.private !== b.private) return a.private ? 1 : -1;
          if (a.relevanceReason !== b.relevanceReason) {
            return a.relevanceReason === "name match" ? -1 : 1;
          }
          return a.name.localeCompare(b.name);
        });

        return {
          useCase,
          componentType: componentType ?? undefined,
          recommendations: recommendations.slice(
            0,
            RESULT_LIMITS.MAX_TOKENS_BY_USE_CASE,
          ),
          totalFound: recommendations.length,
          searchedCategories: categoriesToSearch,
        };
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
      handler: async (args) => {
        const componentName =
          args?.componentName != null ? String(args.componentName) : undefined;
        if (!componentName || componentName.trim() === "") {
          throw new Error("componentName is required");
        }

        const data = await getTokenData();
        const componentTokens = [];
        const componentLower = componentName.toLowerCase();

        if (data && typeof data === "object") {
          for (const [cat, tokens] of Object.entries(data)) {
            if (!tokens || typeof tokens !== "object") continue;

            for (const [name, token] of Object.entries(tokens)) {
              if (!token || typeof token !== "object") continue;
              if (!name.toLowerCase().includes(componentLower)) continue;

              componentTokens.push({
                name,
                category: cat,
                value: token.value,
                description: token.description,
                schema: token.$schema,
                uuid: token.uuid,
                private: token.private === true,
                deprecated: token.deprecated === true,
                deprecated_comment: token.deprecated_comment,
                renamed: token.renamed,
              });
            }
          }
        }

        const groupedTokens = componentTokens.reduce((acc, token) => {
          const category = token.category;
          if (!acc[category]) acc[category] = [];
          acc[category].push(token);
          return acc;
        }, /** @type {Record<string, Array<unknown>>} */ ({}));

        return {
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
      handler: async (args) => {
        const intent = args?.intent != null ? String(args.intent) : undefined;
        const state = validateStringParam(args?.state, "state");
        const context = validateStringParam(args?.context, "context");

        if (!intent || intent.trim() === "") {
          throw new Error("intent is required");
        }

        const data = await getTokenData();
        const recommendations = {
          colors: [],
          layout: [],
          typography: [],
        };

        const intentLower = intent.toLowerCase();
        const stateLower = (state ?? "").toLowerCase();
        const contextLower = (context ?? "").toLowerCase();

        const semanticColors = data?.["semantic-color-palette.json"] ?? {};
        if (semanticColors && typeof semanticColors === "object") {
          for (const [name, token] of Object.entries(semanticColors)) {
            if (!token || typeof token !== "object") continue;
            const nameLower = name.toLowerCase();

            const intentMatch = tokenNameMatchesIntent(nameLower, intentLower);
            const stateMatch =
              !state || state === "" || nameLower.includes(stateLower);
            const contextMatch =
              !context || context === "" || nameLower.includes(contextLower);

            if (intentMatch && stateMatch && contextMatch) {
              recommendations.colors.push({
                name,
                value: token.value,
                category: "semantic-color-palette",
                type: "semantic",
                confidence: "high",
              });
            }
          }
        }

        if (recommendations.colors.length < 3) {
          const componentColors = data?.["color-component.json"] ?? {};
          if (componentColors && typeof componentColors === "object") {
            for (const [name, token] of Object.entries(componentColors)) {
              if (!token || typeof token !== "object") continue;
              const nameLower = name.toLowerCase();

              const intentMatch = nameLower.includes(intentLower);
              const contextMatch =
                !context || context === "" || nameLower.includes(contextLower);
              const stateMatch =
                !state || state === "" || nameLower.includes(stateLower);

              if ((intentMatch || contextMatch) && stateMatch) {
                recommendations.colors.push({
                  name,
                  value: token.value,
                  category: "color-component",
                  type: "component",
                  confidence: "medium",
                });
              }
            }
          }
        }

        const layoutContexts = [
          "button",
          "input",
          "spacing",
          "padding",
          "margin",
        ];
        if (context && layoutContexts.some((c) => contextLower.includes(c))) {
          const layoutComponent = data?.["layout-component.json"] ?? {};
          if (layoutComponent && typeof layoutComponent === "object") {
            for (const [name, token] of Object.entries(layoutComponent)) {
              if (!token || typeof token !== "object") continue;
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
            }
          }
        }

        const textContexts = ["text", "label", "heading", "body"];
        if (context && textContexts.some((c) => contextLower.includes(c))) {
          const typography = data?.["typography.json"] ?? {};
          if (typography && typeof typography === "object") {
            for (const [name, token] of Object.entries(typography)) {
              if (!token || typeof token !== "object") continue;
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
            }
          }
        }

        const confidenceOrder = { high: 0, medium: 1, low: 2 };
        for (const category of ["colors", "layout", "typography"]) {
          recommendations[category] = recommendations[category]
            .sort(
              (a, b) =>
                confidenceOrder[a.confidence] - confidenceOrder[b.confidence],
            )
            .slice(0, RESULT_LIMITS.MAX_DESIGN_RECOMMENDATIONS);
        }

        return {
          intent,
          state: state ?? undefined,
          context: context ?? undefined,
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
 * @param {string|undefined} type - Type filter
 * @returns {Array} Processed tokens
 */
function processTokens(tokens, fileName, query, type) {
  const results = [];
  if (!tokens || typeof tokens !== "object") return results;

  const category = String(fileName).replace(".json", "");

  function traverse(obj, path = "") {
    if (!obj || typeof obj !== "object") return;
    for (const [key, value] of Object.entries(obj)) {
      const currentPath = path ? `${path}.${key}` : key;

      if (value != null && typeof value === "object") {
        if (value.$value !== undefined || value.value !== undefined) {
          const tokenType = value.$type ?? value.type ?? "unknown";

          if (type != null && type !== "" && tokenType !== type) {
            continue;
          }

          if (
            query != null &&
            query !== "" &&
            !matchesQuery(currentPath, value, query)
          ) {
            continue;
          }

          results.push({
            name: key,
            category,
            type: tokenType,
            value: value.$value ?? value.value,
            description: value.$description ?? value.description,
            extensions: value.$extensions ?? value.extensions,
            uuid: value.uuid,
            private: value.private === true,
            deprecated: value.deprecated === true,
            deprecated_comment: value.deprecated_comment,
            renamed: value.renamed,
          });
        } else {
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
  if (!tokens || typeof tokens !== "object" || !path) return null;
  const parts = String(path).split(".");
  let current = tokens;

  for (const part of parts) {
    if (
      current == null ||
      typeof current !== "object" ||
      current[part] === undefined
    ) {
      return null;
    }
    current = current[part];
  }

  return current != null && typeof current === "object" ? current : null;
}

/**
 * Check if a token matches the search query
 * @param {string} path - Token path
 * @param {Object} token - Token object
 * @param {string} query - Search query
 * @returns {boolean} Whether the token matches
 */
function matchesQuery(path, token, query) {
  const searchText = String(query).toLowerCase();

  if (String(path).toLowerCase().includes(searchText)) {
    return true;
  }

  const description = token?.$description ?? token?.description ?? "";
  if (String(description).toLowerCase().includes(searchText)) {
    return true;
  }

  const value = token?.$value ?? token?.value ?? "";
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
