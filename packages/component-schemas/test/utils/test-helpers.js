import { readFile } from "fs/promises";
import { glob } from "glob";
import { resolve } from "path";
import Ajv from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

/**
 * Read and parse a JSON file
 * @param {string} filePath - Path to the JSON file
 * @returns {Promise<Object>} Parsed JSON object
 */
export const readJSON = async (filePath) =>
  JSON.parse(await readFile(filePath, "utf8"));

/**
 * Get all schema files matching a pattern
 * @param {string} pattern - Glob pattern for schema files
 * @returns {Promise<string[]>} Array of file paths
 */
export const getSchemaFiles = async (pattern = "schemas/**/*.json") =>
  await glob(pattern);

/**
 * Create a configured Ajv instance with common schemas
 * @returns {Promise<Ajv>} Configured Ajv instance
 */
export const createAjvInstance = async () => {
  const ajv = new Ajv({
    allErrors: true,
    verbose: true,
    strict: false,
  });

  addFormats(ajv);

  // Add component schema as meta schema
  const componentSchema = await readJSON("schemas/component.json");
  ajv.addMetaSchema(componentSchema);

  // Add type schemas
  const typeSchemaFiles = await glob("schemas/types/*.json");
  for (const schemaFile of typeSchemaFiles) {
    const schema = await readJSON(schemaFile);
    ajv.addSchema(schema);
  }

  return ajv;
};

/**
 * Validate a schema against the component definition
 * @param {Object} schema - Schema to validate
 * @param {Ajv} ajv - Ajv instance
 * @returns {Object} Validation result with errors if any
 */
export const validateSchema = (schema, ajv) => {
  const valid = ajv.validateSchema(schema);
  return {
    valid,
    errors: ajv.errors || [],
  };
};

/**
 * Validate examples in a schema
 * @param {Object} schema - Schema containing examples
 * @param {Ajv} ajv - Ajv instance
 * @returns {Object} Validation result with errors if any
 */
export const validateExamples = (schema, ajv) => {
  const validate = ajv.compile(schema);
  const examples = schema.examples || [];
  const errors = [];

  for (const example of examples) {
    const valid = validate(example);
    if (!valid) {
      errors.push({
        example,
        errors: validate.errors,
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};
