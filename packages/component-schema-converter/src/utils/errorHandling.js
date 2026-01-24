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
 * @fileoverview Error handling utilities for schema conversion
 */

/**
 * Custom error class for schema conversion errors
 */
export class SchemaConversionError extends Error {
  /**
   * @param {string} message - Error message
   * @param {Object} [details={}] - Additional error details
   * @param {string} [details.field] - Field that caused the error
   * @param {*} [details.expected] - Expected value or type
   * @param {*} [details.received] - Received value
   * @param {string} [details.suggestion] - Helpful suggestion for fixing the error
   */
  constructor(message, details = {}) {
    super(message);
    this.name = "SchemaConversionError";
    this.details = details;
  }
}

/**
 * Create an error for missing required field
 * @param {string} field - Field name
 * @returns {SchemaConversionError}
 */
export function createMissingFieldError(field) {
  return new SchemaConversionError(`Missing required field: ${field}`, {
    field,
    expected: "non-empty value",
    received: "undefined or empty",
  });
}

/**
 * Create an error for invalid field value
 * @param {string} field - Field name
 * @param {*} expected - Expected value or type
 * @param {*} received - Received value
 * @param {string} [suggestion] - Helpful suggestion
 * @returns {SchemaConversionError}
 */
export function createInvalidFieldError(field, expected, received, suggestion) {
  return new SchemaConversionError(
    `Invalid value for field '${field}': expected ${expected}, received ${received}`,
    {
      field,
      expected,
      received,
      suggestion,
    },
  );
}

/**
 * Create an error for invalid type
 * @param {string} type - Invalid type
 * @param {Array<string>} validTypes - Valid types
 * @returns {SchemaConversionError}
 */
export function createInvalidTypeError(type, validTypes) {
  const suggestion =
    validTypes.length > 0
      ? `Valid types are: ${validTypes.join(", ")}`
      : "No valid types available";
  return new SchemaConversionError(`Invalid option type: ${type}`, {
    field: "type",
    expected: validTypes.join(" | "),
    received: type,
    suggestion,
  });
}

/**
 * Create an error for validation failure
 * @param {string} message - Validation error message
 * @param {Array<Object>} [errors] - Ajv validation errors
 * @returns {SchemaConversionError}
 */
export function createValidationError(message, errors = []) {
  return new SchemaConversionError(message, {
    validationErrors: errors,
  });
}
