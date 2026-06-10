/**
 * Copyright 2026 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */

import { readFileSync } from "node:fs";
import { parseDoc } from "./md-parser.js";
import { buildBlocks } from "./blocks-builder.js";
import { writeJson } from "./write-json.js";

/**
 * Insert (or replace) a `documentBlocks` key after `meta` in a component object,
 * preserving all other key order.
 */
export function insertDocumentBlocks(component, blocks) {
  const entries = Object.entries(component);
  const metaIndex = entries.findIndex(([k]) => k === "meta");

  // Remove any existing documentBlocks key
  const filtered = entries.filter(([k]) => k !== "documentBlocks");

  // Insert after meta (or after the last known header key as fallback)
  const insertAfter =
    metaIndex >= 0
      ? metaIndex
      : filtered.findIndex(([k]) => k === "description");
  const insertAt = insertAfter >= 0 ? insertAfter + 1 : filtered.length;

  filtered.splice(insertAt, 0, ["documentBlocks", blocks]);
  return Object.fromEntries(filtered);
}

/**
 * Transform a single component: parse its s2-doc, build blocks, merge into JSON.
 *
 * @param {string} componentJsonPath - absolute path to the component JSON file
 * @param {string} docMarkdownPath - absolute path to the s2-docs Markdown file
 * @param {{ dryRun?: boolean }} options
 * @returns {Promise<{ slug: string, changed: boolean, blocks: Array, flags: string[] }>}
 */
export async function transformComponent(
  componentJsonPath,
  docMarkdownPath,
  options = {},
) {
  // Read component JSON first so its description can seed the purpose block
  const componentJson = JSON.parse(readFileSync(componentJsonPath, "utf8"));

  const markdown = readFileSync(docMarkdownPath, "utf8");
  const parsedDoc = parseDoc(markdown);

  const { blocks, flags } = buildBlocks(parsedDoc, {
    description: componentJson.description ?? "",
  });

  const slug =
    parsedDoc.frontmatter?.title?.toLowerCase().replace(/\s+/g, "-") ??
    componentJsonPath.split("/").pop().replace(".json", "");

  if (blocks.length === 0) {
    return { slug, changed: false, blocks, flags };
  }

  const updated = insertDocumentBlocks(componentJson, blocks);

  if (!options.dryRun) {
    await writeJson(componentJsonPath, updated);
  }

  return { slug, changed: true, blocks, flags };
}
