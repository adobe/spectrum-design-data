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
 * Shared component search over `<package>/components/*.json`, used by
 * @adobe/design-data-mcp's `design-data-component-search` tool.
 */

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const SNIPPET_LENGTH = 200;

function snippetAround(text, index) {
  const start = Math.max(0, index - 60);
  const slice = text.slice(start, start + SNIPPET_LENGTH).replace(/\s+/g, " ");
  return (start > 0 ? "…" : "") + slice.trim();
}

/**
 * Search components by natural-language query.
 *
 * Every query word must appear in the displayName, description or
 * documentBlocks text; if no component has all words, components with any word
 * are returned. Ranked by where the words hit: exact displayName, displayName, description,
 * then document blocks (ties keep alphabetical order).
 *
 * shortcut: plain substring matching, no stemming or fuzzy; revisit once real
 * use-case queries exist to evaluate against.
 *
 * @param {string} componentsDir - absolute path to the components directory.
 * @param {string} query
 * @param {{category?: string, limit?: number}} [options]
 * @returns {Array<{id: string, displayName: string, category: string, snippet: string}>}
 */
export function searchComponents(
  componentsDir,
  query,
  { category, limit = 10 } = {},
) {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0 || !existsSync(componentsDir)) return [];

  const scored = [];
  for (const file of readdirSync(componentsDir).sort()) {
    if (!file.endsWith(".json")) continue;
    const doc = JSON.parse(readFileSync(join(componentsDir, file), "utf-8"));
    const componentCategory = doc.meta?.category ?? "uncategorized";
    if (category && componentCategory !== category) continue;

    const id = doc.name ?? file.replace(/\.json$/, "");
    const displayName = doc.displayName ?? id;
    const description = doc.description ?? "";
    const blocks = (doc.documentBlocks ?? []).flatMap((b) =>
      [b.content, b.dont].filter(Boolean),
    );
    const fields = [displayName, description, ...blocks].map((s) =>
      s.toLowerCase(),
    );

    const hits = words.filter((w) => fields.some((f) => f.includes(w)));
    if (hits.length === 0) continue;

    let snippet = description;
    const blockIndex = blocks.findIndex((b) =>
      hits.some((w) => b.toLowerCase().includes(w)),
    );
    if (blockIndex >= 0) {
      const text = blocks[blockIndex];
      const at = text
        .toLowerCase()
        .indexOf(hits.find((w) => text.toLowerCase().includes(w)));
      snippet = snippetAround(text, at);
    }

    scored.push({
      all: hits.length === words.length,
      tier:
        fields[0] === query.trim().toLowerCase()
          ? 0
          : hits.some((w) => fields[0].includes(w))
            ? 1
            : hits.some((w) => fields[1].includes(w))
              ? 2
              : 3,
      result: { id, displayName, category: componentCategory, snippet },
    });
  }

  const pool = scored.some((s) => s.all) ? scored.filter((s) => s.all) : scored;
  return pool
    .sort((a, b) => a.tier - b.tier)
    .slice(0, limit)
    .map((s) => s.result);
}
