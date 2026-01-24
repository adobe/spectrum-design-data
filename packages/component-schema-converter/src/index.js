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
 * @fileoverview Main export file for component schema converter
 */

// Export converters
export { convertPluginToSchema } from "./converters/pluginToSchema.js";
export { convertSchemaToPlugin } from "./converters/schemaToPlugin.js";

// Export validators
export {
  validatePluginFormat,
  validateOfficialSchema,
  validateAgainstJsonSchema,
  validateConversionRequirements,
  getValidCategories,
  getValidOptionTypes,
} from "./converters/validators.js";

// Export utilities
export {
  isSizeEnum,
  isStateEnum,
  isIconRef,
  isColorRef,
  detectOptionType,
  isValidHexColor,
  getValidSizeValues,
  getStateKeywords,
} from "./utils/typeDetection.js";

export {
  toKebabCase,
  generateSchemaId,
  generateIconRef,
  generateColorRef,
  getSchemaBaseUrl,
  JSON_SCHEMA_VERSION,
} from "./utils/schemaGeneration.js";

export {
  SchemaConversionError,
  createMissingFieldError,
  createInvalidFieldError,
  createInvalidTypeError,
  createValidationError,
} from "./utils/errorHandling.js";
