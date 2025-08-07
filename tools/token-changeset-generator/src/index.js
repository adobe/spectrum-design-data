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

import {
  getTokensStudioMotivation,
  getSpectrumTokensBranch,
} from "./pr-parser.js";
import { generateTokenDiff, determineBumpType } from "./tdiff-runner.js";
import { generateChangeset } from "./changeset-generator.js";

/**
 * Main function to generate a changeset from PR URLs
 * @param {object} options - Options object
 * @param {string} options.tokensStudioPR - Tokens studio PR URL
 * @param {string} options.spectrumTokensPR - Spectrum tokens PR URL
 * @param {string} [options.outputDir] - Output directory for changeset
 * @param {string} [options.githubToken] - GitHub API token
 * @returns {Promise<string>} - Path to generated changeset file
 */
export async function generateTokenChangeset(options) {
  const { tokensStudioPR, spectrumTokensPR, outputDir, githubToken } = options;

  console.log("🔍 Fetching tokens studio motivation...");
  const motivation = await getTokensStudioMotivation(
    tokensStudioPR,
    githubToken,
  );

  console.log("🌿 Getting spectrum tokens branch...");
  const branchName = await getSpectrumTokensBranch(
    spectrumTokensPR,
    githubToken,
  );

  console.log("📊 Generating token diff...");
  const tokenDiff = await generateTokenDiff("main", branchName, githubToken);

  console.log("🎯 Determining semver bump type...");
  const bumpType = determineBumpType(tokenDiff);

  console.log("📝 Creating changeset...");
  const changesetPath = generateChangeset({
    bumpType,
    motivation,
    tokenDiff,
    tokensStudioPR,
    spectrumTokensPR,
    outputDir,
  });

  console.log(`✅ Changeset created: ${changesetPath}`);
  console.log(`   Bump type: ${bumpType}`);

  return changesetPath;
}

export * from "./pr-parser.js";
export * from "./tdiff-runner.js";
export * from "./changeset-generator.js";
