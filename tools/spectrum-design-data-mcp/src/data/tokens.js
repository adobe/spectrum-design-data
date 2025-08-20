/*
Copyright 2024 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Get token data from the spectrum-tokens package
 * @returns {Promise<Object>} Token data organized by category
 */
export async function getTokenData() {
  try {
    // Try to import from the workspace package first
    const spectrumTokens = await import("@adobe/spectrum-tokens");

    // If the package exports token data directly, use it
    if (spectrumTokens.default || spectrumTokens.tokens) {
      return spectrumTokens.default || spectrumTokens.tokens;
    }

    // Otherwise, read the token files directly from the package
    return await loadTokenFilesFromPackage();
  } catch (error) {
    console.error(
      "Failed to load token data from package, trying direct file access:",
      error,
    );
    return await loadTokenFilesDirectly();
  }
}

/**
 * Load token files from the spectrum-tokens package structure
 * @returns {Promise<Object>} Token data
 */
async function loadTokenFilesFromPackage() {
  // This would be the ideal approach - loading from the actual package
  // For now, we'll fall back to direct file access
  return await loadTokenFilesDirectly();
}

/**
 * Load token files directly from the repository structure
 * @returns {Promise<Object>} Token data
 */
async function loadTokenFilesDirectly() {
  const tokenData = {};

  // Path to the tokens source directory
  const tokensPath = join(__dirname, "../../../../packages/tokens/src");

  // List of token files to load
  const tokenFiles = [
    "color-aliases.json",
    "color-component.json",
    "color-palette.json",
    "icons.json",
    "layout-component.json",
    "layout.json",
    "semantic-color-palette.json",
    "typography.json",
  ];

  for (const fileName of tokenFiles) {
    try {
      const filePath = join(tokensPath, fileName);
      const fileContent = readFileSync(filePath, "utf8");
      tokenData[fileName] = JSON.parse(fileContent);
    } catch (error) {
      console.error(`Failed to load token file ${fileName}:`, error);
      // Continue loading other files even if one fails
    }
  }

  return tokenData;
}

/**
 * Get available token categories
 * @returns {Promise<Array<string>>} List of token categories
 */
export async function getTokenCategories() {
  const tokenData = await getTokenData();
  return Object.keys(tokenData).map((fileName) =>
    fileName.replace(".json", ""),
  );
}

/**
 * Get tokens from a specific category
 * @param {string} category - Token category name
 * @returns {Promise<Object|null>} Token data for the category
 */
export async function getTokensByCategory(category) {
  const tokenData = await getTokenData();
  const fileName = category.endsWith(".json") ? category : `${category}.json`;
  return tokenData[fileName] || null;
}
