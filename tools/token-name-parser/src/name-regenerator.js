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

import Handlebars from "handlebars";
import { readFile } from "fs/promises";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Cache for compiled templates
const templateCache = new Map();

/**
 * Load and compile a Handlebars template
 * @param {string} type - Token type (spacing, component-property, global-property)
 * @returns {Promise<Function>} Compiled template function
 */
async function loadTemplate(type) {
  if (templateCache.has(type)) {
    return templateCache.get(type);
  }

  const templatePath = resolve(__dirname, `../templates/${type}-token.hbs`);
  const templateSource = await readFile(templatePath, "utf8");
  const template = Handlebars.compile(templateSource);

  templateCache.set(type, template);
  return template;
}

/**
 * Regenerate token name from name structure
 * @param {Object} nameStructure - Name structure object
 * @returns {Promise<string>} Regenerated hyphenated name
 */
export async function regenerateTokenName(nameStructure) {
  if (!nameStructure || !nameStructure.category) {
    throw new Error("Invalid name structure: missing category");
  }

  // Handle special cases that don't have templates
  if (nameStructure.category === "special") {
    return nameStructure.property || nameStructure.anatomyPart || "";
  }

  if (nameStructure.category === "unknown") {
    return nameStructure.raw || "";
  }

  if (nameStructure.category === "semantic-alias") {
    // Semantic aliases use their property as the name
    return nameStructure.property || "";
  }

  try {
    const template = await loadTemplate(nameStructure.category);
    return template(nameStructure).trim();
  } catch (error) {
    throw new Error(
      `Failed to regenerate token name for category '${nameStructure.category}': ${error.message}`,
    );
  }
}

/**
 * Regenerate all token names from a parsed tokens object
 * @param {Object} parsedTokens - Object with parsed token structures
 * @returns {Promise<Object>} Object mapping original names to regenerated names
 */
export async function regenerateAllTokenNames(parsedTokens) {
  const results = {};

  for (const [originalName, tokenData] of Object.entries(parsedTokens)) {
    try {
      const regenerated = await regenerateTokenName(tokenData.parsed);
      results[originalName] = regenerated;
    } catch (error) {
      results[originalName] = {
        error: error.message,
        originalName,
      };
    }
  }

  return results;
}

export default { regenerateTokenName, regenerateAllTokenNames };
