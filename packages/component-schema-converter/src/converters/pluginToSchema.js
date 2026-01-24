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
 * @fileoverview Convert plugin format to official Spectrum JSON Schema
 */

import {
  JSON_SCHEMA_VERSION,
  generateSchemaId,
  generateIconRef,
  generateColorRef,
} from "../utils/schemaGeneration.js";
import {
  SchemaConversionError,
  createMissingFieldError,
  createInvalidTypeError,
  createInvalidFieldError,
} from "../utils/errorHandling.js";
import { getValidSizeValues } from "../utils/typeDetection.js";

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
 * Convert a single plugin option to a JSON Schema property
 *
 * @param {import('../types/schemas.js').PluginOption} option - Plugin option
 * @returns {import('../types/schemas.js').SchemaProperty} JSON Schema property
 */
function convertOptionToProperty(option) {
  if (!option || typeof option !== "object") {
    throw new SchemaConversionError("Invalid option: must be an object");
  }

  if (!option.type) {
    throw createMissingFieldError("type");
  }

  if (!VALID_OPTION_TYPES.has(option.type)) {
    throw createInvalidTypeError(option.type, Array.from(VALID_OPTION_TYPES));
  }

  const property = {};

  switch (option.type) {
    case "string":
      property.type = "string";
      break;

    case "boolean":
      property.type = "boolean";
      break;

    case "dimension":
      property.type = "number";
      break;

    case "localEnum":
    case "systemEnum":
    case "size":
    case "state":
      if (!option.items || !Array.isArray(option.items)) {
        throw createInvalidFieldError(
          "items",
          "non-empty array",
          option.items,
          `${option.type} options must have an items array`,
        );
      }
      if (option.items.length === 0) {
        throw createInvalidFieldError(
          "items",
          "non-empty array",
          "empty array",
          "Enum must have at least one value",
        );
      }
      property.type = "string";
      property.enum = option.items;

      // Validate size values
      if (option.type === "size") {
        const validSizes = getValidSizeValues();
        const invalidSizes = option.items.filter(
          (v) => !validSizes.includes(v),
        );
        if (invalidSizes.length > 0) {
          throw createInvalidFieldError(
            "items",
            `valid size values: ${validSizes.join(", ")}`,
            invalidSizes.join(", "),
            `Invalid size values: ${invalidSizes.join(", ")}`,
          );
        }
      }
      break;

    case "icon":
      property.$ref = generateIconRef();
      break;

    case "color":
      property.$ref = generateColorRef();
      break;

    default:
      throw createInvalidTypeError(option.type, Array.from(VALID_OPTION_TYPES));
  }

  // Add default value if present
  if (option.defaultValue !== undefined) {
    property.default = option.defaultValue;
  }

  // Add description if present
  if (option.description) {
    property.description = option.description;
  }

  return property;
}

/**
 * Convert plugin options array to JSON Schema properties object
 *
 * @param {Array<import('../types/schemas.js').PluginOption>} options - Plugin options array
 * @returns {{properties: Object<string, import('../types/schemas.js').SchemaProperty>, required: Array<string>}} Properties and required fields
 */
function convertOptionsToProperties(options) {
  if (!Array.isArray(options)) {
    throw createInvalidFieldError("options", "array", typeof options);
  }

  const properties = {};
  const required = [];

  for (const option of options) {
    if (!option.title) {
      throw createMissingFieldError("title");
    }

    const property = convertOptionToProperty(option);
    properties[option.title] = property;

    if (option.required === true) {
      required.push(option.title);
    }
  }

  return { properties, required };
}

/**
 * Validate plugin component data
 *
 * @param {import('../types/schemas.js').PluginComponent} pluginData - Plugin component data
 * @throws {SchemaConversionError} If validation fails
 */
function validatePluginData(pluginData) {
  if (!pluginData || typeof pluginData !== "object") {
    throw new SchemaConversionError("Invalid plugin data: must be an object");
  }

  if (!pluginData.title || typeof pluginData.title !== "string") {
    throw createMissingFieldError("title");
  }

  if (!pluginData.meta || typeof pluginData.meta !== "object") {
    throw createMissingFieldError("meta");
  }

  if (
    !pluginData.meta.category ||
    typeof pluginData.meta.category !== "string"
  ) {
    throw createMissingFieldError("meta.category");
  }

  if (
    !pluginData.meta.documentationUrl ||
    typeof pluginData.meta.documentationUrl !== "string"
  ) {
    throw createMissingFieldError("meta.documentationUrl");
  }
}

/**
 * Convert plugin format to official Spectrum JSON Schema
 *
 * @param {import('../types/schemas.js').PluginComponent} pluginData - Component data from plugin
 * @param {import('../types/schemas.js').ConversionOptions} [options={}] - Conversion options
 * @returns {import('../types/schemas.js').OfficialSchema} Official JSON Schema format
 *
 * @throws {SchemaConversionError} If conversion fails
 *
 * @example
 * const pluginData = {
 *   title: 'Button',
 *   meta: {
 *     category: 'actions',
 *     documentationUrl: 'https://spectrum.adobe.com/page/button/'
 *   },
 *   options: [
 *     {
 *       title: 'size',
 *       type: 'size',
 *       items: ['s', 'm', 'l', 'xl'],
 *       defaultValue: 'm'
 *     }
 *   ]
 * };
 *
 * const schema = convertPluginToSchema(pluginData, {
 *   description: 'Buttons allow users to perform an action.'
 * });
 */
export function convertPluginToSchema(pluginData, options = {}) {
  // Validate input
  validatePluginData(pluginData);

  // Check for required description
  if (!options.description || typeof options.description !== "string") {
    throw createMissingFieldError("options.description");
  }

  const includeSchemaMetadata =
    options.includeSchemaMetadata !== undefined
      ? options.includeSchemaMetadata
      : true;

  // Convert options to properties
  const { properties, required: requiredFields } = convertOptionsToProperties(
    pluginData.options || [],
  );

  // Build official schema
  const schema = {
    title: pluginData.title,
    description: options.description,
    meta: {
      category: pluginData.meta.category,
      documentationUrl: pluginData.meta.documentationUrl,
    },
    type: "object",
  };

  // Add schema metadata if requested
  if (includeSchemaMetadata) {
    schema.$schema = JSON_SCHEMA_VERSION;
    schema.$id = generateSchemaId(pluginData.title);
  }

  // Add properties if present
  if (Object.keys(properties).length > 0) {
    schema.properties = properties;
  }

  // Add required array if present
  if (requiredFields.length > 0) {
    schema.required = requiredFields;
  }

  return schema;
}
