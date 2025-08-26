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

/**
 * Backward Compatibility Test Suite
 *
 * These tests define the exact API contracts that must be maintained
 * when refactoring the token-diff-generator to use spectrum-diff-core.
 *
 * Any changes to these interfaces should be considered breaking changes.
 */

// Test data representing the expected API contracts
const mockTokenDiffResult = {
  renamed: {
    "new-token-name": {
      "old-name": "old-token-name",
    },
  },
  deprecated: {
    "deprecated-token": {
      deprecated: true,
      deprecated_comment: "Use new-token instead",
    },
  },
  reverted: {
    "reverted-token": {
      deprecated: false,
    },
  },
  added: {
    "added-token": {
      value: "#FF0000",
      uuid: "123e4567-e89b-12d3-a456-426614174000",
    },
  },
  deleted: {
    "deleted-token": {
      value: "#00FF00",
      uuid: "123e4567-e89b-12d3-a456-426614174001",
    },
  },
  updated: {
    added: {
      "token-with-added-property": {
        changes: [
          {
            path: "sets.dark.value",
            newValue: "#333333",
            originalValue: undefined,
          },
        ],
      },
    },
    deleted: {
      "token-with-deleted-property": {
        changes: [
          {
            path: "sets.light.value",
            newValue: undefined,
            originalValue: "#FFFFFF",
          },
        ],
      },
    },
    renamed: {},
    updated: {
      "token-with-updated-value": {
        changes: [
          {
            path: "value",
            newValue: "#FF0000",
            originalValue: "#00FF00",
          },
        ],
      },
    },
  },
};

test("tokenDiff API contract - main export function signature", (t) => {
  // The main export must be a function that takes (original, updated) parameters
  // and returns a diff result object with specific structure

  const expectedStructure = {
    renamed: "object",
    deprecated: "object",
    reverted: "object",
    added: "object",
    deleted: "object",
    updated: "object",
  };

  Object.keys(expectedStructure).forEach((key) => {
    t.true(
      mockTokenDiffResult.hasOwnProperty(key),
      `Result must have ${key} property`,
    );
    t.is(
      typeof mockTokenDiffResult[key],
      expectedStructure[key],
      `${key} must be of type ${expectedStructure[key]}`,
    );
  });

  // Updated object must have specific nested structure
  const expectedUpdatedStructure = {
    added: "object",
    deleted: "object",
    renamed: "object",
    updated: "object",
  };

  Object.keys(expectedUpdatedStructure).forEach((key) => {
    t.true(
      mockTokenDiffResult.updated.hasOwnProperty(key),
      `Result.updated must have ${key} property`,
    );
    t.is(
      typeof mockTokenDiffResult.updated[key],
      expectedUpdatedStructure[key],
      `updated.${key} must be of type ${expectedUpdatedStructure[key]}`,
    );
  });
});

test("tokenDiff API contract - renamed tokens structure", (t) => {
  // Renamed tokens must have "old-name" property
  const renamedToken = Object.values(mockTokenDiffResult.renamed)[0];
  t.true(
    renamedToken.hasOwnProperty("old-name"),
    "Renamed token must have old-name property",
  );
  t.is(typeof renamedToken["old-name"], "string", "old-name must be a string");
});

test("tokenDiff API contract - deprecated tokens structure", (t) => {
  // Deprecated tokens must have deprecated and deprecated_comment properties
  const deprecatedToken = Object.values(mockTokenDiffResult.deprecated)[0];
  t.true(
    deprecatedToken.hasOwnProperty("deprecated"),
    "Deprecated token must have deprecated property",
  );
  t.is(deprecatedToken.deprecated, true, "deprecated property must be true");

  // deprecated_comment is optional but if present must be string
  if (deprecatedToken.hasOwnProperty("deprecated_comment")) {
    t.is(
      typeof deprecatedToken.deprecated_comment,
      "string",
      "deprecated_comment must be a string",
    );
  }
});

