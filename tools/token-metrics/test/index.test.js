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

import test from "ava";
import {
  extractTokenType,
  isAliasValue,
  extractAliasReference,
  isSetToken,
  getSetType,
  isDeprecated,
  hasRenamedPath,
  flattenTokens,
  computeMetrics,
} from "../src/index.js";

// --- extractTokenType ---

test("extractTokenType extracts type from schema URL", (t) => {
  t.is(
    extractTokenType(
      "https://opensource.adobe.com/spectrum-design-data/schemas/token-types/alias.json",
    ),
    "alias",
  );
  t.is(
    extractTokenType(
      "https://opensource.adobe.com/spectrum-design-data/schemas/token-types/color.json",
    ),
    "color",
  );
  t.is(
    extractTokenType(
      "https://opensource.adobe.com/spectrum-design-data/schemas/token-types/dimension.json",
    ),
    "dimension",
  );
  t.is(
    extractTokenType(
      "https://opensource.adobe.com/spectrum-design-data/schemas/token-types/color-set.json",
    ),
    "color-set",
  );
});

test("extractTokenType returns unknown for missing or invalid schema", (t) => {
  t.is(extractTokenType(undefined), "unknown");
  t.is(extractTokenType(null), "unknown");
  t.is(extractTokenType(""), "unknown");
  t.is(extractTokenType("not-a-url"), "unknown");
});

// --- isAliasValue ---

test("isAliasValue identifies alias references", (t) => {
  t.true(isAliasValue("{gray-800}"));
  t.true(isAliasValue("{blue-100}"));
  t.true(isAliasValue("{accent-color-900}"));
});

test("isAliasValue rejects non-alias values", (t) => {
  t.false(isAliasValue("10px"));
  t.false(isAliasValue("rgba(0, 0, 0, 0.12)"));
  t.false(isAliasValue("0.4"));
  t.false(isAliasValue(42));
  t.false(isAliasValue(null));
  t.false(isAliasValue(undefined));
});

// --- extractAliasReference ---

test("extractAliasReference extracts the token name from alias value", (t) => {
  t.is(extractAliasReference("{gray-800}"), "gray-800");
  t.is(extractAliasReference("{accent-color-900}"), "accent-color-900");
});

test("extractAliasReference returns null for non-alias values", (t) => {
  t.is(extractAliasReference("10px"), null);
  t.is(extractAliasReference(null), null);
});

// --- isSetToken ---

test("isSetToken identifies set-based tokens", (t) => {
  t.true(
    isSetToken({
      sets: {
        light: { value: "{gray-100}", uuid: "abc" },
        dark: { value: "{gray-300}", uuid: "def" },
      },
    }),
  );
});

test("isSetToken rejects non-set tokens", (t) => {
  t.false(isSetToken({ value: "{gray-800}", uuid: "abc" }));
  t.false(isSetToken({ value: "10px", uuid: "abc" }));
});

// --- getSetType ---

test("getSetType identifies color theme sets", (t) => {
  t.is(
    getSetType({
      sets: {
        light: { value: "{gray-100}" },
        dark: { value: "{gray-300}" },
        wireframe: { value: "{gray-100}" },
      },
    }),
    "color-theme",
  );
});

test("getSetType identifies scale sets", (t) => {
  t.is(
    getSetType({
      sets: {
        desktop: { value: "14px" },
        mobile: { value: "18px" },
      },
    }),
    "scale",
  );
});

test("getSetType returns none for non-set tokens", (t) => {
  t.is(getSetType({ value: "10px", uuid: "abc" }), "none");
});

// --- isDeprecated ---

test("isDeprecated identifies deprecated tokens", (t) => {
  t.true(isDeprecated({ deprecated: true, value: "{foo}", uuid: "abc" }));
});

test("isDeprecated identifies deprecated set tokens where all sets are deprecated", (t) => {
  t.true(
    isDeprecated({
      sets: {
        light: { deprecated: true, value: "{a}", uuid: "1" },
        dark: { deprecated: true, value: "{b}", uuid: "2" },
      },
    }),
  );
});

test("isDeprecated returns false for active tokens", (t) => {
  t.false(isDeprecated({ value: "{gray-800}", uuid: "abc" }));
  t.false(
    isDeprecated({ deprecated: false, value: "{gray-800}", uuid: "abc" }),
  );
});

// --- hasRenamedPath ---

test("hasRenamedPath identifies tokens with migration path", (t) => {
  t.true(
    hasRenamedPath({
      deprecated: true,
      renamed: "new-token-name",
      value: "{new-token-name}",
      uuid: "abc",
    }),
  );
});

test("hasRenamedPath returns false for deprecated without renamed", (t) => {
  t.false(hasRenamedPath({ deprecated: true, value: "{foo}", uuid: "abc" }));
});

test("hasRenamedPath returns false for non-deprecated", (t) => {
  t.false(hasRenamedPath({ value: "{foo}", uuid: "abc" }));
});

// --- flattenTokens ---

test("flattenTokens merges all token files into a single map", (t) => {
  const tokenFiles = new Map([
    [
      "file1.json",
      {
        "token-a": { value: "10px", uuid: "1" },
        "token-b": { value: "{gray-800}", uuid: "2" },
      },
    ],
    [
      "file2.json",
      {
        "token-c": { value: "bold", uuid: "3" },
      },
    ],
  ]);

  const flat = flattenTokens(tokenFiles);
  t.is(flat.size, 3);
  t.is(flat.get("token-a").sourceFile, "file1.json");
  t.is(flat.get("token-c").sourceFile, "file2.json");
});

