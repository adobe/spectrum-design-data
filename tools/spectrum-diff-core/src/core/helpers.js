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
 * Type checking utilities shared across diff tools
 */

export function isObject(a) {
  return (
    Boolean(a) &&
    !Array.isArray(a) &&
    (typeof a === "object" ||
      (a.constructor &&
        (a.constructor === Object || a.constructor.name === "Object")))
  );
}

export function isString(a) {
  return typeof a === "string" || a instanceof String;
}

export function isBoolean(a) {
  return typeof a === "boolean";
}

export function isNumber(a) {
  return typeof a === "number";
}

export function isArray(a) {
  return Array.isArray(a);
}

export function assert(condition, message) {
  if (!condition) throw new Error(message ? message : undefined);
}

/**
 * Deep clone an object to prevent mutation issues
 * @param {any} obj - Object to clone
 * @returns {any} Deep cloned object
 */
export function deepClone(obj) {
  if (obj === null || typeof obj !== "object") return obj;
  if (obj instanceof Date) return new Date(obj.getTime());
  if (obj instanceof Array) return obj.map((item) => deepClone(item));
  if (typeof obj === "object") {
    const clonedObj = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        clonedObj[key] = deepClone(obj[key]);
      }
    }
    return clonedObj;
  }
  return obj;
}

/**
 * Safely get nested property from object
 * @param {object} obj - Object to get property from
 * @param {string} path - Dot-separated path to property
 * @param {any} defaultValue - Default value if property doesn't exist
 * @returns {any} Property value or default
 */
export function getNestedProperty(obj, path, defaultValue = undefined) {
  return path.split(".").reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : defaultValue;
  }, obj);
}

/**
 * Capitalize first letter of string
 * @param {string} str - String to capitalize
 * @returns {string} Capitalized string
 */
export function capitalize(str) {
  if (!isString(str) || str.length === 0) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}
