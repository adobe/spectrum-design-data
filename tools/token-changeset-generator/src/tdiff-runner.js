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

import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

/**
 * Runs tdiff command to generate token diff between branches
 * @param {string} oldBranch - Old branch (usually main)
 * @param {string} newBranch - New branch with changes
 * @param {string} [githubToken] - GitHub API token
 * @returns {Promise<string>} - Markdown diff output
 */
export async function generateTokenDiff(oldBranch, newBranch, githubToken) {
  const command = [
    "tdiff",
    "report",
    "--format",
    "markdown",
    "--otb",
    oldBranch,
    "--ntb",
    newBranch,
  ];

  if (githubToken) {
    command.push("--githubAPIKey", githubToken);
  }

  try {
    const { stdout, stderr } = await execAsync(command.join(" "));

    if (stderr) {
      console.warn("tdiff warnings:", stderr);
    }

    return stdout;
  } catch (error) {
    throw new Error(`Failed to run tdiff: ${error.message}`);
  }
}

/**
 * Determines semver bump type based on token changes
 * @param {string} diffOutput - Markdown diff output from tdiff
 * @returns {string} - 'major', 'minor', or 'patch'
 */
export function determineBumpType(diffOutput) {
  // Check for breaking changes (deleted tokens, major value changes)
  if (
    diffOutput.includes("**Deleted (") &&
    !diffOutput.includes("**Deleted (0)")
  ) {
    return "major";
  }

  // Check for new tokens (additive changes)
  if (diffOutput.includes("**Added (") && !diffOutput.includes("**Added (0)")) {
    return "minor";
  }

  // Check for updated tokens (non-breaking changes)
  if (
    diffOutput.includes("**Updated (") &&
    !diffOutput.includes("**Updated (0)")
  ) {
    return "patch";
  }

  // Default to patch for any changes
  return "patch";
}
