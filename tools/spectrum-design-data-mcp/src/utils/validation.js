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
 * Validate component name is a non-empty string without path separators
 * @param {string} component - Component name to validate
 * @returns {string} Trimmed component name (lowercased for lookup)
 * @throws {Error} If component is invalid
 */
export function validateComponentName(component) {
  if (!component || typeof component !== "string") {
    throw new Error("Component name must be a non-empty string");
  }
  if (component.includes("/") || component.includes("\\")) {
    throw new Error("Component name cannot contain path separators");
  }
  return component.trim();
}

/**
 * Validate and clamp limit parameter
 * @param {number|undefined} limit - Requested limit
 * @param {number} defaultLimit - Default when limit is invalid
 * @param {number} maxLimit - Maximum allowed value
 * @returns {number} Valid limit
 */
export function validateLimit(limit, defaultLimit, maxLimit = 100) {
  const parsedLimit = Number(limit);
  if (Number.isNaN(parsedLimit) || parsedLimit < 1) {
    return defaultLimit;
  }
  return Math.min(parsedLimit, maxLimit);
}

/**
 * Validate props is a plain object (not array or null)
 * @param {unknown} props - Props to validate
 * @returns {Record<string, unknown>} The props object
 * @throws {Error} If props is invalid
 */
export function validatePropsObject(props) {
  if (!props || typeof props !== "object" || Array.isArray(props)) {
    throw new Error("Props must be a valid object");
  }
  return /** @type {Record<string, unknown>} */ (props);
}

/**
 * Validate optional string parameter
 * @param {unknown} param - Parameter value
 * @param {string} paramName - Name for error messages
 * @returns {string|undefined} The param if valid, undefined if not provided
 * @throws {Error} If param is provided but not a string
 */
export function validateStringParam(param, paramName) {
  if (param !== undefined && param !== null && typeof param !== "string") {
    throw new Error(`${paramName} must be a string`);
  }
  return param !== undefined && param !== null ? String(param) : undefined;
}
