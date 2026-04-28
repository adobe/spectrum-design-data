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

import fetch from "node-fetch";

/**
 * Parses GitHub PR URL to extract owner, repo, and PR number
 * @param {string} prUrl - GitHub PR URL
 * @returns {object} - {owner, repo, prNumber}
 */
export function parsePRUrl(prUrl) {
  const regex = /^https:\/\/github\.com\/([^\/]+)\/([^\/]+)\/pull\/(\d+)$/;
  const match = prUrl.match(regex);

  if (!match) {
    throw new Error(`Invalid GitHub PR URL format: ${prUrl}`);
  }

  return {
    owner: match[1],
    repo: match[2],
    prNumber: parseInt(match[3], 10),
  };
}

/**
 * Fetches PR data from GitHub API
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {number} prNumber - PR number
 * @param {string} [token] - GitHub API token
 * @returns {Promise<object>} - PR data
 */
export async function fetchPRData(owner, repo, prNumber, token) {
  const url = `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}`;
  const headers = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "token-changeset-generator",
  };

  if (token) {
    headers["Authorization"] = `token ${token}`;
  }

  const response = await fetch(url, { headers });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch PR data: ${response.status} ${response.statusText}`,
    );
  }

  return response.json();
}

/**
 * Extracts the "Motivation and context" section from a PR description
 * @param {string} description - PR description text
 * @returns {string} - Extracted motivation text
 */
export function extractMotivation(description) {
  if (!description) {
    return "";
  }

  // Look for "Motivation and context" section - handle both single and double newlines
  const motivationRegex =
    /##\s*Motivation and context\s*\n+(?:<[^>]*>)?(.*?)(?:<\/[^>]*>)?(?=\n\n##|\n##|$)/is;
  const match = description.match(motivationRegex);

  if (match && match[1]) {
    return match[1].trim();
  }

  // Fallback: look for any section with "motivation" in the header
  const fallbackRegex =
    /##\s*(?:Design\s+)?[Mm]otivation.*?\s*\n+(?:<[^>]*>)?(.*?)(?:<\/[^>]*>)?(?=\n\n##|\n##|$)/is;
  const fallbackMatch = description.match(fallbackRegex);

  if (fallbackMatch && fallbackMatch[1]) {
    return fallbackMatch[1].trim();
  }

  return "";
}

/**
 * Extracts branch name from PR data
 * @param {object} prData - PR data from GitHub API
 * @returns {string} - Branch name
 */
export function extractBranchName(prData) {
  return prData.head?.ref || "";
}

/**
 * Complete function to get motivation from a tokens studio PR
 * @param {string} prUrl - GitHub PR URL
 * @param {string} [token] - GitHub API token
 * @returns {Promise<string>} - Extracted motivation text
 */
export async function getTokensStudioMotivation(prUrl, token) {
  const { owner, repo, prNumber } = parsePRUrl(prUrl);
  const prData = await fetchPRData(owner, repo, prNumber, token);
  return extractMotivation(prData.body || "");
}

/**
 * Complete function to get branch name from a spectrum tokens PR
 * @param {string} prUrl - GitHub PR URL
 * @param {string} [token] - GitHub API token
 * @returns {Promise<string>} - Branch name
 */
export async function getSpectrumTokensBranch(prUrl, token) {
  const { owner, repo, prNumber } = parsePRUrl(prUrl);
  const prData = await fetchPRData(owner, repo, prNumber, token);
  return extractBranchName(prData);
}
