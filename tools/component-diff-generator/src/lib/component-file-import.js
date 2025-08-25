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

// Component-specific file import utilities using shared core
import {
  FileLoader,
  buildFileURL,
  buildFetchOptions,
  cleanFilePath,
  processFileNames as processGenericFileNames,
} from "@adobe/spectrum-diff-core";

// Component-specific constants and configuration
const COMPONENT_PACKAGE_PATH = "packages/component-schemas";

// ===== COMPONENT-SPECIFIC WRAPPER FUNCTIONS =====

/**
 * Constructs the GitHub URL for fetching component schemas
 * @param {string} fileName - Name of the schema file
 * @param {string} version - Package version or "latest"
 * @param {string} location - Branch name when version is "latest"
 * @param {string} repo - Repository in format "owner/repo"
 * @returns {string} Complete URL for the schema file
 */
export function buildComponentURL(fileName, version, location, repo) {
  return buildFileURL(
    fileName,
    version,
    location,
    repo,
    COMPONENT_PACKAGE_PATH,
  );
}

/**
 * Cleans and normalizes component schema file path
 * @param {string} startDir - Base directory path
 * @param {string} fileName - Raw file name from input
 * @returns {string} Cleaned file path
 */
export function cleanComponentPath(startDir, fileName) {
  return cleanFilePath(startDir, fileName);
}

/**
 * Processes component schema file names, adding "schemas/components/" prefix if needed
 * @param {Array<string>} fileNames - Array of schema file names
 * @param {boolean} hasGivenFileNames - Whether file names were explicitly provided
 * @returns {Array<string>} Processed file names
 */
export function processComponentFileNames(fileNames, hasGivenFileNames) {
  return processGenericFileNames(
    fileNames,
    hasGivenFileNames,
    "schemas/components/",
  );
}

// Re-export shared functions for backward compatibility
export { buildFetchOptions };

// ===== COMPONENT-SPECIFIC CLASSES USING SHARED CORE =====

/**
 * Component-specific file loader using shared core
 */
export class ComponentLoader extends FileLoader {
  constructor() {
    // Configure shared core for component-specific paths and settings
    super();
  }

  /**
   * Loads component schemas from remote repository
   * @param {Array<string>} givenFileNames - Schema file names to load
   * @param {string} givenVersion - Package version
   * @param {string} givenLocation - Branch name
   * @param {string} givenRepo - Repository name
   * @param {string} githubAPIKey - API key for authentication
   * @returns {Promise<object>} Merged schema data
   */
  async loadRemoteComponents(
    givenFileNames,
    givenVersion,
    givenLocation,
    givenRepo,
    githubAPIKey,
  ) {
    return await this.loadRemoteFiles(
      givenFileNames,
      givenVersion,
      givenLocation,
      givenRepo,
      githubAPIKey,
      COMPONENT_PACKAGE_PATH,
      null, // No manifest file for components yet
    );
  }

  /**
   * Loads component schemas from local file system
   * @param {string} dirName - Directory containing schema files
   * @param {Array<string>} fileNames - Specific files to load (optional)
   * @returns {Promise<object>} Merged schema data
   */
  async loadLocalComponents(dirName, fileNames) {
    return await this.loadLocalFiles(dirName, fileNames, "*.json");
  }
}

// ===== BACKWARD COMPATIBILITY EXPORTS =====

// Create default instances
const defaultComponentLoader = new ComponentLoader();

/**
 * Main entry point for loading component schemas
 * @param {Array<string>} givenFileNames - Schema file names
 * @param {string} givenVersion - Package version
 * @param {string} givenLocation - Branch name
 * @param {string} givenRepo - Repository name
 * @param {string} githubAPIKey - API key
 * @returns {Promise<object>} Schema data
 */
export default async function componentFileImport(
  givenFileNames,
  givenVersion,
  givenLocation,
  givenRepo,
  githubAPIKey,
) {
  return await defaultComponentLoader.loadRemoteComponents(
    givenFileNames,
    givenVersion,
    givenLocation,
    givenRepo,
    githubAPIKey,
  );
}

/**
 * Loads local component schema data
 * @param {string} dirName - Directory name
 * @param {Array<string>} fileNames - Schema file names
 * @returns {Promise<object>} Schema data
 */
export async function loadLocalComponentData(dirName, fileNames) {
  return await defaultComponentLoader.loadLocalComponents(dirName, fileNames);
}
