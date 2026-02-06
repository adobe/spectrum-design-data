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

import { readFile } from "fs/promises";
import { resolve, basename } from "path";
import { glob } from "glob";
import * as url from "url";

const __dirname = url.fileURLToPath(new URL(".", import.meta.url));

/**
 * Default path to the tokens package source directory.
 */
const DEFAULT_TOKENS_SRC = resolve(
  __dirname,
  "../../..",
  "packages/tokens/src",
);

/**
 * Default path to the component-schemas package.
 */
const DEFAULT_COMPONENT_SCHEMAS = resolve(
  __dirname,
  "../../..",
  "packages/component-schemas/schemas/components",
);

/**
 * Default path to the design-system-registry components list.
 */
const DEFAULT_REGISTRY_COMPONENTS = resolve(
  __dirname,
  "../../..",
  "packages/design-system-registry/registry/components.json",
);

/**
 * Read and parse a JSON file.
 * @param {string} filePath - Path to JSON file
 * @returns {Promise<object>} Parsed JSON
 */
async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

/**
 * Extract the token type from a $schema URL.
 * @param {string} schemaUrl - The $schema value from a token
 * @returns {string} The token type name (e.g., "alias", "color", "dimension")
 */
export function extractTokenType(schemaUrl) {
  if (!schemaUrl) return "unknown";
  const match = schemaUrl.match(/token-types\/(.+)\.json$/);
  return match ? match[1] : "unknown";
}

/**
 * Check whether a token value is an alias reference (e.g., "{gray-800}").
 * @param {*} value - The token value
 * @returns {boolean}
 */
export function isAliasValue(value) {
  return typeof value === "string" && /^\{[\w-]+\}$/.test(value);
}

/**
 * Extract the referenced token name from an alias value.
 * @param {string} value - Alias value like "{gray-800}"
 * @returns {string|null} The referenced token name, or null
 */
export function extractAliasReference(value) {
  if (!isAliasValue(value)) return null;
  return value.slice(1, -1);
}

/**
 * Determine whether a token is set-based (has `sets` property at the top level).
 * @param {object} token - Token definition
 * @returns {boolean}
 */
export function isSetToken(token) {
  return Object.hasOwn(token, "sets") && typeof token.sets === "object";
}

/**
 * Determine the set type (color theme set vs scale set vs other).
 * @param {object} token - Token definition with sets
 * @returns {string} "color-theme" | "scale" | "other"
 */
export function getSetType(token) {
  if (!isSetToken(token)) return "none";
  const keys = Object.keys(token.sets);
  const hasThemeKeys = keys.some((k) =>
    ["light", "dark", "wireframe"].includes(k),
  );
  const hasScaleKeys = keys.some((k) => ["desktop", "mobile"].includes(k));
  if (hasThemeKeys) return "color-theme";
  if (hasScaleKeys) return "scale";
  return "other";
}

/**
 * Check whether a token is deprecated.
 * @param {object} token - Token definition
 * @returns {boolean}
 */
export function isDeprecated(token) {
  if (Object.hasOwn(token, "deprecated") && token.deprecated === true) {
    return true;
  }
  if (isSetToken(token)) {
    return Object.values(token.sets).every(
      (setValue) =>
        Object.hasOwn(setValue, "deprecated") && setValue.deprecated === true,
    );
  }
  return false;
}

/**
 * Check whether a deprecated token has a `renamed` migration path.
 * @param {object} token - Token definition
 * @returns {boolean}
 */
export function hasRenamedPath(token) {
  return isDeprecated(token) && Object.hasOwn(token, "renamed");
}

/**
 * Load all token files from the source directory.
 * @param {string} srcDir - Path to the tokens/src directory
 * @returns {Promise<Map<string, object>>} Map of filename to parsed token data
 */
export async function loadTokenFiles(srcDir = DEFAULT_TOKENS_SRC) {
  const files = await glob(`${srcDir}/**/*.json`);
  const tokenFiles = new Map();
  for (const file of files) {
    const data = await readJson(file);
    tokenFiles.set(basename(file), data);
  }
  return tokenFiles;
}

/**
 * Flatten all tokens from all files into a single Map keyed by token name.
 * @param {Map<string, object>} tokenFiles - Map of filename to token data
 * @returns {Map<string, {token: object, sourceFile: string}>}
 */
