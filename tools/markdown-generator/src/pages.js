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

import { readdir, readFile, writeFile, mkdir } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { BASE_SOURCE_URL } from "./constants.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..", "..", "..");
const SITE_PAGES_DIR = join(REPO_ROOT, "docs", "site", "src", "pages");

/**
 * Recursively collect all .md file paths under dir, with paths relative to dir.
 * @param {string} dir - absolute path
 * @param {string} [relativePrefix] - prefix for relative path (e.g. "components")
 * @returns {Promise<string[]>}
 */
async function collectMdPaths(dir, relativePrefix = "") {
  const entries = await readdir(dir, { withFileTypes: true });
  const paths = [];
  for (const entry of entries) {
    const rel = relativePrefix ? `${relativePrefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      const sub = await collectMdPaths(join(dir, entry.name), rel);
      paths.push(...sub);
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      paths.push(rel);
    }
  }
  return paths;
}

const FRONTMATTER_RE = /^---\n([\s\S]*?)\n---/;

/**
 * Inject or replace source_url in frontmatter. Path is relative to docs/markdown (e.g. "pages/index", "pages/components/index").
 * @param {string} content - full file content
 * @param {string} pathWithoutExt - path under docs/markdown without .md (e.g. "pages/index")
 * @returns {string} content with source_url in frontmatter
 */
function injectSourceUrl(content, pathWithoutExt) {
  const sourceUrl = `${BASE_SOURCE_URL}/${pathWithoutExt}/`;
  const match = content.match(FRONTMATTER_RE);
  if (match) {
    let fm = match[1];
    if (fm.includes("source_url:")) {
      fm = fm.replace(/^source_url:.*$/gm, `source_url: ${sourceUrl}`);
    } else {
      fm = fm.trimEnd() + `\nsource_url: ${sourceUrl}`;
    }
    return content.replace(FRONTMATTER_RE, `---\n${fm}\n---`);
  }
  return `---\nsource_url: ${sourceUrl}\n---\n\n${content}`;
}

/**
 * Copy markdown pages from docs/site/src/pages into docs/markdown/pages/,
 * preserving directory structure. Used for chatbot indexing and consistency
 * with the 11ty site content. Injects source_url into each file's frontmatter.
 * @param {string} outputDir - docs/markdown directory
 * @returns {Promise<number>} number of files copied
 */
export async function copySitePages(outputDir) {
  const pagesOutDir = join(outputDir, "pages");
  await mkdir(pagesOutDir, { recursive: true });

  const relativePaths = await collectMdPaths(SITE_PAGES_DIR);
  for (const rel of relativePaths) {
    const srcPath = join(SITE_PAGES_DIR, rel);
    const destPath = join(pagesOutDir, rel);
    await mkdir(dirname(destPath), { recursive: true });
    const content = await readFile(srcPath, "utf-8");
    const pathWithoutExt = "pages/" + rel.replace(/\.md$/, "");
    const withSourceUrl = injectSourceUrl(content, pathWithoutExt);
    await writeFile(destPath, withSourceUrl);
  }

  return relativePaths.length;
}
