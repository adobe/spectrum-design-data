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

/**
 * Check if a value is a plain object
 * @param {*} a - Value to check
 * @returns {boolean} True if the value is a plain object
 */
export function isObject(a) {
  return (
    Boolean(a) &&
    (typeof a === "object" ||
      (a.constructor &&
        (a.constructor === Object || a.constructor.name === "Object")))
  );
}

/**
 * Check if a value is a string
 * @param {*} a - Value to check
 * @returns {boolean} True if the value is a string
 */
export function isString(a) {
  return typeof a === "string" || a instanceof String;
}

/**
 * Check if a value is a boolean
 * @param {*} a - Value to check
 * @returns {boolean} True if the value is a boolean
 */
export function isBoolean(a) {
  return typeof a === "boolean";
}

/**
 * Check if a value is a number
 * @param {*} a - Value to check
 * @returns {boolean} True if the value is a number
 */
export function isNumber(a) {
  return typeof a === "number";
}

/**
 * Assert that a condition is true, throw an error if not
 * @param {boolean} condition - Condition to check
 * @param {string} [message] - Optional error message
 * @throws {Error} If condition is false
 */
export function assert(condition, message) {
  if (!condition) throw new Error(message ? message : undefined);
}
