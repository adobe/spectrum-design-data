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
import { access, readFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { glob } from "glob";
import { isString, isArray } from "./helpers.js";

const source = "https://raw.githubusercontent.com/";
const defaultRepo = "adobe/spectrum-tokens/";

// ===== PHASE 1: PURE UTILITY FUNCTIONS (easily testable) =====

/**
 * Constructs the GitHub URL for fetching files
 * @param {string} fileName - Name of the file
 * @param {string} version - Package version or "latest"
 * @param {string} location - Branch name when version is "latest"
 * @param {string} repo - Repository in format "owner/repo"
 * @param {string} packagePath - Path within the repo to the package
 * @returns {string} Complete URL for the file
 */
export function buildFileURL(fileName, version, location, repo, packagePath) {
  const repoURL = source + (repo && repo.length ? repo : defaultRepo);
  const link =
    version !== "latest" ? `${repoURL}/${version}` : `${repoURL}/${location}`;
  const url = `${link}/${packagePath}/${fileName}`.replaceAll("//", "/");
  // Fix the protocol double slash that gets replaced incorrectly
  return url.replace("https:/", "https://");
}

/**
 * Constructs fetch options with optional GitHub API key
 * @param {string} githubAPIKey - Optional API key for authentication
 * @returns {object} Fetch options object
 */
export function buildFetchOptions(githubAPIKey) {
  return githubAPIKey && githubAPIKey.length
    ? {
        headers: {
          Authorization: `Bearer ${githubAPIKey}`,
        },
      }
    : {};
}

/**
 * Cleans and normalizes file path
 * @param {string} startDir - Base directory path
 * @param {string} fileName - Raw file name from input
 * @returns {string} Cleaned file path
 */
export function cleanFilePath(startDir, fileName) {
  return startDir + fileName.trim().replaceAll('"', "").replace(",", "");
}

/**
 * Processes file names, adding prefix if needed
 * @param {Array<string>} fileNames - Array of file names
 * @param {boolean} hasGivenFileNames - Whether file names were explicitly provided
 * @param {string} prefix - Prefix to add when files are explicitly provided
 * @returns {Array<string>} Processed file names
 */
export function processFileNames(
  fileNames,
  hasGivenFileNames,
  prefix = "src/",
) {
  return fileNames.map((name) =>
    hasGivenFileNames ? `${prefix}${name}` : name,
  );
}

// ===== PHASE 2: DEPENDENCY-INJECTED SERVICE CLASSES =====

/**
 * Handles remote file fetching with dependency injection
 */
export class RemoteFileFetcher {
  constructor(fetchFn = fetch) {
    this.fetchFn = fetchFn;
  }

  /**
   * Fetches a file from remote repository
   * @param {string} fileName - Name of the file
   * @param {string} version - Package version or "latest"
   * @param {string} location - Branch name when version is "latest"
   * @param {string} repo - Repository in format "owner/repo"
   * @param {string} packagePath - Path within the repo to the package
   * @param {string} githubAPIKey - Optional API key
   * @returns {Promise<object>} File data as JSON object
   */
  async fetchFile(
    fileName,
    version,
    location,
    repo,
    packagePath,
    githubAPIKey,
  ) {
    const url = buildFileURL(fileName, version, location, repo, packagePath);
    const options = buildFetchOptions(githubAPIKey);

    try {
      const result = await this.fetchFn(url, options);

      if (result && result.status === 200) {
        try {
          return await result.json();
        } catch (error) {
          throw new Error(
            `Failed to parse JSON from remote file "${fileName}" at ${url}: ${error.message}`,
          );
        }
      } else {
        throw new Error(
          `Failed to fetch remote file "${fileName}" from ${url}: ${result.status} ${result.statusText}`,
        );
      }
    } catch (error) {
      // Re-throw with additional context if it's a network error
      if (error.message.includes("fetch")) {
        throw new Error(
          `Network error while fetching remote file "${fileName}" from ${url}: ${error.message}`,
        );
      }
      // Re-throw our own enhanced errors as-is
      throw error;
    }
  }
}

/**
 * Handles local file system operations with dependency injection
 */
export class LocalFileSystem {
  constructor(
    fsOps = { access, readFile, existsSync, glob },
    pathOps = path,
    processOps = process,
  ) {
    this.fs = fsOps;
    this.path = pathOps;
    this.process = processOps;
  }

  /**
   * Traverses directory tree to find target file
   * @param {string} startDir - Starting directory
   * @param {string} targetFile - Target file to find
   * @returns {string|null} Path to target file or null if not found
   */
  getRootPath(startDir, targetFile) {
    let curDir = startDir;
    while (this.fs.existsSync(curDir)) {
      const curDirPath = this.path.join(curDir, targetFile);
      if (this.fs.existsSync(curDirPath)) {
        return curDirPath;
      }
      const parentDir = this.path.dirname(curDir);
      if (parentDir === curDir) {
        return null;
      }
      curDir = parentDir;
    }
    return null;
  }

  /**
   * Loads and parses multiple JSON files
   * @param {string} startDir - Base directory
   * @param {Array<string>} fileNames - Array of file names to load
   * @returns {Promise<object>} Merged JSON data from all files
   */
  async loadData(startDir, fileNames) {
    const result = {};
    for (let i = 0; i < fileNames.length; i++) {
      const filePath = cleanFilePath(startDir, fileNames[i]);
      try {
        await this.fs.access(filePath);
        const content = await this.fs.readFile(filePath, { encoding: "utf8" });
        const temp = JSON.parse(content);
        Object.assign(result, temp);
      } catch (error) {
        if (error.code === "ENOENT") {
          throw new Error(
            `File not found: "${filePath}". Check that the file exists and the path is correct.`,
          );
        } else if (
          error.name === "SyntaxError" ||
          error.message.includes("JSON")
        ) {
          throw new Error(
            `Invalid JSON in file "${filePath}": ${error.message}`,
          );
        } else if (error.code === "EACCES") {
          throw new Error(
            `Permission denied accessing file "${filePath}". Check file permissions.`,
          );
        } else {
          throw new Error(
            `Failed to load file "${filePath}": ${error.message}`,
          );
        }
      }
    }
    return result;
  }

  /**
   * Gets list of JSON files in directory
   * @param {string} dirName - Directory to search
   * @param {string} pattern - File pattern to match (default: "*.json")
   * @returns {Promise<Array<string>>} Array of file paths
   */
  async getFiles(dirName, pattern = "*.json") {
    return await this.fs.glob(`${dirName}/${pattern}`, {
      ignore: ["node_modules/**", "coverage/**"],
      cwd: "../../",
    });
  }
}

// ===== PHASE 3: ORCHESTRATOR CLASS =====

/**
 * Main file loader service that coordinates local and remote operations
 */
export class FileLoader {
  constructor(
    remoteFileFetcher = new RemoteFileFetcher(),
    localFileSystem = new LocalFileSystem(),
  ) {
    this.remoteFetcher = remoteFileFetcher;
    this.localFS = localFileSystem;
  }

  /**
   * Loads files from remote repository
   * @param {Array<string>} givenFileNames - File names to load
   * @param {string} givenVersion - Package version
   * @param {string} givenLocation - Branch name
   * @param {string} givenRepo - Repository name
   * @param {string} githubAPIKey - API key for authentication
   * @param {string} packagePath - Path within repo to package
   * @param {string} manifestFile - Manifest file name (optional)
   * @returns {Promise<object>} Merged file data
   */
  async loadRemoteFiles(
    givenFileNames,
    givenVersion,
    givenLocation,
    givenRepo,
    githubAPIKey,
    packagePath,
    manifestFile = null,
  ) {
    try {
      const version = givenVersion || "latest";
      const location = givenLocation || "main";
      const result = {};

      // Get list of files to load
      let fileNames = givenFileNames;
      if (!fileNames && manifestFile) {
        fileNames = await this.remoteFetcher.fetchFile(
          manifestFile,
          version,
          location,
          givenRepo,
          packagePath,
          githubAPIKey,
        );
      }

      if (!fileNames) {
        throw new Error(
          "No file names provided and no manifest file specified",
        );
      }

      // Process file names
      const processedNames = processFileNames(
        isArray(fileNames) ? fileNames : [fileNames],
        Boolean(givenFileNames),
        "", // No prefix for remote files by default
      );

      // Load each file
      for (const name of processedNames) {
        const fileData = await this.remoteFetcher.fetchFile(
          name,
          version,
          location,
          givenRepo,
          packagePath,
          githubAPIKey,
        );
        Object.assign(result, fileData);
      }

      return result;
    } catch (error) {
      const repoInfo = givenRepo || "adobe/spectrum-tokens";
      const versionInfo = givenVersion
        ? `version ${givenVersion}`
        : `branch ${givenLocation || "main"}`;
      throw new Error(
        `Failed to load remote files from ${repoInfo} (${versionInfo}): ${error.message}`,
      );
    }
  }

  /**
   * Loads files from local file system
   * @param {string} dirName - Directory containing files
   * @param {Array<string>} fileNames - Specific files to load (optional)
   * @param {string} pattern - File pattern to match when loading all files
   * @returns {Promise<object>} Merged file data
   */
  async loadLocalFiles(dirName, fileNames, pattern = "*.json") {
    try {
      const startDir = this.localFS.process.cwd();
      const root = this.localFS.getRootPath(startDir, "pnpm-lock.yaml");

      if (!root) {
        throw new Error(
          `Could not find project root (pnpm-lock.yaml) starting from "${startDir}". Make sure you're running from within a valid project directory.`,
        );
      }

      const basePath = root.substring(0, root.lastIndexOf("/"));

      if (fileNames) {
        return await this.localFS.loadData(
          `${basePath}/${dirName}/`,
          fileNames,
        );
      }
      const allFileNames = await this.localFS.getFiles(dirName, pattern);
      return await this.localFS.loadData(`${basePath}/`, allFileNames);
    } catch (error) {
      const operation = fileNames
        ? `load specific files [${fileNames.join(", ")}]`
        : `load all files from "${dirName}"`;

      console.error(`Error during local file loading: ${error.message}`);
      throw new Error(`Failed to ${operation}: ${error.message}`);
    }
  }
}
