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

import test from "ava";
import { detailedDiff } from "../src/lib/diff.js";
import detectUpdatedTokens from "../src/lib/updated-token-detection.js";
import detectRenamedTokens from "../src/lib/renamed-token-detection.js";
import detectNewTokens from "../src/lib/added-token-detection.js";
import detectDeprecatedTokens from "../src/lib/deprecated-token-detection.js";

test("updatedToken › handles reserved property names correctly", (t) => {
  const original = {
    "test-token": {
      value: "#FF0000",
      path: "should-be-ignored",
      "new-value": "should-be-ignored",
      "original-value": "should-be-ignored",
      description: "Red color",
    },
  };

  const updated = {
    "test-token": {
      value: "#00FF00",
      path: "still-ignored",
      "new-value": "still-ignored",
      "original-value": "still-ignored",
      description: "Green color",
    },
  };

  // Follow the standard pattern for calling detectUpdatedTokens
  const diff = detailedDiff(original, updated);
  const renamed = detectRenamedTokens(original, updated);
  const deprecated = detectDeprecatedTokens(renamed, diff);
  const added = detectNewTokens(renamed, deprecated, diff.added, original);

  const result = detectUpdatedTokens(
    renamed,
    original,
    diff,
    added,
    deprecated,
  );

  // The result should contain changes, but reserved properties should be handled correctly
  t.truthy(result);
  t.truthy(result.updated);
});

test("updatedToken › handles properties with special names", (t) => {
  const original = {
    "test-token": {
      value: "#FF0000",
      path: "/test/path",
      "new-value": "old-new-value",
      "original-value": "old-original-value",
    },
  };

  const updated = {
    "test-token": {
      value: "#00FF00",
      path: "/updated/path",
      "new-value": "new-new-value",
      "original-value": "new-original-value",
    },
  };

  // Follow the standard pattern for calling detectUpdatedTokens
  const diff = detailedDiff(original, updated);
  const renamed = detectRenamedTokens(original, updated);
  const deprecated = detectDeprecatedTokens(renamed, diff);
  const added = detectNewTokens(renamed, deprecated, diff.added, original);

  const result = detectUpdatedTokens(
    renamed,
    original,
    diff,
    added,
    deprecated,
  );

  // The function should handle tokens that have properties with special names
  t.truthy(result);
  // The test mainly verifies that the function doesn't crash on special property names
  t.pass();
});

test("updatedToken › error handling for unhandled property data types (null)", (t) => {
  // Mock console.error to capture error output
  let errorOutput = "";
  const originalConsoleError = console.error;
  console.error = (msg) => {
    errorOutput = msg;
  };

  const original = {
    "test-token": {
      value: "#FF0000",
      description: "red color",
    },
  };

  const updated = {
    "test-token": {
      value: "#00FF00",
      description: null,
    },
  };

  try {
    // Follow the standard pattern for calling detectUpdatedTokens
    const diff = detailedDiff(original, updated);
    const renamed = detectRenamedTokens(original, updated);
    const deprecated = detectDeprecatedTokens(renamed, diff);
    const added = detectNewTokens(renamed, deprecated, diff.added, original);

    const _result = detectUpdatedTokens(
      renamed,
      original,
      diff,
      added,
      deprecated,
    );

    // If it doesn't throw, that's unexpected
    t.fail("Expected function to throw for null property");
  } catch (error) {
    // Should throw an error about unhandled property data type
    t.true(error.message.includes("UNHANDLED PROPERTY DATA TYPE"));
    // Should also log debug information
    t.true(errorOutput.includes("FAILED TO PARSE DIFF RESULT FOR"));
    t.true(errorOutput.includes("test-token"));
  } finally {
    // Restore console.error
    console.error = originalConsoleError;
  }
});

test("updatedToken › error handling for unhandled property data types (undefined)", (t) => {
  const original = {
    "test-token": {
      value: "#FF0000",
      description: "red color",
    },
  };

  const updated = {
    "test-token": {
      value: "#00FF00",
      description: undefined,
    },
  };

  try {
    // Follow the standard pattern for calling detectUpdatedTokens
    const diff = detailedDiff(original, updated);
    const renamed = detectRenamedTokens(original, updated);
    const deprecated = detectDeprecatedTokens(renamed, diff);
    const added = detectNewTokens(renamed, deprecated, diff.added, original);

    const _result = detectUpdatedTokens(
      renamed,
      original,
      diff,
      added,
      deprecated,
    );

    // If it doesn't throw, that's unexpected
    t.fail("Expected function to throw for undefined property");
  } catch (error) {
    // Should throw an error about unhandled property data type
    t.true(error.message.includes("UNHANDLED PROPERTY DATA TYPE"));
    t.true(error.message.includes("undefined"));
  }
});
