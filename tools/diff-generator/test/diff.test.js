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
import {
  diff,
  addedDiff,
  deletedDiff,
  updatedDiff,
  detailedDiff,
} from "../src/lib/diff.js";

// Test data for diff operations
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

test("diff › returns complete difference between objects", (t) => {
  const result = diff(originalObj, updatedObj);

  t.truthy(result);
  t.is(result.value, "#00FF00");
  t.is(result.description, "Green color");
  t.is(result.newProp, "added");
  t.is(result.nested.property, "value2");
  t.is(result.nested.deep.level, "updated");
  t.is(result.nested.newNested, "added");
  // Arrays are treated as objects with numeric indices
  t.is(result.arrayProp[3], 4); // Only the added 4th element
});

test("addedDiff › returns only added properties", (t) => {
  const result = addedDiff(originalObj, updatedObj);

  t.truthy(result);
  t.is(result.newProp, "added");
  t.is(result.nested.newNested, "added");

  // Should not include changed properties
  t.is(result.value, undefined);
  t.is(result.description, undefined);
  t.is(result.nested.property, undefined);
});

test("deletedDiff › detects objects with deleted properties", (t) => {
  const objWithExtra = {
    ...originalObj,
    toDelete: "will be removed",
    nested: {
      ...originalObj.nested,
      toDeleteNested: "will be removed too",
    },
  };

  const result = deletedDiff(objWithExtra, originalObj);

  t.truthy(result);
  // deletedDiff shows nested objects with undefined values for deleted properties
  t.is(result.nested.toDeleteNested, undefined);
  t.is(result.toDelete, undefined);

  // Should not include unchanged properties
  t.is(result.name, undefined);
  t.is(result.value, undefined);
});

test("updatedDiff › returns only updated properties", (t) => {
  const result = updatedDiff(originalObj, updatedObj);

  t.truthy(result);
  t.is(result.value, "#00FF00");
  t.is(result.description, "Green color");
  t.is(result.nested.property, "value2");
  t.is(result.nested.deep.level, "updated");
  // updatedDiff only shows changes to existing array elements, not additions
  t.is(result.arrayProp, undefined);

  // Should not include added properties
  t.is(result.newProp, undefined);
  t.is(result.nested.newNested, undefined);

  // Should not include unchanged properties
  t.is(result.name, undefined);
});

test("detailedDiff › returns detailed difference object", (t) => {
  const result = detailedDiff(originalObj, updatedObj);

  t.truthy(result);
  t.truthy(result.added);
  t.truthy(result.deleted);
  t.truthy(result.updated);

  // Check added properties
  t.is(result.added.newProp, "added");
  t.is(result.added.nested.newNested, "added");

  // Check updated properties
  t.is(result.updated.value, "#00FF00");
  t.is(result.updated.description, "Green color");
});

test("diff functions › handle identical objects", (t) => {
  const identical = { ...originalObj };

  t.deepEqual(diff(originalObj, identical), {});
  t.deepEqual(addedDiff(originalObj, identical), {});
  t.deepEqual(deletedDiff(originalObj, identical), {});
  t.deepEqual(updatedDiff(originalObj, identical), {});

  const detailed = detailedDiff(originalObj, identical);
  t.deepEqual(detailed.added, {});
  t.deepEqual(detailed.deleted, {});
  t.deepEqual(detailed.updated, {});
});

test("diff functions › handle empty objects", (t) => {
  const empty = {};

  const addedResult = addedDiff(empty, originalObj);
  // When comparing empty to original, everything in original is "added"
  // But arrays are handled specially - they become objects with indices
  t.is(addedResult.name, "test-token");
  t.is(addedResult.value, "#FF0000");
  t.is(addedResult.arrayProp[0], 1);
  t.is(addedResult.arrayProp[1], 2);
  t.is(addedResult.arrayProp[2], 3);

  const deletedResult = deletedDiff(originalObj, empty);
  // When comparing original to empty, deletedDiff returns object with undefined values
  t.is(deletedResult.name, undefined);
  t.is(deletedResult.value, undefined);
  t.is(deletedResult.description, undefined);
  t.is(deletedResult.nested, undefined);
  t.is(deletedResult.arrayProp, undefined);

  const updatedResult = updatedDiff(empty, empty);
  t.deepEqual(updatedResult, {});
});
