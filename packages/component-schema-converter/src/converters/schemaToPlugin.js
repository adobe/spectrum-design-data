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
 * @fileoverview Convert official Spectrum JSON Schema to plugin format
 */

import { detectOptionType } from "../utils/typeDetection.js";
import {
  SchemaConversionError,
  createMissingFieldError,
} from "../utils/errorHandling.js";

/**
 * Convert a single JSON Schema property to plugin option format
 *
 * @param {string} propertyName - Property name
 * @param {import('../types/schemas.js').SchemaProperty} property - JSON Schema property
 * @param {boolean} isRequired - Whether property is required
 * @returns {import('../types/schemas.js').PluginOption} Plugin option
 */
function convertPropertyToOption(propertyName, property, isRequired) {
  const optionType = detectOptionType(property);
  const option = {
    title: propertyName,
    type: optionType,
    required: isRequired,
  };

  // Add description if present
  if (property.description) {
    option.description = property.description;
  }

  // Add default value (rename from 'default' to 'defaultValue')
  if (property.default !== undefined) {
    option.defaultValue = property.default;
  }

  // Add items for enum types
  if (
    property.enum &&
    (optionType === "localEnum" ||
      optionType === "systemEnum" ||
      optionType === "size" ||
      optionType === "state")
  ) {
    option.items = property.enum;
  }

  return option;
}

/**
 * Convert JSON Schema properties object to plugin options array
 *
 * @param {Object<string, import('../types/schemas.js').SchemaProperty>} [properties] - JSON Schema properties
 * @param {Array<string>} [requiredFields=[]] - Required property names
 * @returns {Array<import('../types/schemas.js').PluginOption>} Plugin options array
 */
function convertPropertiesToOptions(properties, requiredFields = []) {
  if (!properties || typeof properties !== "object") {
    return [];
  }

  const options = [];

  for (const [propertyName, property] of Object.entries(properties)) {
    const isRequired = requiredFields.includes(propertyName);
    const option = convertPropertyToOption(propertyName, property, isRequired);
    options.push(option);
  }

  return options;
}

/**
 * Validate official schema data
 *
 * @param {import('../types/schemas.js').OfficialSchema} schema - Official schema
 * @throws {SchemaConversionError} If validation fails
 */
function validateSchemaData(schema) {
  if (!schema || typeof schema !== "object") {
    throw new SchemaConversionError("Invalid schema data: must be an object");
  }

  if (!schema.title || typeof schema.title !== "string") {
    throw createMissingFieldError("title");
  }

  // Meta is optional in some schemas, provide defaults
  if (schema.meta && typeof schema.meta !== "object") {
    throw new SchemaConversionError("Invalid meta: must be an object");
  }
}

/**
 * Convert official Spectrum JSON Schema to plugin format
 *
 * @param {import('../types/schemas.js').OfficialSchema} schema - Official JSON Schema
 * @returns {import('../types/schemas.js').PluginComponent} Plugin format data
 *
 * @throws {SchemaConversionError} If conversion fails
 *
 * @example
 * const schema = {
 *   $schema: 'https://json-schema.org/draft/2020-12/schema',
 *   $id: 'https://...spectrum-design-data/schemas/components/button.json',
 *   title: 'Button',
 *   description: 'Buttons allow users to perform an action.',
 *   meta: {
 *     category: 'actions',
 *     documentationUrl: 'https://spectrum.adobe.com/page/button/'
 *   },
 *   type: 'object',
 *   properties: {
 *     size: {
 *       type: 'string',
 *       enum: ['s', 'm', 'l', 'xl'],
 *       default: 'm'
 *     }
 *   }
 * };
 *
 * const pluginData = convertSchemaToPlugin(schema);
 * // {
 * //   title: 'Button',
 * //   meta: { category: 'actions', documentationUrl: '...' },
 * //   options: [
 * //     { title: 'size', type: 'size', items: ['s', 'm', 'l', 'xl'], defaultValue: 'm', required: false }
 * //   ]
 * // }
 */
export function convertSchemaToPlugin(schema) {
  // Validate input
  validateSchemaData(schema);

  // Extract metadata with defaults
  const meta = {
    category: schema.meta?.category || "",
    documentationUrl: schema.meta?.documentationUrl || "",
  };

  // Convert properties → options array
  const options = convertPropertiesToOptions(
    schema.properties,
    schema.required || [],
  );

  return {
    title: schema.title,
    meta,
    options,
  };
}
