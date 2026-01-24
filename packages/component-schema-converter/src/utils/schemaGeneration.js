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
 * @fileoverview Schema metadata generation utilities
 */

/**
 * Base URL for JSON Schema references
 * @type {string}
 */
const SCHEMA_BASE_URL =
  "https://opensource.adobe.com/spectrum-design-data/schemas";

/**
 * JSON Schema version URL (using Adobe's component schema)
 * @type {string}
 */
export const JSON_SCHEMA_VERSION =
  "https://opensource.adobe.com/spectrum-design-data/schemas/component.json";

/**
 * Convert a title to kebab-case format
 *
 * @param {string} title - Title to convert
 * @returns {string} Kebab-cased title
 *
 * @example
 * toKebabCase('Button') // 'button'
 * toKebabCase('Action Button') // 'action-button'
 * toKebabCase('ActionButton') // 'action-button'
 */
export function toKebabCase(title) {
  if (typeof title !== "string") {
    return "";
  }

  return title
    .trim()
    .replace(/([a-z])([A-Z])/g, "$1-$2") // Handle camelCase
    .replace(/[\s_]+/g, "-") // Replace spaces and underscores with hyphens
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "") // Remove invalid characters
    .replace(/-+/g, "-") // Replace multiple hyphens with single
    .replace(/^-+|-+$/g, ""); // Remove leading/trailing hyphens
}

/**
 * Generate $id URL for a component schema
 *
 * @param {string} title - Component title
 * @returns {string} Schema $id URL
 *
 * @example
 * generateSchemaId('Button')
 * // 'https://opensource.adobe.com/spectrum-design-data/schemas/components/button.json'
 */
export function generateSchemaId(title) {
  const kebabTitle = toKebabCase(title);
  return `${SCHEMA_BASE_URL}/components/${kebabTitle}.json`;
}

/**
 * Generate $ref URL for workflow icon type
 *
 * @returns {string} Icon type $ref URL
 */
export function generateIconRef() {
  return `${SCHEMA_BASE_URL}/types/workflow-icon.json`;
}

/**
 * Generate $ref URL for hex color type
 *
 * @returns {string} Color type $ref URL
 */
export function generateColorRef() {
  return `${SCHEMA_BASE_URL}/types/hex-color.json`;
}

/**
 * Get the base URL for schema references
 *
 * @returns {string} Base URL
 */
export function getSchemaBaseUrl() {
  return SCHEMA_BASE_URL;
}
