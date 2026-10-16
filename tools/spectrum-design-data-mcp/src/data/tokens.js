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

let projection;

async function loadProjection() {
  if (!projection) {
    projection = (async () => {
      const { Dataset } = await import("@adobe/design-data-wasm");
      const dataset = Dataset.embedded();
      try {
        const byFile = dataset.legacyOutput();
        const flat = Object.assign({}, ...Object.values(byFile));
        return { byFile, flat };
      } finally {
        dataset.free();
      }
    })();
  }
  try {
    return await projection;
  } catch (cause) {
    projection = undefined;
    throw new Error(
      "Unable to load canonical Spectrum tokens from @adobe/design-data-wasm. " +
        "Ensure its Node package is installed and built with embedded data and legacyOutput().",
      { cause },
    );
  }
}

export async function getTokenData() {
  return (await loadProjection()).byFile;
}

/** Flat { tokenName: tokenData } map — used for alias resolution */
export async function getFlatTokenMap() {
  return (await loadProjection()).flat;
}

/**
 * Get available token categories (filenames without .json)
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
