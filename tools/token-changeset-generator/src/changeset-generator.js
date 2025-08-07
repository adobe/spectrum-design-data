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

import { writeFileSync } from "fs";
import { join } from "path";
import { v4 as uuidv4 } from "uuid";

/**
 * Generates a changeset file name with timestamp and unique ID
 * @returns {string} - Changeset file name
 */
export function generateChangesetFileName() {
  const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const shortId = uuidv4().slice(0, 8);
  return `${timestamp}-${shortId}.md`;
}

/**
 * Creates changeset content with YAML front matter and markdown body
 * @param {string} bumpType - Semver bump type ('major', 'minor', 'patch')
 * @param {string} motivation - Design motivation from tokens studio
 * @param {string} tokenDiff - Token diff report from tdiff
 * @param {string} tokensStudioPR - Tokens studio PR URL
 * @param {string} spectrumTokensPR - Spectrum tokens PR URL
 * @returns {string} - Complete changeset file content
 */
export function createChangesetContent(
  bumpType,
  motivation,
  tokenDiff,
  tokensStudioPR,
  spectrumTokensPR,
) {
  const yamlFrontMatter = `---
"@adobe/spectrum-tokens": ${bumpType}
---`;

  const changesetBody = `## Token sync from Spectrum Tokens Studio

${motivation ? `### Design motivation\n\n${motivation}\n\n` : ""}### Token changes

${tokenDiff}

### References

- Tokens Studio PR: ${tokensStudioPR}
- Spectrum Tokens PR: ${spectrumTokensPR}`;

  return `${yamlFrontMatter}\n\n${changesetBody}`;
}

/**
 * Writes changeset file to the .changeset directory
 * @param {string} content - Changeset content
 * @param {string} [outputDir] - Output directory (defaults to .changeset)
 * @returns {string} - Path to created file
 */
export function writeChangesetFile(content, outputDir = ".changeset") {
  const fileName = generateChangesetFileName();
  const filePath = join(outputDir, fileName);

  writeFileSync(filePath, content, "utf8");

  return filePath;
}

/**
 * Complete function to generate and write a changeset file
 * @param {object} options - Options object
 * @param {string} options.bumpType - Semver bump type
 * @param {string} options.motivation - Design motivation
 * @param {string} options.tokenDiff - Token diff report
 * @param {string} options.tokensStudioPR - Tokens studio PR URL
 * @param {string} options.spectrumTokensPR - Spectrum tokens PR URL
 * @param {string} [options.outputDir] - Output directory
 * @returns {string} - Path to created changeset file
 */
export function generateChangeset(options) {
  const {
    bumpType,
    motivation,
    tokenDiff,
    tokensStudioPR,
    spectrumTokensPR,
    outputDir,
  } = options;

  const content = createChangesetContent(
    bumpType,
    motivation,
    tokenDiff,
    tokensStudioPR,
    spectrumTokensPR,
  );

  return writeChangesetFile(content, outputDir);
}
