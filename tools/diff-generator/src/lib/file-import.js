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

const source = "https://raw.githubusercontent.com/";
const defaultRepo = "adobe/spectrum-tokens/";

// ===== PHASE 1: PURE UTILITY FUNCTIONS (easily testable) =====

/**
 * Constructs the GitHub URL for fetching tokens
 * @param {string} tokenName - Name of the token file
 * @param {string} version - Package version or "latest"
 * @param {string} location - Branch name when version is "latest"
 * @param {string} repo - Repository in format "owner/repo"
 * @returns {string} Complete URL for the token file
 */
export function buildTokenURL(tokenName, version, location, repo) {
  const repoURL = source + (repo && repo.length ? repo : defaultRepo);
  const link =
    version !== "latest" ? `${repoURL}/${version}` : `${repoURL}/${location}`;
  const url = `${link}/packages/tokens/${tokenName}`.replaceAll("//", "/");
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
 * Cleans and normalizes token file path
 * @param {string} startDir - Base directory path
 * @param {string} tokenName - Raw token name from input
 * @returns {string} Cleaned file path
 */
export function cleanTokenPath(startDir, tokenName) {
  return startDir + tokenName.trim().replaceAll('"', "").replace(",", "");
}

/**
 * Processes token file names, adding "src/" prefix if needed
 * @param {Array<string>} tokenNames - Array of token file names
 * @param {boolean} hasGivenTokenNames - Whether token names were explicitly provided
 * @returns {Array<string>} Processed token names
 */
export function processTokenNames(tokenNames, hasGivenTokenNames) {
  return tokenNames.map((name) => (hasGivenTokenNames ? `src/${name}` : name));
}

// ===== PHASE 2: DEPENDENCY-INJECTED SERVICE CLASSES =====

/**
 * Handles remote token fetching with dependency injection
 */
export class RemoteTokenFetcher {
  constructor(fetchFn = fetch) {
    this.fetchFn = fetchFn;
  }

  /**
   * Fetches a token file from remote repository
   * @param {string} tokenName - Name of the token file
   * @param {string} version - Package version or "latest"
   * @param {string} location - Branch name when version is "latest"
   * @param {string} repo - Repository in format "owner/repo"
   * @param {string} githubAPIKey - Optional API key
   * @returns {Promise<object>} Token data as JSON object
   */
  async fetchTokens(tokenName, version, location, repo, githubAPIKey) {
    const url = buildTokenURL(tokenName, version, location, repo);
    const options = buildFetchOptions(githubAPIKey);

    try {
      const result = await this.fetchFn(url, options);

      if (result && result.status === 200) {
        try {
          return await result.json();
        } catch (error) {
          throw new Error(
            `Failed to parse JSON from remote token file "${tokenName}" at ${url}: ${error.message}`,
          );
        }
      } else {
        throw new Error(
          `Failed to fetch remote token file "${tokenName}" from ${url}: ${result.status} ${result.statusText}`,
        );
      }
    } catch (error) {
      // Re-throw with additional context if it's a network error
      if (error.message.includes("fetch")) {
        throw new Error(
          `Network error while fetching remote token file "${tokenName}" from ${url}: ${error.message}`,
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
   * @param {Array<string>} tokenNames - Array of file names to load
   * @returns {Promise<object>} Merged JSON data from all files
   */
  async loadData(startDir, tokenNames) {
    const result = {};
    for (let i = 0; i < tokenNames.length; i++) {
      const tokenPath = cleanTokenPath(startDir, tokenNames[i]);
      try {
        await this.fs.access(tokenPath);
        const content = await this.fs.readFile(tokenPath, { encoding: "utf8" });
        const temp = JSON.parse(content);
        Object.assign(result, temp);
      } catch (error) {
        if (error.code === "ENOENT") {
          throw new Error(
            `Token file not found: "${tokenPath}". Check that the file exists and the path is correct.`,
          );
        } else if (
          error.name === "SyntaxError" ||
          error.message.includes("JSON")
        ) {
          throw new Error(
            `Invalid JSON in token file "${tokenPath}": ${error.message}`,
          );
        } else if (error.code === "EACCES") {
          throw new Error(
            `Permission denied accessing token file "${tokenPath}". Check file permissions.`,
          );
        } else {
          throw new Error(
            `Failed to load token file "${tokenPath}": ${error.message}`,
          );
        }
      }
    }
    return result;
  }

  /**
   * Gets list of JSON files in directory
   * @param {string} dirName - Directory to search
   * @returns {Promise<Array<string>>} Array of file paths
   */
  async getTokenFiles(dirName) {
    return await this.fs.glob(`${dirName}/*.json`, {
      ignore: ["node_modules/**", "coverage/**"],
      cwd: "../../",
    });
  }
}

// ===== PHASE 3: ORCHESTRATOR CLASS =====

/**
 * Main token loader service that coordinates local and remote operations
 */
export class TokenLoader {
  constructor(
    remoteTokenFetcher = new RemoteTokenFetcher(),
    localFileSystem = new LocalFileSystem(),
  ) {
    this.remoteFetcher = remoteTokenFetcher;
    this.localFS = localFileSystem;
  }

  /**
   * Loads tokens from remote repository
   * @param {Array<string>} givenTokenNames - Token file names to load
   * @param {string} givenVersion - Package version
   * @param {string} givenLocation - Branch name
   * @param {string} givenRepo - Repository name
   * @param {string} githubAPIKey - API key for authentication
   * @returns {Promise<object>} Merged token data
   */
  async loadRemoteTokens(
    givenTokenNames,
    givenVersion,
    givenLocation,
    givenRepo,
    githubAPIKey,
  ) {
    try {
      const version = givenVersion || "latest";
      const location = givenLocation || "main";
      const result = {};

      // Get list of token files to load
      const tokenNames =
        givenTokenNames ||
        (await this.remoteFetcher.fetchTokens(
          "manifest.json",
          version,
          location,
          givenRepo,
          githubAPIKey,
        ));

      // Process token names
      const processedNames = processTokenNames(
        tokenNames,
        Boolean(givenTokenNames),
      );

      // Load each token file
      for (const name of processedNames) {
        const tokens = await this.remoteFetcher.fetchTokens(
          name,
          version,
          location,
          givenRepo,
          githubAPIKey,
        );
        Object.assign(result, tokens);
      }

      return result;
    } catch (error) {
      const repoInfo = givenRepo || "adobe/spectrum-tokens";
      const versionInfo = givenVersion
        ? `version ${givenVersion}`
        : `branch ${givenLocation || "main"}`;
      throw new Error(
        `Failed to load remote tokens from ${repoInfo} (${versionInfo}): ${error.message}`,
      );
    }
  }

  /**
   * Loads tokens from local file system
   * @param {string} dirName - Directory containing token files
   * @param {Array<string>} tokenNames - Specific files to load (optional)
   * @returns {Promise<object>} Merged token data
   */
  async loadLocalTokens(dirName, tokenNames) {
    try {
      const startDir = this.localFS.process.cwd();
      const root = this.localFS.getRootPath(startDir, "pnpm-lock.yaml");

      if (!root) {
        throw new Error(
          `Could not find project root (pnpm-lock.yaml) starting from "${startDir}". Make sure you're running from within a valid project directory.`,
        );
      }

      const basePath = root.substring(0, root.lastIndexOf("/"));

      if (tokenNames) {
        return await this.localFS.loadData(
          `${basePath}/${dirName}/`,
          tokenNames,
        );
      }
      const fileNames = await this.localFS.getTokenFiles(dirName);
      return await this.localFS.loadData(`${basePath}/`, fileNames);
    } catch (error) {
      const operation = tokenNames
        ? `load specific token files [${tokenNames.join(", ")}]`
        : `load all token files from "${dirName}"`;

      console.error(`Error during local token loading: ${error.message}`);
      throw new Error(`Failed to ${operation}: ${error.message}`);
    }
  }
}

// ===== PHASE 4: BACKWARD COMPATIBILITY LAYER =====

// Create default instances for backward compatibility
const defaultTokenLoader = new TokenLoader();

/**
 * Main entry point for loading tokens (backward compatible)
 * @param {Array<string>} givenTokenNames - Token file names
 * @param {string} givenVersion - Package version
 * @param {string} givenLocation - Branch name
 * @param {string} givenRepo - Repository name
 * @param {string} githubAPIKey - API key
 * @returns {Promise<object>} Token data
 */
export default async function fileImport(
  givenTokenNames,
  givenVersion,
  givenLocation,
  givenRepo,
  githubAPIKey,
) {
  return await defaultTokenLoader.loadRemoteTokens(
    givenTokenNames,
    givenVersion,
    givenLocation,
    givenRepo,
    githubAPIKey,
  );
}

/**
 * Loads local token data (backward compatible)
 * @param {string} dirName - Directory name
 * @param {Array<string>} tokenNames - Token file names
 * @returns {Promise<object>} Token data
 */
export async function loadLocalData(dirName, tokenNames) {
  return await defaultTokenLoader.loadLocalTokens(dirName, tokenNames);
}
