// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

/**
 * Shared guideline-document loader, used by both @adobe/design-data-mcp's
 * `design-data-guideline` tool and @adobe/design-data-agent-mcp's
 * `describe_guideline` tool, so the read-back logic (and its path-traversal
 * guard) lives in exactly one place instead of being duplicated per server.
 */

import { readFileSync, existsSync, readdirSync } from "node:fs";
import { resolve, sep } from "node:path";

/**
 * Load a single guideline document (`<guidelinesDir>/<id>.json`) by slug id.
 *
 * Path safety: the resolved absolute path is asserted to stay within
 * `guidelinesDir` so a crafted `id` (e.g. `../../etc/passwd`) cannot read
 * files outside the intended data directory.
 *
 * @param {string} guidelinesDir - absolute path to the guidelines directory,
 *   e.g. `<spectrum-design-data package root>/guidelines`.
 * @param {string} id - kebab-case slug, e.g. "colors" or "motion".
 * @returns {object} the parsed guideline JSON document.
 */
export function loadGuideline(guidelinesDir, id) {
  if (id === "manifest") {
    throw new Error(`Not found: "${id}" in guidelines/.`);
  }
  const baseDir = resolve(guidelinesDir);
  const filePath = resolve(baseDir, `${id}.json`);
  if (!filePath.startsWith(baseDir + sep)) {
    throw new Error(`Invalid guideline id: "${id}"`);
  }
  if (!existsSync(filePath)) {
    throw new Error(`Not found: "${id}" in guidelines/.`);
  }
  return JSON.parse(readFileSync(filePath, "utf-8"));
}

/**
 * List guideline catalog entries from the manifest, falling back to the files
 * present in the directory when the manifest is unavailable.
 *
 * @param {string} guidelinesDir - absolute path to the guidelines directory.
 * @returns {Array<object>} guideline catalog entries.
 */
export function listGuidelines(guidelinesDir) {
  const baseDir = resolve(guidelinesDir);
  const manifestPath = resolve(baseDir, "manifest.json");
  if (existsSync(manifestPath)) {
    const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
    return manifest.guidelines ?? [];
  }

  return readdirSync(baseDir)
    .filter((file) => file.endsWith(".json") && file !== "manifest.json")
    .map((file) => ({ slug: file.replace(/\.json$/, "") }))
    .sort((a, b) => a.slug.localeCompare(b.slug));
}