// --- computeMetrics ---

test("computeMetrics produces a valid metrics report from token data", (t) => {
  const tokenFiles = new Map([
    [
      "colors.json",
      {
        "bg-color": {
          $schema:
            "https://opensource.adobe.com/spectrum-design-data/schemas/token-types/alias.json",
          value: "{gray-800}",
          uuid: "1",
        },
        "deprecated-color": {
          $schema:
            "https://opensource.adobe.com/spectrum-design-data/schemas/token-types/alias.json",
          value: "{new-color}",
          uuid: "2",
          deprecated: true,
          renamed: "new-color",
        },
        "theme-color": {
          $schema:
            "https://opensource.adobe.com/spectrum-design-data/schemas/token-types/color-set.json",
          sets: {
            light: {
              $schema:
                "https://opensource.adobe.com/spectrum-design-data/schemas/token-types/alias.json",
              value: "{gray-100}",
              uuid: "3a",
            },
            dark: {
              $schema:
                "https://opensource.adobe.com/spectrum-design-data/schemas/token-types/alias.json",
              value: "{gray-300}",
              uuid: "3b",
            },
          },
        },
      },
    ],
    [
      "layout.json",
      {
        "button-width": {
          $schema:
            "https://opensource.adobe.com/spectrum-design-data/schemas/token-types/dimension.json",
          value: "120px",
          uuid: "4",
          component: "button",
        },
        "scale-token": {
          $schema:
            "https://opensource.adobe.com/spectrum-design-data/schemas/token-types/scale-set.json",
          sets: {
            desktop: {
              $schema:
                "https://opensource.adobe.com/spectrum-design-data/schemas/token-types/dimension.json",
              value: "14px",
              uuid: "5a",
            },
            mobile: {
              $schema:
                "https://opensource.adobe.com/spectrum-design-data/schemas/token-types/dimension.json",
              value: "18px",
              uuid: "5b",
            },
          },
        },
      },
    ],
  ]);

  const metrics = computeMetrics(tokenFiles);

  // Total tokens
  t.is(metrics.summary.totalTokens, 5);

  // Active tokens (5 - 1 deprecated = 4)
  t.is(metrics.summary.activeTokens, 4);

  // Deprecated
  t.is(metrics.summary.deprecatedTokens, 1);
  t.is(metrics.summary.deprecatedWithMigrationPath, 1);
  t.is(metrics.summary.migrationPathCoverage, 100);

  // Component tokens
  t.is(metrics.summary.componentTokenCount, 1);
  t.is(metrics.summary.globalTokenCount, 4);
  t.is(metrics.summary.uniqueComponents, 1);

  // Tokens by file
  t.is(metrics.tokensByFile["colors.json"], 3);
  t.is(metrics.tokensByFile["layout.json"], 2);

  // Token types
  t.is(metrics.tokensByType["alias"], 2);
  t.is(metrics.tokensByType["color-set"], 1);
  t.is(metrics.tokensByType["dimension"], 1);
  t.is(metrics.tokensByType["scale-set"], 1);

  // Alias analysis
  t.is(metrics.aliasAnalysis.aliasTokens, 2); // bg-color and deprecated-color
  t.is(metrics.aliasAnalysis.directValueTokens, 1); // button-width
  t.is(metrics.aliasAnalysis.setBasedTokens.colorTheme, 1);
  t.is(metrics.aliasAnalysis.setBasedTokens.scale, 1);

  // UUID coverage
  t.is(metrics.uuidCoverage.coveragePercent, 100);

  // Component breakdown
  t.truthy(metrics.componentBreakdown["button"]);
  t.is(metrics.componentBreakdown["button"].count, 1);

  // Semantic categories
  t.truthy(metrics.semanticCategories);

  // Alias chain depth
  t.truthy(metrics.aliasChainDepth);
  t.is(typeof metrics.aliasChainDepth.maxDepth, "number");
});

test("computeMetrics handles empty token files", (t) => {
  const tokenFiles = new Map();
  const metrics = computeMetrics(tokenFiles);
  t.is(metrics.summary.totalTokens, 0);
  t.is(metrics.summary.activeTokens, 0);
});

// --- Integration: metrics from real token data ---

test("computeMetrics with real token data produces reasonable results", async (t) => {
  // This test uses the actual token files to validate the tool against the real codebase
  const { loadTokenFiles, computeMetrics: compute } =
    await import("../src/index.js");
  const tokenFiles = await loadTokenFiles();
  const metrics = compute(tokenFiles);

  // Sanity checks against the real data
  t.true(metrics.summary.totalTokens > 2000, "should have > 2000 tokens");
  t.true(
    metrics.summary.activeTokens > 1800,
    "should have > 1800 active tokens",
  );
  t.true(
    metrics.summary.deprecatedTokens > 0,
    "should have some deprecated tokens",
  );
  t.true(
    metrics.summary.deprecationRate < 20,
    "deprecation rate should be < 20%",
  );
  t.true(
    metrics.summary.uniqueComponents > 30,
    "should have > 30 unique components with tokens",
  );
  t.is(
    metrics.uuidCoverage.coveragePercent,
    100,
    "all tokens should have UUIDs",
  );
  t.true(
    metrics.aliasChainDepth.maxDepth <= 10,
    "alias chain depth should be reasonable",
  );
});
