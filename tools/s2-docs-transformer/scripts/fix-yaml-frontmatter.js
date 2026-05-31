#!/usr/bin/env node
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

/**
 * Fix YAML frontmatter issues in S2 documentation markdown files:
 * 1. Replace asterisk (*) list items with dash (-) syntax
 * 2. Remove escaped underscores (\\_) from field names
 * 3. Remove angle brackets from URLs
 * 4. Clean up excessive blank lines
 * 5. Fix improperly indented field names in list contexts
 */

import { readFileSync, writeFileSync, readdirSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
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
 * Fix YAML frontmatter issues
 */
function fixFrontmatter(content) {
  // Extract frontmatter
  const frontmatterMatch = content.match(
    /^(---\r?\n)([\s\S]*?)(\r?\n---\r?\n)/,
  );

  if (!frontmatterMatch) {
    return { content, changed: false };
  }

  const [fullMatch, openDelim, frontmatter, closeDelim] = frontmatterMatch;
  const body = content.slice(fullMatch.length);

  let fixed = frontmatter;
  let changed = false;

  // Fix 1: Remove blank line immediately after opening ---
  if (fixed.startsWith("\n")) {
    fixed = fixed.replace(/^\n+/, "");
    changed = true;
  }

  // Fix 2: Replace escaped underscores in field names
  // Match patterns like "source\_url:" or "last\_updated:" or "related\_components:"
  const escapedUnderscoreRegex = /^([\w\\]+)\\_/gm;
  if (escapedUnderscoreRegex.test(fixed)) {
    fixed = fixed.replace(escapedUnderscoreRegex, (match, prefix) => {
      // Remove all backslashes from the prefix and replace \_ with _
      return prefix.replace(/\\/g, "") + "_";
    });
    changed = true;
  }

  // Fix 3: Remove angle brackets from URLs
  // Match patterns like "<https://...>"
  const angleBracketUrlRegex = /<(https?:\/\/[^>]+)>/g;
  if (angleBracketUrlRegex.test(fixed)) {
    fixed = fixed.replace(angleBracketUrlRegex, "$1");
    changed = true;
  }

  // Fix 4: Convert asterisk list items to dash syntax
  // This needs to be careful to preserve indentation
  const lines = fixed.split("\n");
  const fixedLines = lines.map((line) => {
    // Match lines that start with * (asterisk list items)
    // Preserve any leading whitespace
    const asteriskMatch = line.match(/^(\s*)\*(\s+.+)$/);
    if (asteriskMatch) {
      changed = true;
      return `${asteriskMatch[1]}-${asteriskMatch[2]}`;
    }
    return line;
  });
  fixed = fixedLines.join("\n");

  // Fix 5: Clean up excessive blank lines (more than one consecutive blank line)
  if (/\n\n\n+/.test(fixed)) {
    fixed = fixed.replace(/\n\n\n+/g, "\n\n");
    changed = true;
  }

  // Fix 6: Remove blank line before closing ---
  if (fixed.endsWith("\n\n")) {
    fixed = fixed.replace(/\n\n$/, "\n");
    changed = true;
  }

  // Fix 7: Fix improperly indented field names (fields that look like they're part of a list)
  // This catches patterns like:
  //   - item
  //     field_name:
  // And converts them to:
  //   - item
  //   field_name:
  const linesArray = fixed.split("\n");
  const fixedLinesArray = [];

  for (let i = 0; i < linesArray.length; i++) {
    const line = linesArray[i];

    // Check if this line is an improperly indented field (starts with spaces and has a colon)
    // Need to handle escaped underscores like related\_components
    const fieldMatch = line.match(/^(\s+)([\w\\]+):/);

    if (fieldMatch && i > 0) {
      const [, fieldIndent, fieldName] = fieldMatch;

      // Look back to find the last list item or field definition
      let lastIndent = 0;
      for (let j = i - 1; j >= 0; j--) {
        const prevLine = linesArray[j];
        const listMatch = prevLine.match(/^(\s*)-\s+/);
        const prevFieldMatch = prevLine.match(/^(\s*)([\w\\]+):/);

        if (listMatch) {
          lastIndent = listMatch[1].length;
          break;
        } else if (prevFieldMatch) {
          lastIndent = prevFieldMatch[1].length;
          break;
        }
      }

      // If this field is indented more than it should be (more than the list item indent)
      if (fieldIndent.length > lastIndent) {
        changed = true;
        // Fix the indentation
        const restOfLine = line.slice(fieldMatch[0].length);
        const fixedLine = " ".repeat(lastIndent) + fieldName + ":" + restOfLine;
        fixedLinesArray.push(fixedLine);
        continue;
      }
    }

    fixedLinesArray.push(line);
  }

  fixed = fixedLinesArray.join("\n");

  if (!changed) {
    return { content, changed: false };
  }

  // Reconstruct the file
  const newContent = openDelim + fixed + closeDelim + body;
  return { content: newContent, changed: true };
}

/**
 * Main function
 */
function main() {
  const files = getAllMarkdownFiles(DOCS_ROOT);
  console.log(`Checking ${files.length} markdown files...`);

  let fixedCount = 0;
  let errorCount = 0;
  const fixedFiles = [];

  for (const filePath of files) {
    // Skip README.md and INDEX.md files
    if (filePath.endsWith("README.md") || filePath.endsWith("INDEX.md")) {
      continue;
    }

    try {
      const content = readFileSync(filePath, "utf-8");
      const { content: newContent, changed } = fixFrontmatter(content);

      if (changed) {
        writeFileSync(filePath, newContent, "utf-8");
        fixedFiles.push(filePath);
        fixedCount++;
      }
    } catch (error) {
      console.error(`Error processing ${filePath}:`, error.message);
      errorCount++;
    }
  }

  console.log("\nResults:");
  console.log(`  Fixed: ${fixedCount} files`);
  console.log(`  Errors: ${errorCount} files`);
  console.log(`  Total processed: ${files.length} files`);

  if (fixedFiles.length > 0) {
    console.log("\nFixed files:");
    for (const file of fixedFiles) {
      console.log(`  - ${file}`);
    }
  }

  process.exit(errorCount > 0 ? 1 : 0);
}

main();
