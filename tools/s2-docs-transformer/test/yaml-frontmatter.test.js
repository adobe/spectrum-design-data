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

import test from "ava";
import { readFileSync, readdirSync, statSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import yaml from "js-yaml";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DOCS_ROOT = join(__dirname, "..", "..", "..", "docs", "s2-docs");

/**
 * Get all markdown files in docs/s2-docs recursively
 */
function getAllMarkdownFiles(dir) {
  const files = [];
  const entries = readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...getAllMarkdownFiles(fullPath));
    } else if (entry.name.endsWith(".md")) {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * Extract frontmatter from markdown content
 */
function extractFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) {
    return null;
  }
  return match[1];
}

/**
 * Validate YAML frontmatter for common issues
 */
function validateYamlFrontmatter(frontmatter, filePath) {
  const errors = [];

  // First, try to parse the YAML to catch syntax errors
  try {
    yaml.load(frontmatter);
  } catch (error) {
    errors.push({
      type: "yaml-syntax-error",
      message: `YAML parsing failed: ${error.message}`,
      error: error.message,
    });
    // If YAML parsing fails, return early since other checks won't be meaningful
    return errors;
  }

  // Check for asterisk list items (YAML interprets * as alias references)
  if (/^\*/m.test(frontmatter)) {
    errors.push({
      type: "invalid-list-syntax",
      message: "Found asterisk (*) list items. YAML lists should use dash (-)",
      lines: frontmatter
        .split("\n")
        .map((line, idx) => ({ line, num: idx + 1 }))
        .filter(({ line }) => /^\*/.test(line))
        .map(({ num }) => num),
    });
  }

  // Check for escaped underscores in field names
  if (/^\w+\\_\w+:/m.test(frontmatter)) {
    errors.push({
      type: "escaped-underscores",
      message: "Found escaped underscores (\\_) in field names",
      lines: frontmatter
        .split("\n")
        .map((line, idx) => ({ line, num: idx + 1 }))
        .filter(({ line }) => /^\w+\\_\w+:/.test(line))
        .map(({ num }) => num),
    });
  }

  // Check for URLs wrapped in angle brackets
  if (/<https?:\/\/[^>]+>/m.test(frontmatter)) {
    errors.push({
      type: "angle-bracket-urls",
      message: "Found URLs wrapped in angle brackets (<>)",
      lines: frontmatter
        .split("\n")
        .map((line, idx) => ({ line, num: idx + 1 }))
        .filter(({ line }) => /<https?:\/\/[^>]+>/.test(line))
        .map(({ num }) => num),
    });
  }

  // Check for excessive blank lines in frontmatter
  if (/\n\n\n+/.test(frontmatter)) {
    errors.push({
      type: "excessive-blank-lines",
      message: "Found excessive blank lines in frontmatter",
    });
  }

  // Check for blank line immediately after opening ---
  if (/^---\n\n/.test(frontmatter)) {
    errors.push({
      type: "blank-line-after-opening",
      message: "Found blank line immediately after opening ---",
    });
  }

  return errors;
}

/**
 * Test to ensure valid YAML parsing
 */
test("all s2-docs markdown files have valid YAML frontmatter", (t) => {
  const files = getAllMarkdownFiles(DOCS_ROOT);
  const fileErrors = [];

  for (const filePath of files) {
    // Skip README.md and INDEX.md files
    if (filePath.endsWith("README.md") || filePath.endsWith("INDEX.md")) {
      continue;
    }

    const content = readFileSync(filePath, "utf-8");
    const frontmatter = extractFrontmatter(content);

    if (!frontmatter) {
      fileErrors.push({
        file: filePath,
        errors: [
          {
            type: "missing-frontmatter",
            message: "No YAML frontmatter found",
          },
        ],
      });
      continue;
    }

    const errors = validateYamlFrontmatter(frontmatter, filePath);
    if (errors.length > 0) {
      fileErrors.push({
        file: filePath,
        errors,
      });
    }
  }

  if (fileErrors.length > 0) {
    console.error("\nYAML Frontmatter Validation Errors:\n");
    for (const { file, errors } of fileErrors) {
      console.error(`\n${file}:`);
      for (const error of errors) {
        console.error(`  - ${error.type}: ${error.message}`);
        if (error.lines) {
          console.error(`    Lines: ${error.lines.join(", ")}`);
        }
      }
    }
    console.error(
      `\nTotal files with errors: ${fileErrors.length}/${files.length}`,
    );
    console.error(
      "\nRun 'pnpm --filter @adobe/s2-docs-transformer run fix-yaml' to fix these issues automatically.",
    );
  }

  t.is(
    fileErrors.length,
    0,
    `Found ${fileErrors.length} files with YAML frontmatter errors`,
  );
});

/**
 * Test specific frontmatter structure requirements
 */
test("s2-docs frontmatter has required fields", (t) => {
  const files = getAllMarkdownFiles(DOCS_ROOT);
  const fileErrors = [];

  for (const filePath of files) {
    // Skip README.md and INDEX.md files
    if (filePath.endsWith("README.md") || filePath.endsWith("INDEX.md")) {
      continue;
    }

    const content = readFileSync(filePath, "utf-8");
    const frontmatter = extractFrontmatter(content);

    if (!frontmatter) {
      continue;
    }

    const requiredFields = ["title", "source_url", "category", "status"];
    const missingFields = [];

    for (const field of requiredFields) {
      const regex = new RegExp(`^${field}:`, "m");
      if (!regex.test(frontmatter)) {
        missingFields.push(field);
      }
    }

    if (missingFields.length > 0) {
      fileErrors.push({
        file: filePath,
        missingFields,
      });
    }
  }

  if (fileErrors.length > 0) {
    console.error("\nMissing Required Fields:\n");
    for (const { file, missingFields } of fileErrors) {
      console.error(`\n${file}:`);
      console.error(`  Missing: ${missingFields.join(", ")}`);
    }
  }

  t.is(
    fileErrors.length,
    0,
    `Found ${fileErrors.length} files with missing required fields`,
  );
});
