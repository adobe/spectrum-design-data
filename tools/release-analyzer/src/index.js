#!/usr/bin/env node

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

import { execSync } from "child_process";
import { readFileSync } from "fs";
import { join } from "path";

// Node.js 18+ has native fetch, but let's be explicit
const fetch = globalThis.fetch;

/**
 * Parse a tag string to extract release information
 * @param {string} tagLine - Line containing tag name and date
 * @returns {Object|null} Release object or null if invalid
 */
function parseTag(tagLine) {
  const parts = tagLine.trim().split(" ");
  if (parts.length < 2) return null;

  const tag = parts[0];
  const date = parts[1];

  // Legacy format: v12.2.0
  const legacyMatch = tag.match(/^v(\d+)\.(\d+)\.(\d+)(?:-(.+))?$/);
  if (legacyMatch) {
    return {
      tag,
      version: `${legacyMatch[1]}.${legacyMatch[2]}.${legacyMatch[3]}`,
      major: parseInt(legacyMatch[1]),
      minor: parseInt(legacyMatch[2]),
      patch: parseInt(legacyMatch[3]),
      prerelease: legacyMatch[4] || null,
      date,
      type: "legacy",
      format: "v{version}",
      packageName: null,
    };
  }

  // Snapshot format: @adobe/spectrum-tokens@0.0.0-feature-timestamp
  // Check this BEFORE the general monorepo pattern since 0.0.0 would match both
  const snapshotMatch = tag.match(
    /^@adobe\/spectrum-tokens@0\.0\.0-(.+)-(\d{14})$/,
  );
  if (snapshotMatch) {
    const feature = snapshotMatch[1];
    const timestamp = snapshotMatch[2];

    // Parse timestamp: YYYYMMDDHHMMSS
    const year = timestamp.slice(0, 4);
    const month = timestamp.slice(4, 6);
    const day = timestamp.slice(6, 8);
    const timestampDate = `${year}-${month}-${day}`;

    return {
      tag,
      version: "0.0.0",
      major: 0,
      minor: 0,
      patch: 0,
      prerelease: null,
      date,
      timestampDate,
      timestamp,
      feature,
      type: "snapshot",
      format: "@adobe/spectrum-tokens@0.0.0-{feature}-{timestamp}",
      packageName: "@adobe/spectrum-tokens",
    };
  }

  // Monorepo format: @adobe/spectrum-tokens@13.13.0
  const monorepoMatch = tag.match(
    /^@adobe\/spectrum-tokens@(\d+)\.(\d+)\.(\d+)(?:-(.+))?$/,
  );
  if (monorepoMatch) {
    const prerelease = monorepoMatch[4];
    const isBeta = prerelease && prerelease.startsWith("beta.");

    return {
      tag,
      version: `${monorepoMatch[1]}.${monorepoMatch[2]}.${monorepoMatch[3]}`,
      major: parseInt(monorepoMatch[1]),
      minor: parseInt(monorepoMatch[2]),
      patch: parseInt(monorepoMatch[3]),
      prerelease,
      date,
      type: isBeta ? "beta" : "stable",
      format: "@adobe/spectrum-tokens@{version}",
      packageName: "@adobe/spectrum-tokens",
    };
  }

  return null;
}

/**
 * Get all git tags with creation dates
 * @param {string} repoPath - Path to git repository
 * @returns {Array} Array of tag lines
 */
function getGitTags(repoPath = ".") {
  try {
    const output = execSync(
      'git tag --format="%(refname:short) %(creatordate:short)"',
      { cwd: repoPath, encoding: "utf8" },
    );
    return output
      .trim()
      .split("\n")
      .filter((line) => line.trim());
  } catch (error) {
    throw new Error(`Failed to get git tags: ${error.message}`);
  }
}

/**
 * Fetch GitHub release notes for a tag
 * @param {string} tag - Git tag name
 * @param {string} githubToken - Optional GitHub Personal Access Token
 * @returns {Object|null} Release data from GitHub API
 */
async function fetchGitHubRelease(tag, githubToken) {
  try {
    const encodedTag = encodeURIComponent(tag);
    const headers = {
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "spectrum-tokens-release-analyzer",
    };

    if (githubToken) {
      headers.Authorization = `token ${githubToken}`;
    }

    const response = await fetch(
      `https://api.github.com/repos/adobe/spectrum-tokens/releases/tags/${encodedTag}`,
      {
        headers,
      },
    );

    if (response.ok) {
      return await response.json();
    } else if (response.status === 403) {
      console.warn(
        `GitHub API rate limit hit for ${tag}. Consider using --github-token option.`,
      );
    }
  } catch (error) {
    // Silently fail for API errors
  }
  return null;
}