export function flattenTokens(tokenFiles) {
  const allTokens = new Map();
  for (const [fileName, fileData] of tokenFiles) {
    for (const [tokenName, tokenDef] of Object.entries(fileData)) {
      allTokens.set(tokenName, { token: tokenDef, sourceFile: fileName });
    }
  }
  return allTokens;
}

/**
 * Compute all metrics from the token data.
 * @param {Map<string, object>} tokenFiles - Map of filename to token data
 * @returns {object} Comprehensive metrics report
 */
export function computeMetrics(tokenFiles) {
  const allTokens = flattenTokens(tokenFiles);

  // ---- 1. Total token count ----
  const totalTokens = allTokens.size;

  // ---- 2. Tokens by source file ----
  const tokensByFile = {};
  for (const [fileName, fileData] of tokenFiles) {
    tokensByFile[fileName] = Object.keys(fileData).length;
  }

  // ---- 3. Tokens by schema type ----
  const tokensByType = {};
  for (const [, { token }] of allTokens) {
    const type = extractTokenType(token.$schema);
    tokensByType[type] = (tokensByType[type] || 0) + 1;
  }

  // ---- 4. Component tokens vs global tokens ----
  const componentTokens = new Map();
  const globalTokens = new Map();
  for (const [name, entry] of allTokens) {
    if (entry.token.component) {
      componentTokens.set(name, entry);
    } else {
      globalTokens.set(name, entry);
    }
  }

  // ---- 5. Component breakdown ----
  const componentBreakdown = {};
  for (const [, entry] of componentTokens) {
    const comp = entry.token.component;
    if (!componentBreakdown[comp]) {
      componentBreakdown[comp] = { count: 0, deprecated: 0 };
    }
    componentBreakdown[comp].count++;
    if (isDeprecated(entry.token)) {
      componentBreakdown[comp].deprecated++;
    }
  }

  // ---- 6. Deprecation metrics ----
  let deprecatedCount = 0;
  let deprecatedWithRenamedCount = 0;
  const deprecatedTokenNames = [];
  for (const [name, { token }] of allTokens) {
    if (isDeprecated(token)) {
      deprecatedCount++;
      deprecatedTokenNames.push(name);
      if (hasRenamedPath(token)) {
        deprecatedWithRenamedCount++;
      }
    }
  }

  // ---- 7. Alias analysis ----
  let aliasCount = 0;
  let directValueCount = 0;
  const aliasReferences = {};
  for (const [, { token }] of allTokens) {
    if (isSetToken(token)) {
      // Check set values
      for (const setValue of Object.values(token.sets)) {
        if (isAliasValue(setValue.value)) {
          const ref = extractAliasReference(setValue.value);
          aliasReferences[ref] = (aliasReferences[ref] || 0) + 1;
        }
      }
    } else if (isAliasValue(token.value)) {
      aliasCount++;
      const ref = extractAliasReference(token.value);
      aliasReferences[ref] = (aliasReferences[ref] || 0) + 1;
    } else {
      directValueCount++;
    }
  }

  // ---- 8. Set-based token analysis ----
  let colorThemeSetCount = 0;
  let scaleSetCount = 0;
  let otherSetCount = 0;
  for (const [, { token }] of allTokens) {
    const setType = getSetType(token);
    if (setType === "color-theme") colorThemeSetCount++;
    else if (setType === "scale") scaleSetCount++;
    else if (setType === "other") otherSetCount++;
  }

  // ---- 9. UUID coverage ----
  let tokensWithUuid = 0;
  let tokensWithoutUuid = 0;
  for (const [, { token }] of allTokens) {
    if (isSetToken(token)) {
      // For set tokens, check inner values
      const allHaveUuids = Object.values(token.sets).every(
        (sv) => sv.uuid !== undefined,
      );
      if (allHaveUuids) tokensWithUuid++;
      else tokensWithoutUuid++;
    } else {
      if (token.uuid) tokensWithUuid++;
      else tokensWithoutUuid++;
    }
  }

  // ---- 10. Private tokens ----
  let privateCount = 0;
  for (const [, { token }] of allTokens) {
    if (token.private === true) privateCount++;
  }

  // ---- 11. Most-referenced tokens (alias targets) ----
  const topAliasTargets = Object.entries(aliasReferences)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([name, count]) => ({ name, referenceCount: count }));

  // ---- 12. Naming pattern analysis ----
  const namingCategories = {};
  for (const [name] of allTokens) {
    // Extract first segment as category
    const firstSegment = name.split("-")[0];
    namingCategories[firstSegment] = (namingCategories[firstSegment] || 0) + 1;
  }
  const topNamingCategories = Object.entries(namingCategories)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([prefix, count]) => ({ prefix, count }));

  // ---- 13. Alias chain depth analysis ----
  const aliasDepths = computeAliasDepths(allTokens);

  // ---- 14. Token categories (semantic grouping) ----
  const semanticCategories = categorizeTokens(allTokens);

  return {
    generatedAt: new Date().toISOString(),
    summary: {
      totalTokens,
      activeTokens: totalTokens - deprecatedCount,
      deprecatedTokens: deprecatedCount,
      deprecationRate: parseFloat(
        ((deprecatedCount / totalTokens) * 100).toFixed(1),
      ),
      deprecatedWithMigrationPath: deprecatedWithRenamedCount,
      migrationPathCoverage:
        deprecatedCount > 0
          ? parseFloat(
              ((deprecatedWithRenamedCount / deprecatedCount) * 100).toFixed(1),
            )
          : 100,
      componentTokenCount: componentTokens.size,
      globalTokenCount: globalTokens.size,
      uniqueComponents: Object.keys(componentBreakdown).length,
      privateTokens: privateCount,
    },
    tokensByFile,
    tokensByType,
    componentBreakdown,
    deprecatedTokens: deprecatedTokenNames,
    aliasAnalysis: {
      aliasTokens: aliasCount,
      directValueTokens: directValueCount,
      setBasedTokens: {
        colorTheme: colorThemeSetCount,
        scale: scaleSetCount,
        other: otherSetCount,
        total: colorThemeSetCount + scaleSetCount + otherSetCount,
      },
      topAliasTargets,
    },
    uuidCoverage: {
      withUuid: tokensWithUuid,
      withoutUuid: tokensWithoutUuid,
      coveragePercent: parseFloat(
        ((tokensWithUuid / totalTokens) * 100).toFixed(1),
      ),
    },
    namingPatterns: topNamingCategories,
    aliasChainDepth: aliasDepths,
    semanticCategories,
  };
}

