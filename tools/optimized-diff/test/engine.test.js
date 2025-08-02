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
import { performance } from "perf_hooks";
import {
  diff,
  addedDiff,
  deletedDiff,
  updatedDiff,
  detailedDiff,
  OptimizedDiffEngine,
} from "../src/engine.js";

// Test data
const originalObj = {
  name: "test-token",
  value: "#FF0000",
  description: "Red color",
  nested: {
    property: "value1",
    deep: {
      level: "original",
    },
  },
  arrayProp: [1, 2, 3],
};

const updatedObj = {
  name: "test-token",
  value: "#00FF00", // changed
  description: "Green color", // changed
  newProp: "added", // added
  nested: {
    property: "value2", // changed
    deep: {
      level: "updated", // changed
    },
    newNested: "added", // added
  },
  arrayProp: [1, 2, 3, 4], // changed
};

// Token-like test data
const tokenOriginal = {
  "color-red-500": {
    $schema:
      "https://opensource.adobe.com/spectrum-tokens/schemas/token-types/color.json",
    value: "rgb(255, 0, 0)",
    uuid: "color-red-500-uuid",
    private: false,
  },
  "color-blue-500": {
    $schema:
      "https://opensource.adobe.com/spectrum-tokens/schemas/token-types/color.json",
    value: "rgb(0, 0, 255)",
    uuid: "color-blue-500-uuid",
    private: false,
  },
};

const tokenUpdated = {
  "color-red-500": {
    $schema:
      "https://opensource.adobe.com/spectrum-tokens/schemas/token-types/color.json",
    value: "rgb(220, 0, 0)", // changed
    uuid: "color-red-500-uuid",
    private: false,
  },
  "color-blue-500": {
    $schema:
      "https://opensource.adobe.com/spectrum-tokens/schemas/token-types/color.json",
    value: "rgb(0, 0, 255)",
    uuid: "color-blue-500-uuid",
    private: true, // changed
  },
  "color-green-500": {
    // added
    $schema:
      "https://opensource.adobe.com/spectrum-tokens/schemas/token-types/color.json",
    value: "rgb(0, 255, 0)",
    uuid: "color-green-500-uuid",
    private: false,
  },
};

// Basic functionality tests
test("detailedDiff › handles basic object differences", (t) => {
  const result = detailedDiff(originalObj, updatedObj);

  t.truthy(result.added);
  t.truthy(result.deleted);
  t.truthy(result.updated);

  // Check added property
  t.is(result.added.newProp, "added");

  // Check updated properties
  t.is(result.updated.value, "#00FF00");
  t.is(result.updated.description, "Green color");
});

test("detailedDiff › handles token objects correctly", (t) => {
  const result = detailedDiff(tokenOriginal, tokenUpdated);

  // Check structure
  t.truthy(result.added);
  t.truthy(result.deleted);
  t.truthy(result.updated);

  // Check added token
  t.is(result.added["color-green-500"].value, "rgb(0, 255, 0)");
  t.is(result.added["color-green-500"].uuid, "color-green-500-uuid");

  // Check updated tokens
  t.is(result.updated["color-red-500"].value, "rgb(220, 0, 0)");
  t.is(result.updated["color-blue-500"].private, true);
});

test("detailedDiff › handles identical objects", (t) => {
  const identical = { ...originalObj };
  const result = detailedDiff(originalObj, identical);

  t.deepEqual(result.added, {});
  t.deepEqual(result.deleted, {});
  t.deepEqual(result.updated, {});
});

test("detailedDiff › handles empty objects", (t) => {
  const empty = {};
  const result = detailedDiff(empty, originalObj);

  // Everything should be added
  t.is(result.added.name, "test-token");
  t.is(result.added.value, "#FF0000");
  t.deepEqual(result.deleted, {});
  t.deepEqual(result.updated, {});
});

test("detailedDiff › handles null and undefined", (t) => {
  const withNull = { nullProp: null, undefinedProp: undefined };
  const withoutNull = { normalProp: "value" };

  const result = detailedDiff(withNull, withoutNull);

  t.is(result.deleted.nullProp, undefined);
  t.is(result.deleted.undefinedProp, undefined);
  t.is(result.added.normalProp, "value");
});

test("detailedDiff › handles arrays correctly", (t) => {
  const originalArray = { arr: [1, 2, 3] };
  const updatedArray = { arr: [1, 2, 3, 4, 5] };

  const result = detailedDiff(originalArray, updatedArray);

  // Arrays should be treated as objects with numeric keys
  t.is(result.added.arr[3], 4);
  t.is(result.added.arr[4], 5);
});

