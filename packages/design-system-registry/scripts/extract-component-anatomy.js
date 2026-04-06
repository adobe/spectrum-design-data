/*
Copyright 2026 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

/**
 * Extract component anatomy data from S2 documentation markdown files
 * and write a structured component-anatomy.json registry.
 *
 * Usage: node packages/design-system-registry/scripts/extract-component-anatomy.js
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, basename, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const REPO_ROOT = join(__dirname, "../../..");
const S2_DOCS_DIR = join(REPO_ROOT, "docs/s2-docs/components");
const OUTPUT_PATH = join(__dirname, "../registry/component-anatomy.json");

/**
 * Convert a display name to a kebab-case ID.
 * "Action Button" → "action-button"
 * "hold icon" → "hold-icon"
 */
export function toKebabCase(name) {
  return name
    .replace(/([a-z])([A-Z])/g, "$1-$2") // camelCase → kebab
    .toLowerCase()
    .replace(/\s+/g, "-");
}

/**
 * Convert a kebab-case ID to a title-case label.
 * "hold-icon" → "Hold Icon"
 */
function toTitleCase(kebab) {
  return kebab
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/**
 * Split a text by ", ", " or ", and " and " separators,
 * but only when they appear outside parentheses.
 * e.g. "icon (optional) and text (description or error message)"
 *   → ["icon (optional)", "text (description or error message)"]
 * e.g. "required asterisk, required text, or optional text"
 *   → ["required asterisk", "required text", "optional text"]
 */
export function splitOutsideParens(text) {
  // Replace content inside parens with placeholders to avoid splitting inside them
  const placeholders = [];
  const masked = text.replace(/\([^)]*\)/g, (match) => {
    placeholders.push(match);
    return `\x00${placeholders.length - 1}\x00`;
  });

  // Split on ", or " / ", " / " or " / " and " / " / " (try longest matches first)
  const segments = masked.split(/,\s+or\s+|,\s+|\s+or\s+|\s+and\s+|\s+\/\s+/);

  // Restore placeholders
  return segments
    .map((s) =>
      s.replace(/\x00(\d+)\x00/g, (_, idx) => placeholders[Number(idx)]).trim(),
    )
    .filter((s) => s.length > 0);
}

/**
 * Parse a single part line like "cover image (optional)" or "preview (asset)".
 * Returns { name, annotation } where annotation may be null.
 */
export function parsePartLine(line) {
  const trimmed = line.replace(/^\s*-\s*/, "").trim();
  if (!trimmed) return null;

  const match = trimmed.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
  if (match) {
    return { name: match[1].trim(), annotation: match[2].trim() };
  }
  return { name: trimmed, annotation: null };
}

/**
 * Parse the anatomy code block content into structured data.
 *
 * @param {string} blockContent - The text inside the fenced code block
 * @returns {{ componentName: string, parts: Array<{ id: string, label: string, optional: boolean }> }}
 */
export function parseAnatomyBlock(blockContent) {
  const lines = blockContent.split("\n").filter((l) => l.trim().length > 0);
  if (lines.length === 0) return null;

  // First line is the component name (strip any annotation)
  const rootParsed = parsePartLine("- " + lines[0]);
  const componentName = rootParsed ? rootParsed.name : lines[0].trim();

  const partsMap = new Map();

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    // Skip lines that don't start with - (after stripping whitespace)
    if (!line.trim().startsWith("-")) continue;

    // Handle compound/alternative lines:
    // " and " = co-existing parts: "icon (optional) and text (description)"
    // ", " or " or " = alternatives: "required asterisk, required text, or optional text"
    // Split on these separators only when they appear outside parentheses.
    const rawText = line.replace(/^\s*-\s*/, "");
    const compoundParts = splitOutsideParens(rawText).map(
      (p) => "- " + p.trim(),
    );

    for (const part of compoundParts) {
      const parsed = parsePartLine(part);
      if (!parsed) continue;

      const id = toKebabCase(parsed.name);
      const optional =
        parsed.annotation !== null &&
        parsed.annotation.toLowerCase().includes("optional");

      // Deduplicate by ID (keep the first occurrence, but mark optional
      // only if ALL occurrences are optional)
      if (!partsMap.has(id)) {
        partsMap.set(id, {
          id,
          label: toTitleCase(id),
          optional,
        });
      }
    }
  }

  return {
    componentName,
    parts: [...partsMap.values()],
  };
}

/**
 * Extract the anatomy code block from a markdown file's content.
 * Returns the block content or null if not found.
 */
export function extractAnatomyBlock(markdown) {
  // Match ## Anatomy followed by a fenced code block
  const match = markdown.match(/## Anatomy\s*\n+```[^\n]*\n([\s\S]*?)```/);
  return match ? match[1] : null;
}

/**
 * Recursively find all .md files in a directory.
 */
function findMarkdownFiles(dir) {
  const results = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findMarkdownFiles(fullPath));
    } else if (entry.name.endsWith(".md")) {
      results.push(fullPath);
    }
  }
  return results;
}

function main() {
  const files = findMarkdownFiles(S2_DOCS_DIR).sort();
  const components = {};
  const skipped = [];

  for (const filePath of files) {
    const markdown = readFileSync(filePath, "utf-8");
    const block = extractAnatomyBlock(markdown);
    const componentId = basename(filePath, ".md");
    const relPath = relative(REPO_ROOT, filePath);

    if (!block) {
      skipped.push(componentId);
      continue;
    }

    const parsed = parseAnatomyBlock(block);
    if (!parsed || parsed.parts.length === 0) {
      skipped.push(componentId);
      continue;
    }

    components[componentId] = {
      label: parsed.componentName,
      source: relPath,
      parts: parsed.parts,
    };
  }

  // Sort by component ID
  const sorted = {};
  for (const key of Object.keys(components).sort()) {
    sorted[key] = components[key];
  }

  const output = {
    type: "component-anatomy",
    description:
      "Mapping of Spectrum components to their visible anatomy parts, extracted from S2 documentation.",
    components: sorted,
  };

  writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2) + "\n", "utf-8");

  const componentCount = Object.keys(sorted).length;
  const partCount = Object.values(sorted).reduce(
    (sum, c) => sum + c.parts.length,
    0,
  );
  console.log(
    `Generated component-anatomy.json: ${componentCount} components, ${partCount} total parts`,
  );
  if (skipped.length > 0) {
    console.log(`Skipped (no anatomy section): ${skipped.join(", ")}`);
  }
}

main();