/**
 * Compute alias chain depths to find deeply nested references.
 * @param {Map<string, {token: object, sourceFile: string}>} allTokens
 * @returns {object} Depth analysis
 */
function computeAliasDepths(allTokens) {
  const depthCache = new Map();

  function getDepth(tokenName, visited = new Set()) {
    if (depthCache.has(tokenName)) return depthCache.get(tokenName);
    if (visited.has(tokenName)) return 0; // Circular reference guard
    visited.add(tokenName);

    const entry = allTokens.get(tokenName);
    if (!entry) return 0;

    const { token } = entry;
    if (isSetToken(token)) {
      // For set tokens, take the max depth of inner values
      let maxDepth = 0;
      for (const setValue of Object.values(token.sets)) {
        if (isAliasValue(setValue.value)) {
          const ref = extractAliasReference(setValue.value);
          maxDepth = Math.max(maxDepth, 1 + getDepth(ref, new Set(visited)));
        }
      }
      depthCache.set(tokenName, maxDepth);
      return maxDepth;
    }

    if (isAliasValue(token.value)) {
      const ref = extractAliasReference(token.value);
      const depth = 1 + getDepth(ref, new Set(visited));
      depthCache.set(tokenName, depth);
      return depth;
    }

    depthCache.set(tokenName, 0);
    return 0;
  }

  for (const [name] of allTokens) {
    getDepth(name);
  }

  // Distribution
  const distribution = {};
  let maxDepth = 0;
  let maxDepthToken = "";
  for (const [name, depth] of depthCache) {
    distribution[depth] = (distribution[depth] || 0) + 1;
    if (depth > maxDepth) {
      maxDepth = depth;
      maxDepthToken = name;
    }
  }

  return {
    maxDepth,
    maxDepthToken,
    distribution,
  };
}

/**
 * Categorize tokens into semantic groups based on naming patterns.
 * @param {Map<string, {token: object, sourceFile: string}>} allTokens
 * @returns {object} Category counts
 */
