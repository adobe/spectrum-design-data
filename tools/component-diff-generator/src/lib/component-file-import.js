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
    // If specific files provided, use them; otherwise discover all available files
    let fileNames = givenFileNames;

    if (!fileNames) {
      // Dynamically discover component schema files from the remote branch
      fileNames = await this.discoverRemoteComponentFiles(
        givenVersion || "latest",
        givenLocation || "main",
        givenRepo,
        githubAPIKey,
      );
    }

    // Load individual component files and key by component name
    const result = {};
    for (const fileName of fileNames) {
      try {
        const componentData = await this.remoteFetcher.fetchFile(
          fileName,
          givenVersion || "latest",
          givenLocation || "main",
          givenRepo,
          COMPONENT_PACKAGE_PATH,
          githubAPIKey,
        );
        // Use the filename without extension as the component key
        const componentName = fileName.split("/").pop().replace(".json", "");
        result[componentName] = componentData;
      } catch (error) {
        // File might not exist in this branch - this is expected for new/deleted components
        console.debug(
          `Debug: Could not load component file ${fileName}: ${error.message}`,
        );
      }
    }

    return result;
  }

  /**
   * Discovers all component schema files from a remote branch
   * @param {string} version - Package version or "latest"
   * @param {string} location - Branch name
   * @param {string} repo - Repository name
   * @param {string} githubAPIKey - API key for authentication
   * @returns {Promise<Array<string>>} List of discovered component file paths
   */
  async discoverRemoteComponentFiles(version, location, repo, githubAPIKey) {
    try {
      // Try to fetch the GitHub API directory listing
      const repoName = repo || "adobe/spectrum-tokens";
      const branch = version === "latest" ? location : version;
      const apiUrl = `https://api.github.com/repos/${repoName}/contents/packages/component-schemas/schemas`;

      const options = githubAPIKey
        ? { headers: { Authorization: `token ${githubAPIKey}` } }
        : {};

      const response = await fetch(`${apiUrl}?ref=${branch}`, options);

      if (response.ok) {
        const contents = await response.json();
        const files = [];

        // Process directory contents recursively
        for (const item of contents) {
          if (item.type === "file" && item.name.endsWith(".json")) {
            files.push(`schemas/${item.name}`);
          } else if (item.type === "dir") {
            // Recursively get files from subdirectories (like components/, types/)
            const subFiles = await this.getFilesFromDirectory(
              `${apiUrl}/${item.name}`,
              branch,
              options,
              `schemas/${item.name}`,
            );
            files.push(...subFiles);
          }
        }

        return files;
      } else {
        console.warn(
          `Could not discover files via GitHub API (${response.status}), using fallback list`,
        );
        return this.getFallbackComponentFiles();
      }
    } catch (error) {
      console.warn(
        `Could not discover files via GitHub API: ${error.message}, using fallback list`,
      );
      return this.getFallbackComponentFiles();
    }
  }

  /**
   * Gets files from a directory via GitHub API
   * @param {string} dirUrl - API URL for the directory
   * @param {string} branch - Branch name
   * @param {object} options - Fetch options
   * @param {string} pathPrefix - Path prefix to prepend to file names
   * @returns {Promise<Array<string>>} List of file paths
   */
  async getFilesFromDirectory(dirUrl, branch, options, pathPrefix) {
    try {
      const response = await fetch(`${dirUrl}?ref=${branch}`, options);
      if (response.ok) {
        const contents = await response.json();
        return contents
          .filter((item) => item.type === "file" && item.name.endsWith(".json"))
          .map((item) => `${pathPrefix}/${item.name}`);
      }
      return [];
    } catch (error) {
      console.debug(`Could not list directory ${dirUrl}: ${error.message}`);
      return [];
    }
  }

  /**
   * Returns fallback list of component files when dynamic discovery fails
   * @returns {Array<string>} Fallback file list
   */
  getFallbackComponentFiles() {
    return [
      "schemas/component.json",
      "schemas/components/action-bar.json",
      "schemas/components/action-button.json",
      "schemas/components/action-group.json",
      "schemas/components/alert-banner.json",
      "schemas/components/alert-dialog.json",
      "schemas/components/avatar.json",
      "schemas/components/badge.json",
      "schemas/components/body.json",
      "schemas/components/bottom-navigation-android.json",
      "schemas/components/breadcrumbs.json",
      "schemas/components/button-group.json",
      "schemas/components/button.json",
      "schemas/components/checkbox-group.json",
      "schemas/components/checkbox.json",
      "schemas/components/close-button.json",
      "schemas/components/coach-indicator.json",
      "schemas/components/code.json",
      "schemas/components/color-area.json",
      "schemas/components/color-loupe.json",
      "schemas/components/color-slider.json",
      "schemas/components/color-wheel.json",
      "schemas/components/combo-box.json",
      "schemas/components/contextual-help.json",
      "schemas/components/detail.json",
      "schemas/components/divider.json",
      "schemas/components/field-label.json",
      "schemas/components/heading.json",
      "schemas/components/help-text.json",
      "schemas/components/in-field-progress-button.json",
      "schemas/components/in-field-progress-circle.json",
      "schemas/components/in-line-alert.json",
      "schemas/components/link.json",
      "schemas/components/menu.json",
      "schemas/components/meter.json",
      "schemas/components/opacity-checkerboard.json",
      "schemas/components/picker.json",
      "schemas/components/popover.json",
      "schemas/components/progress-bar.json",
      "schemas/components/progress-circle.json",
      "schemas/components/radio-button.json",
      "schemas/components/radio-group.json",
      "schemas/components/rating.json",
      "schemas/components/scroll-zoom-bar.json",
      "schemas/components/search-field.json",
      "schemas/components/select-box.json",
      "schemas/components/side-navigation.json",
      "schemas/components/slider.json",
      "schemas/components/status-light.json",
      "schemas/components/swatch-group.json",
      "schemas/components/swatch.json",
      "schemas/components/switch.json",
      "schemas/components/tab-bar-ios.json",
      "schemas/components/tabs.json",
      "schemas/components/tag.json",
      "schemas/components/text-area.json",
      "schemas/components/text-field.json",
      "schemas/components/thumbnail.json",
      "schemas/components/toast.json",
      "schemas/components/tooltip.json",
      "schemas/components/tray.json",
      "schemas/components/tree-view.json",
      "schemas/types/hex-color.json",
      "schemas/types/typography-classification.json",
      "schemas/types/typography-script.json",
      "schemas/types/workflow-icon.json",
    ];
  }

  /**
   * Gets list of local component files
   * @param {string} dirName - Directory containing schema files
   * @returns {Promise<Array<string>>} List of component file paths
   */
  async getLocalComponentFiles(dirName) {
    try {
      const allFiles = await this.localFS.getFiles(dirName, "*.json");
      return allFiles.map((filePath) => {
        // Convert absolute paths to relative schema paths
        const relativePath = filePath.replace(dirName + "/", "");
        return relativePath.startsWith("schemas/")
          ? relativePath
          : `schemas/${relativePath}`;
      });
    } catch (error) {
      console.warn(
        `Warning: Could not discover local component files: ${error.message}`,
      );
      return [];
    }
  }

  /**
   * Loads component schemas from local file system
   * @param {string} dirName - Directory containing schema files
   * @param {Array<string>} fileNames - Specific files to load (optional)
   * @returns {Promise<object>} Merged schema data
   */
  async loadLocalComponents(dirName, fileNames) {
    // Load all files using shared core
    const allFiles = await this.localFS.getFiles(dirName, "*.json");
    const result = {};

    for (const filePath of allFiles) {
      try {
        const fileData = await this.localFS.loadData([filePath]);
        // Extract component name from file path
        const componentName = filePath.split("/").pop().replace(".json", "");
        result[componentName] = fileData;
      } catch (error) {
        console.warn(
          `Warning: Could not load local component file ${filePath}: ${error.message}`,
        );
      }
    }

    return result;
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
