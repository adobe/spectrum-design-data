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

// SAFETY WRAPPERS FOR deep-object-diff
//
// The dependency library can return Objects as values from the source input,
// which can break tests when test data re-used. The results from the diffs are
// manipulated to parse property changes which will result in changes to the
// source objects!
// These wrappers sanitize the object data by just running the results through
// some JSON conversion.

import { diff as _diff } from "deep-object-diff";
import { addedDiff as _addedDiff } from "deep-object-diff";
import { deletedDiff as _deletedDiff } from "deep-object-diff";
import { updatedDiff as _updatedDiff } from "deep-object-diff";
import { detailedDiff as _detailedDiff } from "deep-object-diff";
import { isObject } from "./helpers.js";

function sanitize(diff) {
  // we sanitize the diff object by converting to a string and then
  // back to an object, but JSON does not support undefined as a value,
  // so we convert to null and then iterate over the sanitized object
  // to restore the undefined property values in place of the the null
  // (having undefined properties is kind of nuts, but that is what
  // the diff library uses, so...)
  // fyi, this breaks supporting null as a property value - which isn't
  // something we need right now, but we can replace with some custom
  // string value instead if need be
  function restoreUndefined(obj) {
    if (isObject(obj)) {
      for (const property in obj) {
        if (obj[property] === null) {
          obj[property] = undefined;
        } else {
          restoreUndefined(obj[property]);
        }
      }
    }
  }

  const stringified = JSON.stringify(diff, (_, v) =>
    v === undefined ? null : v,
  );
  const sanitized = JSON.parse(stringified);
  restoreUndefined(sanitized);
  return sanitized;
}

export function diff(originalObj, updatedObj) {
  return sanitize(_diff(originalObj, updatedObj));
}

export function addedDiff(originalObj, updatedObj) {
  return sanitize(_addedDiff(originalObj, updatedObj));
}

export function deletedDiff(originalObj, updatedObj) {
  return sanitize(_deletedDiff(originalObj, updatedObj));
}

export function updatedDiff(originalObj, updatedObj) {
  return sanitize(_updatedDiff(originalObj, updatedObj));
}

export function detailedDiff(originalObj, updatedObj) {
  return sanitize(_detailedDiff(originalObj, updatedObj));
}