function categorizeTokens(allTokens) {
  const categories = {
    background: 0,
    border: 0,
    content: 0,
    typography: 0,
    layout: 0,
    color: 0,
    shadow: 0,
    opacity: 0,
    icon: 0,
    other: 0,
  };

  for (const [name] of allTokens) {
    if (name.includes("background")) categories.background++;
    else if (name.includes("border")) categories.border++;
    else if (name.includes("content") || name.includes("text"))
      categories.content++;
    else if (
      name.includes("font") ||
      name.includes("letter") ||
      name.includes("line-height")
    )
      categories.typography++;
    else if (
      name.includes("spacing") ||
      name.includes("size") ||
      name.includes("width") ||
      name.includes("height") ||
      name.includes("radius") ||
      name.includes("margin") ||
      name.includes("padding") ||
      name.includes("edge") ||
      name.includes("top-to") ||
      name.includes("bottom-to")
    )
      categories.layout++;
    else if (name.includes("color") || name.includes("visual"))
      categories.color++;
    else if (name.includes("shadow") || name.includes("elevation"))
      categories.shadow++;
    else if (name.includes("opacity")) categories.opacity++;
    else if (name.includes("icon")) categories.icon++;
    else categories.other++;
  }

  return categories;
}

/**
 * Load registered components from the design-system-registry.
 * @param {string} registryPath - Path to components.json
 * @returns {Promise<string[]>} Array of component IDs
 */
export async function loadRegisteredComponents(
  registryPath = DEFAULT_REGISTRY_COMPONENTS,
) {
  try {
    const data = await readJson(registryPath);
    return data.values.map((c) => c.id);
  } catch {
    return [];
  }
}

/**
 * Load component schemas to identify which components have formal schema definitions.
 * @param {string} schemasDir - Path to component-schemas/schemas/components
 * @returns {Promise<string[]>} Array of component IDs with schemas
 */
export async function loadComponentSchemas(
  schemasDir = DEFAULT_COMPONENT_SCHEMAS,
) {
  try {
    const files = await glob(`${schemasDir}/*.json`);
    return files.map((f) => basename(f, ".json"));
  } catch {
    return [];
  }
}

/**
 * Compute component coverage: which registered components have tokens and/or schemas.
 * @param {Map<string, object>} tokenFiles - Token file data
 * @param {string} registryPath - Path to components.json
 * @param {string} schemasDir - Path to component schemas directory
 * @returns {Promise<object>} Component coverage report
 */
export async function computeComponentCoverage(
  tokenFiles,
  registryPath = DEFAULT_REGISTRY_COMPONENTS,
  schemasDir = DEFAULT_COMPONENT_SCHEMAS,
) {
  const allTokens = flattenTokens(tokenFiles);
  const registeredComponents = await loadRegisteredComponents(registryPath);
  const schemaComponents = await loadComponentSchemas(schemasDir);

  // Components that have tokens
  const componentsWithTokens = new Set();
  for (const [, { token }] of allTokens) {
    if (token.component) {
      componentsWithTokens.add(token.component);
    }
  }

  const coverage = registeredComponents.map((compId) => ({
    id: compId,
    hasTokens: componentsWithTokens.has(compId),
    hasSchema: schemaComponents.includes(compId),
  }));

  const withTokens = coverage.filter((c) => c.hasTokens).length;
  const withSchema = coverage.filter((c) => c.hasSchema).length;
  const withBoth = coverage.filter((c) => c.hasTokens && c.hasSchema).length;

  return {
    registeredComponentCount: registeredComponents.length,
    componentsWithTokens: withTokens,
    componentsWithSchema: withSchema,
    componentsWithBoth: withBoth,
    tokenCoveragePercent: parseFloat(
      ((withTokens / registeredComponents.length) * 100).toFixed(1),
    ),
    schemaCoveragePercent: parseFloat(
      ((withSchema / registeredComponents.length) * 100).toFixed(1),
    ),
    details: coverage,
    tokensOnlyComponents: [...componentsWithTokens].filter(
      (c) => !registeredComponents.includes(c),
    ),
  };
}

/**
 * Generate the full metrics report including component coverage.
 * @param {object} options - Configuration options
 * @param {string} options.tokensSrc - Path to tokens/src directory
 * @param {string} options.registryPath - Path to components.json
 * @param {string} options.schemasDir - Path to component schemas
 * @returns {Promise<object>} Full metrics report
 */
export async function generateMetricsReport(options = {}) {
  const {
    tokensSrc = DEFAULT_TOKENS_SRC,
    registryPath = DEFAULT_REGISTRY_COMPONENTS,
    schemasDir = DEFAULT_COMPONENT_SCHEMAS,
  } = options;

  const tokenFiles = await loadTokenFiles(tokensSrc);
  const metrics = computeMetrics(tokenFiles);
  const componentCoverage = await computeComponentCoverage(
    tokenFiles,
    registryPath,
    schemasDir,
  );

  return {
    ...metrics,
    componentCoverage,
  };
}

export default generateMetricsReport;