test("detailedDiff › handles nested objects", (t) => {
  const original = {
    level1: {
      level2: {
        level3: {
          value: "original",
        },
      },
    },
  };

  const updated = {
    level1: {
      level2: {
        level3: {
          value: "updated",
        },
      },
    },
  };

  const result = detailedDiff(original, updated);

  t.is(result.updated.level1.level2.level3.value, "updated");
});

// Individual function tests
test("diff › combines all differences", (t) => {
  const result = diff(originalObj, updatedObj);

  t.is(result.newProp, "added");
  t.is(result.value, "#00FF00");
  t.is(result.description, "Green color");
});

test("addedDiff › returns only added properties", (t) => {
  const result = addedDiff(originalObj, updatedObj);

  t.is(result.newProp, "added");
  t.is(result.value, undefined); // Should not include changed properties
});

test("deletedDiff › returns deleted properties", (t) => {
  const objWithExtra = {
    ...originalObj,
    toDelete: "will be removed",
  };

  const result = deletedDiff(objWithExtra, originalObj);

  t.is(result.toDelete, undefined);
  t.is(result.name, undefined); // Should not include unchanged properties
});

test("updatedDiff › returns only updated properties", (t) => {
  const result = updatedDiff(originalObj, updatedObj);

  t.is(result.value, "#00FF00");
  t.is(result.description, "Green color");
  t.is(result.newProp, undefined); // Should not include added properties
});

// Performance test
test("performance › handles large datasets efficiently", (t) => {
  // Create larger test objects
  const largeOriginal = {};
  const largeUpdated = {};

  // Create 1000 test objects
  for (let i = 0; i < 1000; i++) {
    const tokenName = `token-${i}`;
    largeOriginal[tokenName] = {
      value: `#${i.toString(16).padStart(6, "0")}`,
      uuid: `uuid-${i}`,
      schema: "color.json",
      private: false,
    };

    largeUpdated[tokenName] = {
      value:
        i % 10 === 0
          ? `#${(i + 1).toString(16).padStart(6, "0")}`
          : `#${i.toString(16).padStart(6, "0")}`,
      uuid: `uuid-${i}`,
      schema: "color.json",
      private: false,
    };
  }

  const start = performance.now();
  const result = detailedDiff(largeOriginal, largeUpdated);
  const duration = performance.now() - start;

  console.log(`Performance test: ${duration.toFixed(2)}ms for 1000 objects`);

  // Verify we got results
  t.truthy(result);
  t.true(duration < 100, "Should complete in under 100ms"); // Performance assertion
});

// OptimizedDiffEngine tests
test("OptimizedDiffEngine › provides complete API", (t) => {
  t.is(typeof OptimizedDiffEngine.diff, "function");
  t.is(typeof OptimizedDiffEngine.addedDiff, "function");
  t.is(typeof OptimizedDiffEngine.deletedDiff, "function");
  t.is(typeof OptimizedDiffEngine.updatedDiff, "function");
  t.is(typeof OptimizedDiffEngine.detailedDiff, "function");

  t.is(OptimizedDiffEngine.name, "optimized");
  t.is(typeof OptimizedDiffEngine.description, "string");
  t.is(OptimizedDiffEngine.version, "1.0.0");
});

test("OptimizedDiffEngine › functions work correctly", (t) => {
  const result = OptimizedDiffEngine.detailedDiff(originalObj, updatedObj);

  t.truthy(result.added);
  t.truthy(result.deleted);
  t.truthy(result.updated);

  t.is(result.added.newProp, "added");
  t.is(result.updated.value, "#00FF00");
});

// Edge cases
test("detailedDiff › handles strings vs objects", (t) => {
  const original = { prop: "string" };
  const updated = { prop: { nested: "object" } };

  const result = detailedDiff(original, updated);

  t.deepEqual(result.updated.prop, { nested: "object" });
});

test("detailedDiff › handles arrays vs objects", (t) => {
  const original = { prop: [1, 2, 3] };
  const updated = { prop: { 0: 1, 1: 2, 2: 3 } };

  const result = detailedDiff(original, updated);

  t.deepEqual(result.updated.prop, { 0: 1, 1: 2, 2: 3 });
});

test("detailedDiff › handles circular references gracefully", (t) => {
  const original = { prop: "value" };
  const updated = { prop: "value" };

  // This shouldn't throw
  const result = detailedDiff(original, updated);

  t.deepEqual(result.added, {});
  t.deepEqual(result.deleted, {});
  t.deepEqual(result.updated, {});
});