/**
 * Parse change scope from release notes
 * @param {string} body - Release body text
 * @returns {Object} Change metrics
 */
function parseChangeScope(body) {
  if (!body) return { total: 0, added: 0, updated: 0, deleted: 0, score: 1 };

  const metrics = {
    total: 0,
    added: 0,
    updated: 0,
    deleted: 0,
    score: 1, // Default size
  };

  // Look for token change patterns in GitHub release format
  const addedMatch = body.match(/<strong>Added \((\d+)\)<\/strong>/);
  const updatedMatch = body.match(/### Updated \((\d+)\)/);
  const deletedMatch = body.match(/<strong>Deleted \((\d+)\)<\/strong>/);
  const changedMatch = body.match(/## Tokens Changed \((\d+)\)/);

  if (addedMatch) metrics.added = parseInt(addedMatch[1]);
  if (updatedMatch) metrics.updated = parseInt(updatedMatch[1]);
  if (deletedMatch) metrics.deleted = parseInt(deletedMatch[1]);
  if (changedMatch) metrics.total = parseInt(changedMatch[1]);

  // If no specific total, sum the parts
  if (metrics.total === 0) {
    metrics.total = metrics.added + metrics.updated + metrics.deleted;
  }

  // Calculate scope score (1-5 scale for dot sizing)
  if (metrics.total === 0) {
    metrics.score = 1;
  } else if (metrics.total <= 5) {
    metrics.score = 2;
  } else if (metrics.total <= 15) {
    metrics.score = 3;
  } else if (metrics.total <= 30) {
    metrics.score = 4;
  } else {
    metrics.score = 5;
  }

  return metrics;
}

/**
 * Parse changelog for token change information
 * @param {string} repoPath - Path to git repository
 * @returns {Object} Map of version to change data
 */
function parseChangelog(repoPath) {
  const changelogPath = join(repoPath, "packages/tokens/CHANGELOG.md");
  const changelogData = {};

  try {
    const content = readFileSync(changelogPath, "utf8");
    const lines = content.split("\n");
    let currentVersion = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Match version headers like "## 13.13.0"
      const versionMatch = line.match(/^## (\d+\.\d+\.\d+(?:-.*)?)/);
      if (versionMatch) {
        currentVersion = versionMatch[1];
        changelogData[currentVersion] = {
          total: 0,
          added: 0,
          updated: 0,
          deleted: 0,
        };
        continue;
      }

      if (currentVersion) {
        // Match "## Tokens Changed (4)" pattern
        const tokensChangedMatch = line.match(/## Tokens Changed \((\d+)\)/);
        if (tokensChangedMatch) {
          changelogData[currentVersion].total = parseInt(tokensChangedMatch[1]);
        }

        // Match various change patterns
        const addedMatch =
          line.match(
            /<summary>(?:<strong>)?Added \((\d+)\)(?:<\/strong>)?<\/summary>/,
          ) ||
          line.match(/^Added \((\d+)\)/) ||
          line.match(/<summary>Added \((\d+)\)<\/summary>/);
        const updatedMatch =
          line.match(
            /<summary>(?:<strong>)?Updated \((\d+)\)(?:<\/strong>)?<\/summary>/,
          ) ||
          line.match(/^Updated \((\d+)\)/) ||
          line.match(/<summary>Updated \((\d+)\)<\/summary>/);
        const deletedMatch =
          line.match(
            /<summary>(?:<strong>)?Deleted \((\d+)\)(?:<\/strong>)?<\/summary>/,
          ) ||
          line.match(/^Deleted \((\d+)\)/) ||
          line.match(/<summary>Deleted \((\d+)\)<\/summary>/);

        if (addedMatch)
          changelogData[currentVersion].added = parseInt(addedMatch[1]);
        if (updatedMatch)
          changelogData[currentVersion].updated = parseInt(updatedMatch[1]);
        if (deletedMatch)
          changelogData[currentVersion].deleted = parseInt(deletedMatch[1]);
      }
    }

    // Calculate totals and scores
    Object.keys(changelogData).forEach((version) => {
      const data = changelogData[version];
      if (data.total === 0) {
        data.total = data.added + data.updated + data.deleted;
      }

      // Calculate scope score (1-5 scale)
      if (data.total === 0) {
        data.score = 1;
      } else if (data.total <= 5) {
        data.score = 2;
      } else if (data.total <= 15) {
        data.score = 3;
      } else if (data.total <= 30) {
        data.score = 4;
      } else {
        data.score = 5;
      }
    });
  } catch (error) {
    console.warn("Could not read changelog file:", error.message);
  }

  return changelogData;
}

/**
 * Analyze all releases in the repository
 * @param {string} repoPath - Path to git repository
 * @param {boolean} includeScope - Whether to fetch GitHub release data for scope analysis
 * @param {string} githubToken - Optional GitHub Personal Access Token
 * @returns {Object} Analysis results
 */
export async function analyzeReleases(
  repoPath = ".",
  includeScope = false,
  githubToken = null,
) {
  const tagLines = getGitTags(repoPath);
  const releases = [];
  const parseErrors = [];

  // Parse changelog for scope data
  const changelogData = includeScope ? parseChangelog(repoPath) : {};

  for (const tagLine of tagLines) {
    const release = parseTag(tagLine);
    if (release) {
      // Add scope data from changelog if available
      if (
        includeScope &&
        (release.type === "stable" || release.type === "beta")
      ) {
        // Try changelog first
        if (changelogData[release.version]) {
          release.changeScope = changelogData[release.version];
        } else {
          // Fallback to GitHub API
          const githubRelease = await fetchGitHubRelease(
            release.tag,
            githubToken,
          );
          if (githubRelease) {
            const changeScope = parseChangeScope(githubRelease.body);
            release.changeScope = changeScope;
            release.releaseNotes = githubRelease.body;
          }
        }
      }
      releases.push(release);
    } else {
      parseErrors.push(tagLine);
    }
  }

  // Filter to only spectrum-tokens related releases
  const spectrumReleases = releases.filter(
    (release) =>
      release.type === "legacy" ||
      release.packageName === "@adobe/spectrum-tokens",
  );

  // Group by type
  const byType = {
    legacy: spectrumReleases.filter((r) => r.type === "legacy"),
    stable: spectrumReleases.filter((r) => r.type === "stable"),
    beta: spectrumReleases.filter((r) => r.type === "beta"),
    snapshot: spectrumReleases.filter((r) => r.type === "snapshot"),
  };

  // Sort each group by date
  Object.keys(byType).forEach((type) => {
    byType[type].sort((a, b) => new Date(a.date) - new Date(b.date));
  });

  // Get snapshot feature breakdown
  const snapshotFeatures = {};
  byType.snapshot.forEach((release) => {
    const feature = release.feature;
    if (!snapshotFeatures[feature]) {
      snapshotFeatures[feature] = [];
    }
    snapshotFeatures[feature].push(release);
  });

  // Calculate statistics
  const stats = {
    total: spectrumReleases.length,
    byType: {
      legacy: byType.legacy.length,
      stable: byType.stable.length,
      beta: byType.beta.length,
      snapshot: byType.snapshot.length,
    },
    snapshotFeatures: Object.keys(snapshotFeatures).length,
    dateRange: {
      earliest:
        spectrumReleases.length > 0
          ? spectrumReleases.reduce(
              (min, r) => (r.date < min ? r.date : min),
              spectrumReleases[0].date,
            )
          : null,
      latest:
        spectrumReleases.length > 0
          ? spectrumReleases.reduce(
              (max, r) => (r.date > max ? r.date : max),
              spectrumReleases[0].date,
            )
          : null,
    },
  };

  // Timeline data for visualization
  const timeline = spectrumReleases
    .map((release) => ({
      date: release.date,
      type: release.type,
      version: release.version,
      tag: release.tag,
      feature: release.feature || null,
      major: release.major,
      minor: release.minor,
      patch: release.patch,
      prerelease: release.prerelease,
      changeScope: release.changeScope || null,
    }))
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  return {
    releases: spectrumReleases,
    byType,
    snapshotFeatures,
    stats,
    timeline,
    parseErrors: parseErrors.length > 0 ? parseErrors : undefined,
  };
}

export default analyzeReleases;
