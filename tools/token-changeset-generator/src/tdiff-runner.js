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

import { execFile } from "child_process";
import { promisify } from "util";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { readFileSync, unlinkSync, mkdtempSync, rmdirSync } from "fs";
import { tmpdir } from "os";

const execFileAsync = promisify(execFile);

/** tools/token-changeset-generator */
const PACKAGE_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
/** spectrum-design-data repo root */
const REPO_ROOT = join(PACKAGE_ROOT, "..", "..");
const TDIFF_CLI = join(
  REPO_ROOT,
  "tools",
  "diff-generator",
  "src",
  "lib",
  "cli.js",
);

/**
 * Runs tdiff command to generate token diff between branches.
 * Uses --output to a temp file because tdiff calls process.exit()
 * before stdout fully flushes, truncating large diffs at 8KB.
 * @param {string} oldBranch - Old branch (usually main)
 * @param {string} newBranch - New branch with changes
 * @param {string} [githubToken] - GitHub API token
 * @returns {Promise<string>} - Markdown diff output
 */
export async function generateTokenDiff(oldBranch, newBranch, githubToken) {
  const tmpDir = mkdtempSync(join(tmpdir(), "tdiff-"));
  const outFile = join(tmpDir, "report.md");

  const args = [
    "report",
    "--format",
    "markdown",
    "--otb",
    oldBranch,
    "--ntb",
    newBranch,
    "--repo",
    "adobe/spectrum-design-data",
    "--output",
    outFile,
  ];

  if (githubToken) {
    args.push("--githubAPIKey", githubToken);
  }

  try {
    await execFileAsync(process.execPath, [TDIFF_CLI, ...args], {
      cwd: REPO_ROOT,
      maxBuffer: 10 * 1024 * 1024,
    });

    const output = readFileSync(outFile, "utf8");
    return output;
  } catch (error) {
    throw new Error(`Failed to run tdiff: ${error.message}`);
  } finally {
    try {
      unlinkSync(outFile);
      rmdirSync(tmpDir);
    } catch {
      // ignore cleanup errors
    }
  }
}

/**
 * Determines semver bump type based on token changes
 * @param {string} diffOutput - Markdown diff output from tdiff
 * @returns {string} - 'major', 'minor', or 'patch'
 */
export function determineBumpType(diffOutput) {
  const hasNonZero = (label) => {
    const mdPattern = new RegExp(`\\*\\*${label} \\((?!0\\))\\d+\\)`);
    const htmlPattern = new RegExp(
      `<strong>${label} \\((?!0\\))\\d+\\)</strong>`,
    );
    return mdPattern.test(diffOutput) || htmlPattern.test(diffOutput);
  };

  if (hasNonZero("Deleted") || hasNonZero("Removed")) {
    return "major";
  }

  if (hasNonZero("Added") || hasNonZero("Newly Deprecated")) {
    return "minor";
  }

  if (hasNonZero("Updated") || hasNonZero("Revised") || hasNonZero("Changed")) {
    return "patch";
  }

  return "patch";
}
