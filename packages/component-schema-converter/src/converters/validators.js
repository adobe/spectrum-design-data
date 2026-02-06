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
 * @fileoverview Validation functions for plugin and official schema formats
 */

import Ajv from "ajv";
import addFormats from "ajv-formats";
import {
  SchemaConversionError,
  createMissingFieldError,
  createInvalidFieldError,
  createValidationError,
} from "../utils/errorHandling.js";
import { isValidHexColor } from "../utils/typeDetection.js";

/**
 * Valid category values
 * @type {Set<string>}
 */
const VALID_CATEGORIES = new Set([
  "actions",
  "navigation",
  "content",
  "feedback",
  "forms",
  "inputs",
  "layout",
  "pickers",
  "status",
]);

/**
 * Valid option types
 * @type {Set<string>}
 */
const VALID_OPTION_TYPES = new Set([
  "string",
  "boolean",
  "localEnum",
  "systemEnum",
  "size",
  "state",
  "icon",
  "color",
  "dimension",
]);

/**
 * Validate plugin format data structure
 *
 * @param {*} data - Data to validate
 * @returns {boolean} True if valid
 * @throws {SchemaConversionError} If validation fails
 *
 * @example
 * validatePluginFormat({
 *   title: 'Button',
 *   meta: { category: 'actions', documentationUrl: 'https://...' },
 *   options: [{ title: 'size', type: 'size', items: ['s', 'm', 'l'] }]
 * }); // returns true
 */
export function validatePluginFormat(data) {
  if (!data || typeof data !== "object") {
    throw new SchemaConversionError("Plugin data must be an object");
  }

  // Validate title
  if (
    !data.title ||
    typeof data.title !== "string" ||
    data.title.trim() === ""
  ) {
    throw createMissingFieldError("title");
  }

  // Validate meta
  if (!data.meta || typeof data.meta !== "object") {
    throw createMissingFieldError("meta");
  }

  if (!data.meta.category || typeof data.meta.category !== "string") {
    throw createMissingFieldError("meta.category");
  }

  if (!VALID_CATEGORIES.has(data.meta.category)) {
    throw createInvalidFieldError(
      "meta.category",
      Array.from(VALID_CATEGORIES).join(" | "),
      data.meta.category,
      `Valid categories: ${Array.from(VALID_CATEGORIES).join(", ")}`,
    );
  }

  if (
    !data.meta.documentationUrl ||
    typeof data.meta.documentationUrl !== "string"
  ) {
    throw createMissingFieldError("meta.documentationUrl");
  }

  // Validate options array
  if (!Array.isArray(data.options)) {
    throw createInvalidFieldError("options", "array", typeof data.options);
  }

  // Validate each option
  for (let i = 0; i < data.options.length; i++) {
    const option = data.options[i];

    if (!option || typeof option !== "object") {
      throw new SchemaConversionError(`Option at index ${i} must be an object`);
    }

    if (!option.title || typeof option.title !== "string") {
      throw new SchemaConversionError(
        `Option at index ${i} missing required field: title`,
      );
    }

    if (!option.type || !VALID_OPTION_TYPES.has(option.type)) {
      throw createInvalidFieldError(
        `options[${i}].type`,
        Array.from(VALID_OPTION_TYPES).join(" | "),
        option.type,
        `Valid types: ${Array.from(VALID_OPTION_TYPES).join(", ")}`,
      );
    }

    // Validate enum types have items
    const enumTypes = ["localEnum", "systemEnum", "size", "state"];
    if (enumTypes.includes(option.type)) {
      if (!option.items || !Array.isArray(option.items)) {
        throw createInvalidFieldError(
          `options[${i}].items`,
          "non-empty array",
          option.items,
          `${option.type} options must have an items array`,
        );
      }
      if (option.items.length === 0) {
        throw createInvalidFieldError(
          `options[${i}].items`,
          "non-empty array",
          "empty array",
          "Enum must have at least one value",
        );
      }
    }

    // Validate color default values
    if (option.type === "color" && option.defaultValue) {
      if (!isValidHexColor(option.defaultValue)) {
        throw createInvalidFieldError(
          `options[${i}].defaultValue`,
          "valid hex color (e.g., #FFFFFF)",
          option.defaultValue,
        );
      }
    }
  }

  return true;
}

