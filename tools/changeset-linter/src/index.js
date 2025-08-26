/**
 * Copyright 2025 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */

import { readFileSync } from "fs";
import { join } from "path";

/**
 * Configuration for changeset linting rules
 */
const LINT_RULES = {
  // Maximum lines for changeset content (excluding frontmatter)
  maxLines: 20,

  // Maximum line length for any single line
  maxLineLength: 100,

  // Patterns that indicate auto-generated diff content (exempt from length limits)
  diffSectionPatterns: [
    /## Tokens Changed/i,
    /## Components Changed/i,
    /## Component Schema Diff Report/i,
    /Generated using `@adobe\/spectrum-component-diff-generator`/i,
    /\*\*Original Branch:\*\*/i,
    /\*\*New Branch:\*\*/i,
    /\*\*Added \(\d+\)\*\*/i,
    /\*\*Updated \(\d+\)\*\*/i,
    /\*\*Deleted \(\d+\)\*\*/i,
    /### Added Properties/i,
    /### Updated Properties/i,
    /### Deleted Properties/i,
  ],

  // Discouraged verbose patterns
  discouragedPatterns: [
    {
      pattern: /## 🚀|## 📊|## 🎯|## 🔧/g,
      message: "Avoid excessive emoji sections",
    },
    { pattern: /### ✅/g, message: "Avoid repetitive checkmark sections" },
    {
      pattern: /Business Impact|Technical Details/i,
      message:
        "Business/technical details belong in PR description, not changeset",
    },
    {
      pattern: /Performance Metrics|Memory usage/i,
      message: "Performance details should be in documentation, not changeset",
    },
  ],

  // Required patterns for proper changesets
  requiredPatterns: [
    { pattern: /^---\s*$/m, message: "Missing frontmatter delimiters" },
    {
      pattern: /"[^"]+"\s*:\s*(major|minor|patch)/m,
      message: "Missing package version changes",
    },
  ],
};

/**
 * Lint a changeset file for conciseness and proper format
 * @param {string} filePath - Path to the changeset file
 * @returns {Object} Linting results with errors and warnings
 */
export function lintChangeset(filePath) {
  const content = readFileSync(filePath, "utf8");
  const lines = content.split("\n");

  const results = {
    filePath,
    errors: [],
    warnings: [],
    isValid: true,
  };

  // Extract frontmatter and content
  const frontmatterEnd = findFrontmatterEnd(lines);
  const contentLines = lines.slice(frontmatterEnd + 1);
  const contentText = contentLines.join("\n");

  // Check if this is a diff-generated changeset (exempt from most rules)
  const isDiffGenerated = LINT_RULES.diffSectionPatterns.some((pattern) =>
    pattern.test(contentText),
  );

  // Check required patterns
  for (const rule of LINT_RULES.requiredPatterns) {
    if (!rule.pattern.test(content)) {
      results.errors.push(`Missing required pattern: ${rule.message}`);
    }
  }

  // Skip length checks for diff-generated content
  if (!isDiffGenerated) {
    // Check total line count
    if (contentLines.length > LINT_RULES.maxLines) {
      results.warnings.push(
        `Changeset is too long (${contentLines.length} lines). Consider keeping it under ${LINT_RULES.maxLines} lines. Move detailed explanations to PR description.`,
      );
    }

    // Check individual line lengths
    contentLines.forEach((line, index) => {
      if (line.length > LINT_RULES.maxLineLength) {
        results.warnings.push(
          `Line ${frontmatterEnd + index + 2} is too long (${line.length} chars). Keep lines under ${LINT_RULES.maxLineLength} characters.`,
        );
      }
    });

    // Check for discouraged patterns
    for (const rule of LINT_RULES.discouragedPatterns) {
      const matches = contentText.match(rule.pattern);
      if (matches) {
        results.warnings.push(
          `${rule.message} (found ${matches.length} occurrence${matches.length > 1 ? "s" : ""})`,
        );
      }
    }
  }

  // Set overall validity
  results.isValid = results.errors.length === 0;

  return results;
}

/**
 * Find the end of frontmatter section
 * @param {string[]} lines - Array of file lines
 * @returns {number} Index of frontmatter end
 */
function findFrontmatterEnd(lines) {
  let frontmatterDelimiters = 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === "---") {
      frontmatterDelimiters++;
      if (frontmatterDelimiters === 2) {
        return i;
      }
    }
  }
  return 0; // No frontmatter found
}

/**
 * Lint all changeset files in a directory
 * @param {string} changesetDir - Path to .changeset directory
 * @returns {Promise<Object[]>} Array of linting results
 */
export async function lintAllChangesets(changesetDir = ".changeset") {
  const { globSync } = await import("glob");
  const pattern = join(changesetDir, "*.md");
  const files = globSync(pattern);

  // Filter out special changeset files
  const changesetFiles = files.filter((file) => {
    const basename = file.split("/").pop();
    return basename !== "README.md" && basename !== "config.json";
  });

  return changesetFiles.map(lintChangeset);
}

export { LINT_RULES };
