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

import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load registry files
export const sizes = JSON.parse(
  readFileSync(join(__dirname, "registry", "sizes.json"), "utf-8"),
);

export const states = JSON.parse(
  readFileSync(join(__dirname, "registry", "states.json"), "utf-8"),
);

export const variants = JSON.parse(
  readFileSync(join(__dirname, "registry", "variants.json"), "utf-8"),
);

export const anatomyTerms = JSON.parse(
  readFileSync(join(__dirname, "registry", "anatomy-terms.json"), "utf-8"),
);

export const components = JSON.parse(
  readFileSync(join(__dirname, "registry", "components.json"), "utf-8"),
);

export const scaleValues = JSON.parse(
  readFileSync(join(__dirname, "registry", "scale-values.json"), "utf-8"),
);

export const categories = JSON.parse(
  readFileSync(join(__dirname, "registry", "categories.json"), "utf-8"),
);

export const platforms = JSON.parse(
  readFileSync(join(__dirname, "registry", "platforms.json"), "utf-8"),
);

export const navigationTerms = JSON.parse(
  readFileSync(join(__dirname, "registry", "navigation-terms.json"), "utf-8"),
);

export const tokenTerminology = JSON.parse(
  readFileSync(join(__dirname, "registry", "token-terminology.json"), "utf-8"),
);

export const glossary = JSON.parse(
  readFileSync(join(__dirname, "registry", "glossary.json"), "utf-8"),
);

/**
 * Get all values from a registry by ID
 * @param {object} registry - The registry object
 * @returns {string[]} Array of value IDs
 */
export function getValues(registry) {
  return registry.values.map((v) => v.id);
}

/**
 * Find a registry value by ID or alias
 * @param {object} registry - The registry object
 * @param {string} searchTerm - The ID or alias to search for
 * @returns {object|undefined} The matching value or undefined
 */
export function findValue(registry, searchTerm) {
  return registry.values.find(
    (v) => v.id === searchTerm || v.aliases?.includes(searchTerm),
  );
}

/**
 * Check if a value exists in a registry
 * @param {object} registry - The registry object
 * @param {string} searchTerm - The ID or alias to search for
 * @returns {boolean} True if the value exists
 */
export function hasValue(registry, searchTerm) {
  return findValue(registry, searchTerm) !== undefined;
}

/**
 * Get the default value from a registry
 * @param {object} registry - The registry object
 * @returns {object|undefined} The default value or undefined
 */
export function getDefault(registry) {
  return registry.values.find((v) => v.default === true);
}

/**
 * Get all non-deprecated values from a registry
 * @param {object} registry - The registry object
 * @returns {array} Array of non-deprecated values
 */
export function getActiveValues(registry) {
  return registry.values.filter((v) => !v.deprecated);
}

/**
 * Load a platform extension file
 * @param {string} extensionPath - Path to the extension JSON file
 * @returns {object} The extension object
 */
export function loadPlatformExtension(extensionPath) {
  return JSON.parse(readFileSync(extensionPath, "utf-8"));
}

/**
 * Get platform-specific term for a registry value
 * @param {object} registry - The base registry object
 * @param {string} termId - The term ID to look up
 * @param {string} platform - The platform name
 * @param {object} extension - Optional: The platform extension object
 * @returns {object|undefined} Platform-specific term info or undefined
 */
export function getTermForPlatform(registry, termId, platform, extension) {
  // First, find the base term
  const baseTerm = findValue(registry, termId);
  if (!baseTerm) return undefined;

  // Check if the term has platform-specific info in its platforms property
  if (baseTerm.platforms && baseTerm.platforms[platform]) {
    return {
      ...baseTerm,
      platform: baseTerm.platforms[platform],
    };
  }

  // If extension is provided, check for platform-specific overrides
  if (extension && extension.platform === platform) {
    const ext = extension.extensions.find((e) => e.termId === termId);
    if (ext) {
      return {
        ...baseTerm,
        platform: {
          term: ext.platformTerm || baseTerm.label,
          aliases: ext.platformAliases,
          notes: ext.notes,
          reference: ext.reference,
          codeExample: ext.codeExample,
          differences: ext.differences,
        },
      };
    }
  }

  // Return base term if no platform-specific info found
  return baseTerm;
}

/**
 * Get all extensions for a specific platform
 * @param {array} extensions - Array of extension objects
 * @param {string} platform - The platform name
 * @returns {array} Array of extensions for the platform
 */
export function getPlatformExtensions(extensions, platform) {
  return extensions.filter((ext) => ext.platform === platform);
}

/**
 * Load all platform extensions from a directory
 * @param {string} extensionsDir - Path to the extensions directory
 * @returns {array} Array of loaded extension objects
 */
export function loadAllPlatformExtensions(extensionsDir) {
  const extensionFiles = readdirSync(extensionsDir).filter((f) =>
    f.endsWith(".json"),
  );

  return extensionFiles.map((file) =>
    loadPlatformExtension(join(extensionsDir, file)),
  );
}
