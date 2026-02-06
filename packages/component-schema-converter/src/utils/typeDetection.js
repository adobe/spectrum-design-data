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

/**
 * @fileoverview Type detection utilities for schema conversion
 */

/**
 * Valid size values in Spectrum
 * @type {Set<string>}
 */
const SIZE_VALUES = new Set(["xs", "s", "m", "l", "xl", "xxl", "xxxl"]);

/**
 * Keywords that indicate state values
 * @type {Array<string>}
 */
const STATE_KEYWORDS = [
  "hover",
  "active",
  "focus",
  "disabled",
  "default",
  "down",
  "keyboard",
  "pressed",
  "selected",
];

/**
 * Detect if an array of values represents size values
 * All values must be valid Spectrum size values
 *
 * @param {Array<string>} values - Array of string values
 * @returns {boolean} True if all values are valid size values
 *
 * @example
 * isSizeEnum(['s', 'm', 'l', 'xl']) // true
 * isSizeEnum(['small', 'medium', 'large']) // false
 * isSizeEnum([]) // false
 */
export function isSizeEnum(values) {
  if (!Array.isArray(values) || values.length === 0) {
    return false;
  }

  return values.every((value) => SIZE_VALUES.has(value));
}

/**
 * Detect if an array of values represents state values
 * At least one value must contain a state keyword
 *
 * @param {Array<string>} values - Array of string values
 * @returns {boolean} True if values represent states
 *
 * @example
 * isStateEnum(['default', 'hover', 'focus']) // true
 * isStateEnum(['keyboard focus', 'down']) // true
 * isStateEnum(['enabled', 'disabled']) // false (these are boolean, not state)
 * isStateEnum([]) // false
 */
export function isStateEnum(values) {
  if (!Array.isArray(values) || values.length === 0) {
    return false;
  }

  return values.some((value) => {
    const lowerValue = value.toLowerCase();
    return STATE_KEYWORDS.some((keyword) => lowerValue.includes(keyword));
  });
}

/**
 * Detect if a $ref URL points to a workflow icon schema
 *
 * @param {string} ref - JSON Schema $ref URL
 * @returns {boolean} True if ref points to workflow-icon schema
 *
 * @example
 * isIconRef('https://...spectrum-design-data/schemas/types/workflow-icon.json') // true
 * isIconRef('https://...spectrum-design-data/schemas/types/hex-color.json') // false
 */
export function isIconRef(ref) {
  if (typeof ref !== "string") {
    return false;
  }
  return ref.includes("workflow-icon");
}

/**
 * Detect if a $ref URL points to a hex color schema
 *
 * @param {string} ref - JSON Schema $ref URL
 * @returns {boolean} True if ref points to hex-color schema
 *
 * @example
 * isColorRef('https://...spectrum-design-data/schemas/types/hex-color.json') // true
 * isColorRef('https://...spectrum-design-data/schemas/types/workflow-icon.json') // false
 */
export function isColorRef(ref) {
  if (typeof ref !== "string") {
    return false;
  }
  return ref.includes("hex-color");
}

/**
 * Detect the plugin option type from a JSON Schema property
 *
 * @param {import('../types/schemas.js').SchemaProperty} property - JSON Schema property
 * @returns {import('../types/schemas.js').OptionType} Detected option type
 *
 * @example
 * detectOptionType({ type: 'boolean' }) // 'boolean'
 * detectOptionType({ type: 'string', enum: ['s', 'm', 'l'] }) // 'size'
 * detectOptionType({ $ref: '...workflow-icon.json' }) // 'icon'
 */
export function detectOptionType(property) {
  if (!property || typeof property !== "object") {
    return "string";
  }

  // Check for $ref first
  if (property.$ref) {
    if (isIconRef(property.$ref)) {
      return "icon";
    }
    if (isColorRef(property.$ref)) {
      return "color";
    }
  }

  // Check type
  if (property.type === "boolean") {
    return "boolean";
  }

  if (property.type === "number") {
    return "dimension";
  }

  if (property.type === "string" && property.enum) {
    // Detect special enum types
    if (isSizeEnum(property.enum)) {
      return "size";
    }
    if (isStateEnum(property.enum)) {
      return "state";
    }
    return "localEnum";
  }

  if (property.type === "string") {
    return "string";
  }

  // Default to string
  return "string";
}

/**
 * Validate if a value is a valid hex color
 *
 * @param {string} value - Value to validate
 * @returns {boolean} True if valid hex color
 *
 * @example
 * isValidHexColor('#FFFFFF') // true
 * isValidHexColor('#FFF') // true
 * isValidHexColor('white') // false
 */
export function isValidHexColor(value) {
  if (typeof value !== "string") {
    return false;
  }
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(value);
}

/**
 * Get valid size values
 *
 * @returns {Array<string>} Array of valid size values
 */
export function getValidSizeValues() {
  return Array.from(SIZE_VALUES);
}

/**
 * Get state keywords
 *
 * @returns {Array<string>} Array of state keywords
 */
export function getStateKeywords() {
  return [...STATE_KEYWORDS];
}