/**
 * Validate official JSON Schema structure
 *
 * @param {*} schema - Schema to validate
 * @returns {boolean} True if valid
 * @throws {SchemaConversionError} If validation fails
 *
 * @example
 * validateOfficialSchema({
 *   $schema: 'https://json-schema.org/draft/2020-12/schema',
 *   $id: 'https://...button.json',
 *   title: 'Button',
 *   description: 'A button component',
 *   type: 'object',
 *   properties: { size: { type: 'string', enum: ['s', 'm', 'l'] } }
 * }); // returns true
 */
export function validateOfficialSchema(schema) {
  if (!schema || typeof schema !== "object") {
    throw new SchemaConversionError("Schema must be an object");
  }

  // Validate required fields
  if (!schema.title || typeof schema.title !== "string") {
    throw createMissingFieldError("title");
  }

  if (schema.$schema && typeof schema.$schema !== "string") {
    throw createInvalidFieldError("$schema", "string", typeof schema.$schema);
  }

  if (schema.$id && typeof schema.$id !== "string") {
    throw createInvalidFieldError("$id", "string", typeof schema.$id);
  }

  if (schema.description && typeof schema.description !== "string") {
    throw createInvalidFieldError(
      "description",
      "string",
      typeof schema.description,
    );
  }

  // Validate type if present
  if (schema.type && schema.type !== "object") {
    throw createInvalidFieldError("type", "object", schema.type);
  }

  // Validate meta if present
  if (schema.meta) {
    if (typeof schema.meta !== "object") {
      throw createInvalidFieldError("meta", "object", typeof schema.meta);
    }

    if (schema.meta.category && !VALID_CATEGORIES.has(schema.meta.category)) {
      throw createInvalidFieldError(
        "meta.category",
        Array.from(VALID_CATEGORIES).join(" | "),
        schema.meta.category,
      );
    }
  }

  // Validate properties if present
  if (schema.properties) {
    if (typeof schema.properties !== "object") {
      throw createInvalidFieldError(
        "properties",
        "object",
        typeof schema.properties,
      );
    }
  }

  // Validate required array if present
  if (schema.required) {
    if (!Array.isArray(schema.required)) {
      throw createInvalidFieldError(
        "required",
        "array",
        typeof schema.required,
      );
    }
  }

  return true;
}

/**
 * Validate schema against JSON Schema 2020-12 specification
 * Uses Ajv validator
 *
 * @param {Object} schema - Schema to validate
 * @returns {boolean} True if valid
 * @throws {SchemaConversionError} If validation fails
 */
export function validateAgainstJsonSchema(schema) {
  const ajv = new Ajv({ strict: false, allErrors: true });
  addFormats(ajv);

  try {
    // Try to compile the schema
    ajv.compile(schema);
    return true;
  } catch (error) {
    throw createValidationError(
      `Schema is not valid JSON Schema: ${error.message}`,
      error.errors || [],
    );
  }
}

/**
 * Check if plugin data can be converted to official schema
 * This is a pre-flight check before conversion
 *
 * @param {*} data - Plugin data to check
 * @param {Object} [options={}] - Conversion options
 * @param {string} [options.description] - Component description
 * @returns {boolean} True if data can be converted
 * @throws {SchemaConversionError} If data cannot be converted
 */
export function validateConversionRequirements(data, options = {}) {
  // Validate basic plugin format
  validatePluginFormat(data);

  // Check for description requirement
  if (!options.description || typeof options.description !== "string") {
    throw createMissingFieldError("options.description");
  }

  if (options.description.trim() === "") {
    throw createInvalidFieldError(
      "options.description",
      "non-empty string",
      "empty string",
      "Component description is required for official schema",
    );
  }

  return true;
}

/**
 * Get valid category values
 *
 * @returns {Array<string>} Array of valid categories
 */
export function getValidCategories() {
  return Array.from(VALID_CATEGORIES);
}

/**
 * Get valid option types
 *
 * @returns {Array<string>} Array of valid option types
 */
export function getValidOptionTypes() {
  return Array.from(VALID_OPTION_TYPES);
}
