/*************************************************************************
 * ADOBE CONFIDENTIAL
 * ___________________
 *
 * Copyright 2025 Adobe
 * All Rights Reserved.
 *
 * NOTICE: All information contained herein is, and remains
 * the property of Adobe and its suppliers, if any. The intellectual
 * and technical concepts contained herein are proprietary to Adobe
 * and its suppliers and are protected by all applicable intellectual
 * property laws, including trade secret and copyright laws.
 * Dissemination of this information or reproduction of this material
 * is strictly forbidden unless prior written permission is obtained
 * from Adobe.
 **************************************************************************/
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const componentOptionsSchema = JSON.parse(
  readFileSync(join(__dirname, "../../../component-options.json"), "utf-8"),
);
// Initialize Ajv instance with schema (memoized at module load)
let ajv = null;
let validate = null;
// Store initialization error for reporting
let initializationError = null;
/**
 * Initialize validator synchronously (memoized)
 *
 * This function is called once at module load time to compile the JSON schema.
 * Subsequent calls are no-ops due to memoization check. This ensures the
 * expensive schema compilation only happens once per application lifecycle.
 *
 * @performance Memoized - safe to call multiple times
 */
function initializeValidator() {
  if (ajv) return; // Already initialized (memoization)
  try {
    ajv = new Ajv2020({
      allErrors: true,
      verbose: true,
      strict: false, // Allow flexible schema definitions
    });
    // Add format validators (for URI format in documentationUrl)
    addFormats(ajv);
    // Compile the schema
    validate = ajv.compile(componentOptionsSchema);
  } catch (error) {
    initializationError =
      error instanceof Error
        ? error
        : new Error("Failed to initialize validator");
    console.error(
      "Failed to compile component options schema:",
      initializationError,
    );
  }
}
/**
 * Format Ajv error into user-friendly message
 */
function formatError(error) {
  const path = error.instancePath || "root";
  let message = error.message || "Validation error";
  // Customize messages for common error types
  if (error.params) {
    switch (error.keyword) {
      case "required":
        message = `Missing required property: ${error.params.missingProperty || "unknown"}`;
        break;
      case "type":
        message = `Expected type ${error.params.type || "unknown"}, got ${typeof error.data}`;
        break;
      case "enum": {
        const allowedValues = error.params.allowedValues;
        if (Array.isArray(allowedValues)) {
          message = `Value must be one of: ${allowedValues.join(", ")}`;
        } else {
          message = `Invalid enum value`;
        }
        break;
      }
      case "pattern":
        message = `Value does not match required pattern`;
        break;
      case "format":
        message = `Invalid ${error.params.format || "unknown"} format`;
        break;
      case "const":
        message = `Value must be: ${error.params.allowedValue || "unknown"}`;
        break;
      case "additionalProperties":
        message = `Unexpected property: ${error.params.additionalProperty || "unknown"}`;
        break;
      case "uniqueItems":
        message = `Duplicate items are not allowed`;
        break;
      default:
        message = error.message || "Validation error";
    }
  }
  return {
    path: path === "" ? "root" : path.replace(/^\//, "").replace(/\//g, "."),
    message,
    keyword: error.keyword,
  };
}
// Initialize validator immediately (synchronous)
initializeValidator();
/**
 * Validate component JSON data against the schema
 * @param data - Component data to validate
 * @returns Validation result with errors if any
 */
export function validateComponentJSON(data) {
  // Check if validator is ready
  if (!validate || !ajv) {
    if (initializationError) {
      return {
        valid: false,
        errors: [
          {
            path: "root",
            message: `Validator initialization failed: ${initializationError.message}`,
            keyword: "initialization",
          },
        ],
      };
    }
    // Validator not yet initialized (shouldn't happen with sync init)
    return {
      valid: true,
      errors: [],
    };
  }
  // Handle edge cases
  if (!data) {
    return {
      valid: false,
      errors: [
        {
          path: "root",
          message: "Data is null or undefined",
          keyword: "required",
        },
      ],
    };
  }
  // Run validation
  const valid = validate(data);
  if (valid) {
    return {
      valid: true,
      errors: [],
    };
  }
  // Transform Ajv errors into our format
  const errors = (validate.errors || []).map(formatError);
  return {
    valid: false,
    errors,
  };
}
/**
 * Validate JSON string and parse it
 * @param jsonString - JSON string to validate
 * @returns Validation result with parsed data or errors
 */
export function validateJSONString(jsonString) {
  try {
    const data = JSON.parse(jsonString);
    const result = validateComponentJSON(data);
    return { ...result, data };
  } catch (error) {
    return {
      valid: false,
      errors: [
        {
          path: "root",
          message: `JSON parse error: ${error instanceof Error ? error.message : "Unknown error"}`,
          keyword: "parse",
        },
      ],
    };
  }
}
//# sourceMappingURL=jsonValidator.js.map