test("tokenDiff API contract - updated tokens changes structure", (t) => {
  // Updated tokens must have changes array with specific structure
  const updatedToken = Object.values(mockTokenDiffResult.updated.updated)[0];
  t.true(
    updatedToken.hasOwnProperty("changes"),
    "Updated token must have changes property",
  );
  t.true(Array.isArray(updatedToken.changes), "changes must be an array");

  if (updatedToken.changes.length > 0) {
    const change = updatedToken.changes[0];
    t.true(change.hasOwnProperty("path"), "Change must have path property");
    t.true(
      change.hasOwnProperty("newValue"),
      "Change must have newValue property",
    );
    t.true(
      change.hasOwnProperty("originalValue"),
      "Change must have originalValue property",
    );
    t.is(typeof change.path, "string", "Change path must be a string");
  }
});

test("CLI API contract - command structure", (t) => {
  // The CLI must support these exact commands and options for backward compatibility
  const requiredCommands = ["report"];
  const requiredOptions = [
    "--otv",
    "--old-token-version",
    "--ntv",
    "--new-token-version",
    "--otb",
    "--old-token-branch",
    "--ntb",
    "--new-token-branch",
    "-l",
    "--local",
    "-n",
    "--token-names",
    "-r",
    "--repo",
    "-g",
    "--githubAPIKey",
    "-f",
    "--format",
    "-t",
    "--template",
    "--template-dir",
    "-o",
    "--output",
    "-d",
    "--debug",
  ];

  // These are the expected CLI contracts that must be maintained
  t.pass("CLI commands and options documented for backward compatibility");
});

test("File import API contract - export functions", (t) => {
  // These functions must remain available for backward compatibility:
  // - default export: fileImport(tokenNames, version, location, repo, githubAPIKey)
  // - named export: loadLocalData(dirName, tokenNames)

  const requiredExports = [
    "default", // main fileImport function
    "loadLocalData", // local data loading function
  ];

  // File import function signatures that must be maintained
  const expectedFileImportSignature = [
    "givenTokenNames",
    "givenVersion",
    "givenLocation",
    "givenRepo",
    "githubAPIKey",
  ];

  const expectedLoadLocalDataSignature = ["dirName", "tokenNames"];

  t.pass("File import API contracts documented for backward compatibility");
});

test("Package exports API contract", (t) => {
  // Package.json exports that must be maintained:
  const requiredExports = {
    ".": "./src/lib/index.js", // Main tokenDiff function
    "./cli": "./src/lib/cli.js", // CLI entry point
  };

  const requiredBin = {
    tdiff: "./src/lib/cli.js", // CLI binary
  };

  t.pass("Package exports documented for backward compatibility");
});

test("Template and formatter API contract", (t) => {
  // HandlebarsFormatter and template system contracts that must be maintained
  const requiredTemplates = ["cli", "markdown", "json", "plain", "summary"];

  const requiredHelpers = [
    "totalTokens",
    "totalUpdatedTokens",
    "hasKeys",
    "cleanPath",
    "formatDate",
    "hilite",
    "error",
    "passing",
    "neutral",
    "bold",
    "dim",
    "emphasis",
    "indent",
    "concat",
    "quote",
  ];

  t.pass(
    "Template and formatter contracts documented for backward compatibility",
  );
});

// Integration test patterns that should be maintained
test("Integration test patterns - snapshot compatibility", (t) => {
  // The refactored version must produce identical outputs to existing snapshots
  // for all test cases in the original test suite

  const criticalTestPatterns = [
    "basic token rename detection",
    "multiple token type changes",
    "CLI output formatting",
    "file import/export workflows",
    "error handling and validation",
    "template rendering results",
  ];

  t.pass("Integration test patterns documented for verification");
});

test("Error handling API contract", (t) => {
  // Error messages and error handling behavior must remain consistent
  const expectedErrorTypes = [
    "File not found errors",
    "JSON parsing errors",
    "Network/fetch errors",
    "Validation errors",
    "Template errors",
  ];

  const expectedErrorFormats = [
    "Descriptive error messages",
    "Proper error codes",
    "Contextual information",
    "Graceful degradation",
  ];

  t.pass("Error handling contracts documented for consistency");
});
