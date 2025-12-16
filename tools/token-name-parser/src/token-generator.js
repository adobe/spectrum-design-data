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

import { readFile, writeFile } from "fs/promises";

/**
 * Generate original token format from anonymous token array
 * @param {Array} anonymousTokens - Array of anonymous tokens
 * @returns {Object} Original token format with names as keys
 */
export function generateOriginalFormat(anonymousTokens) {
  const originalTokens = {};

  for (const token of anonymousTokens) {
    const tokenName = token.name.original;

    // Reconstruct original token object
    const originalToken = {
      $schema: token.$schema,
      value: token.value,
      uuid: token.id,
    };

    // Add optional fields if they exist
    if (token.deprecated) {
      originalToken.deprecated = token.deprecated;
    }

    if (token.deprecated_comment) {
      originalToken.deprecated_comment = token.deprecated_comment;
    }

    if (token.component) {
      originalToken.component = token.component;
    }

    if (token.private) {
      originalToken.private = token.private;
    }

    // Handle sets (for scale-set tokens)
    if (token.sets) {
      originalToken.sets = token.sets;
    }

    originalTokens[tokenName] = originalToken;
  }

  return originalTokens;
}

/**
 * Generate original token file from anonymous token array
 * @param {string} structuredPath - Path to anonymous tokens JSON
 * @param {string} outputPath - Path for generated tokens
 * @returns {Promise<Object>} Statistics about the generation
 */
export async function generateTokenFile(structuredPath, outputPath) {
  const content = await readFile(structuredPath, "utf8");
  const anonymousTokens = JSON.parse(content);

  const originalTokens = generateOriginalFormat(anonymousTokens);

  await writeFile(outputPath, JSON.stringify(originalTokens, null, 2));

  return {
    totalTokens: Object.keys(originalTokens).length,
    outputPath,
  };
}

export default { generateOriginalFormat, generateTokenFile };
