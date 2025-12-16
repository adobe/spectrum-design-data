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

import Ajv from "ajv";
import addFormats from "ajv-formats";
import { readFile } from "fs/promises";
import { resolve } from "path";

/**
 * Create AJV validator with schemas loaded
 * @param {string} schemasPath - Path to schemas directory
 * @returns {Promise<Ajv>} Configured AJV instance
 */
export async function createValidator(schemasPath) {
  const ajv = new Ajv({
    allErrors: true,
    verbose: true,
    strict: false,
    $comment: true,
    validateSchema: false, // Don't validate meta-schemas
  });

  addFormats(ajv);

  // Load enum schemas
  const enumFiles = [
    "anatomy-parts.json",
    "components.json",
    "component-options.json",
    "properties.json",
    "modifiers.json",
    "sizes.json",
    "states.json",
    "platforms.json",
    "themes.json",
    "relationship-connectors.json",
    "colors.json",
    "color-modifiers.json",
    "color-indices.json",
  ];

  for (const file of enumFiles) {
    const schemaPath = resolve(schemasPath, "enums", file);
    const schema = JSON.parse(await readFile(schemaPath, "utf8"));
    ajv.addSchema(schema);
  }

  // Load base token schemas (order matters for $ref resolution)
  const baseSchemas = [
    "base-token.json",
    "regular-token.json",
    "scale-set-token.json",
    "color-set-token.json",
  ];

  for (const file of baseSchemas) {
    try {
      const schemaPath = resolve(schemasPath, file);
      const schema = JSON.parse(await readFile(schemaPath, "utf8"));
      ajv.addSchema(schema);
    } catch (error) {
      // Schema might not exist yet, that's okay
      console.warn(`  ⚠ Could not load ${file}: ${error.message}`);
    }
  }

  // Load category-specific token schemas (regular tokens)
  const regularSchemas = [
    "spacing-token.json",
    "component-property-token.json",
    "generic-property-token.json",
    "semantic-alias-token.json",
    "color-base-token.json",
    "color-scale-token.json",
    "gradient-color-token.json",
    "typography-base-token.json",
  ];

  for (const file of regularSchemas) {
    try {
      const schemaPath = resolve(schemasPath, file);
      const schema = JSON.parse(await readFile(schemaPath, "utf8"));
      ajv.addSchema(schema);
    } catch (error) {
      // Schema might not exist yet
    }
  }

  // Load scale-set token schemas
  const scaleSetSchemas = [
    "spacing-scale-set-token.json",
    "component-property-scale-set-token.json",
    "generic-property-scale-set-token.json",
    "color-scale-scale-set-token.json",
    "semantic-alias-color-set-token.json",
  ];

  for (const file of scaleSetSchemas) {
    try {
      const schemaPath = resolve(schemasPath, file);
      const schema = JSON.parse(await readFile(schemaPath, "utf8"));
      ajv.addSchema(schema);
    } catch (error) {
      // Schema might not exist yet
    }
  }

  return ajv;
}

/**
 * Validate an anonymous token against its schema
 * @param {Object} token - Anonymous token
 * @param {Ajv} ajv - AJV validator instance
 * @returns {Object} Validation result
 */
export function validateToken(token, ajv) {
  const isScaleSet = token.sets !== undefined;
  const schemaId = getSchemaIdForToken(
    token.name.structure.category,
    isScaleSet,
  );

  if (!schemaId) {
    return {
      isValid: false,
      errors: [
        `No schema found for category: ${token.name.structure.category} (scale-set: ${isScaleSet})`,
      ],
    };
  }

  const validate = ajv.getSchema(schemaId);

  if (!validate) {
    return {
      isValid: false,
      errors: [`Schema not loaded: ${schemaId}`],
    };
  }

  const isValid = validate(token);

  return {
    isValid,
    errors: isValid
      ? []
      : (validate.errors || []).map((err) => {
          return `${err.instancePath} ${err.message}`;
        }),
  };
}

/**
 * Get schema ID for a token category and type
 * @param {string} category - Token category
 * @param {boolean} isScaleSet - Whether token is a scale-set
 * @returns {string|null} Schema ID
 */
function getSchemaIdForToken(category, isScaleSet) {
  const baseUrl =
    "https://opensource.adobe.com/spectrum-design-data/schemas/structured-tokens";

  if (isScaleSet) {
    const scaleSetSchemas = {
      spacing: `${baseUrl}/spacing-scale-set-token.json`,
      "component-property": `${baseUrl}/component-property-scale-set-token.json`,
      "generic-property": `${baseUrl}/generic-property-scale-set-token.json`,
      "color-scale": `${baseUrl}/color-scale-scale-set-token.json`,
      "semantic-alias": `${baseUrl}/semantic-alias-color-set-token.json`,
    };
    return scaleSetSchemas[category] || null;
  } else {
    const regularSchemas = {
      spacing: `${baseUrl}/spacing-token.json`,
      "component-property": `${baseUrl}/component-property-token.json`,
      "generic-property": `${baseUrl}/generic-property-token.json`,
      "semantic-alias": `${baseUrl}/semantic-alias-token.json`,
      "color-base": `${baseUrl}/color-base-token.json`,
      "color-scale": `${baseUrl}/color-scale-token.json`,
      "gradient-color": `${baseUrl}/gradient-color-token.json`,
      "typography-base": `${baseUrl}/typography-base-token.json`,
    };
    return regularSchemas[category] || null;
  }
}

/**
 * Validate all anonymous tokens
 * @param {Array} parsedTokens - Array of anonymous tokens
 * @param {Ajv} ajv - AJV validator instance
 * @returns {Object} Validation report
 */
export function validateAllTokens(parsedTokens, ajv) {
  const results = {
    total: 0,
    valid: 0,
    invalid: 0,
    byCategory: {},
    invalidTokens: [],
  };

  for (const token of parsedTokens) {
    results.total++;

    const validation = validateToken(token, ajv);

    // Track by category
    const category = token.name.structure.category;
    if (!results.byCategory[category]) {
      results.byCategory[category] = { total: 0, valid: 0, invalid: 0 };
    }
    results.byCategory[category].total++;

    if (validation.isValid) {
      results.valid++;
      results.byCategory[category].valid++;
    } else {
      results.invalid++;
      results.byCategory[category].invalid++;
      results.invalidTokens.push({
        tokenName: token.name.original,
        category,
        errors: validation.errors,
        nameStructure: token.name.structure,
      });
    }
  }

  return results;
}

export default { createValidator, validateToken, validateAllTokens };
