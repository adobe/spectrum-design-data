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
const MIN_WORD_LENGTH = 3;
const STOPWORDS = new Set([
  "the",
  "and",
  "for",
  "from",
  "with",
  "that",
  "this",
  "are",
  "was",
  "has",
  "have",
  "can",
  "any",
  "into",
  "your",
  "you",
  "not",
  "but",
  "all",
  "use",
]);

const asString = (v) => (typeof v === "string" ? v : "");

function queryWords(query) {
  return [
    ...new Set(
      query
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((w) => w.length >= MIN_WORD_LENGTH && !STOPWORDS.has(w)),
    ),
  ];
}

// Match at a word start so "pick" finds "picker" but "tor" doesn't find "button".
const wordIndex = (text, word) =>
  text.search(new RegExp(`(^|[^a-z0-9])${word}`));

function snippetAround(text, index) {
  const start = Math.max(0, index - 60);
  const slice = text.slice(start, start + SNIPPET_LENGTH).replace(/\s+/g, " ");
  return (start > 0 ? "…" : "") + slice.trim();
}

function loadComponent(componentsDir, file) {
  try {
    return JSON.parse(readFileSync(join(componentsDir, file), "utf-8"));
  } catch {
    return null;
  }
}

/**
 * Search components by natural-language query.
 *
 * Query words are lowercased, split on non-alphanumerics, and filtered for
 * stopwords and words under 3 characters. A word matches at the start of a
 * word in the displayName, description or documentBlocks text. Components
 * containing every word win; if none do, components with any word in the
 * displayName or description are returned (docs-text-only hits are ignored). Ranking: exact displayName, displayName, description, then docs
 * text; within a tier, more matched words first, then alphabetical. Files that
 * can't be parsed are skipped.
 *
 * shortcut: no stemming or fuzzy matching; revisit once real use-case queries
 * exist to evaluate against.
 *
 * @param {string} componentsDir - absolute path to the components directory.
 * @param {string} query
 * @param {{category?: string, limit?: number}} [options] `limit` is clamped to
 *   an integer of at least 1.
 * @returns {Array<{id: string, displayName: string, category: string, snippet: string}>}
 */
export function searchComponents(
  componentsDir,
  query,
  { category, limit = 10 } = {},
) {
  const words = queryWords(asString(query));
  if (words.length === 0 || !existsSync(componentsDir)) return [];
  const max = Number.isFinite(limit) ? Math.max(1, Math.floor(limit)) : 10;
  const phrase = asString(query).trim().toLowerCase();

  const scored = [];
  for (const file of readdirSync(componentsDir).sort()) {
    if (!file.endsWith(".json")) continue;
    const doc = loadComponent(componentsDir, file);
    if (!doc) continue;
    const componentCategory = doc.meta?.category ?? "uncategorized";
    if (category && componentCategory !== category) continue;

    const id = asString(doc.name) || file.replace(/\.json$/, "");
    const displayName = asString(doc.displayName) || id;
    const name = displayName.toLowerCase();
    const description = asString(doc.description);
    const descriptionLower = description.toLowerCase();
    const blocks = (Array.isArray(doc.documentBlocks) ? doc.documentBlocks : [])
      .flatMap((b) => [asString(b?.content), asString(b?.dont)])
      .filter(Boolean);
    const blocksLower = blocks.map((b) => b.toLowerCase());

    const hits = words.filter((w) =>
      [name, descriptionLower, ...blocksLower].some(
        (f) => wordIndex(f, w) >= 0,
      ),
    );
    if (hits.length === 0) continue;

    // Snippet comes from the highest-ranked place a word matched.
    let snippet = "";
    const inDescription = hits
      .map((w) => wordIndex(descriptionLower, w))
      .filter((i) => i >= 0);
    if (inDescription.length > 0) {
      snippet = snippetAround(description, Math.min(...inDescription));
    } else {
      const blockIndex = blocksLower.findIndex((b) =>
        hits.some((w) => wordIndex(b, w) >= 0),
      );
      if (blockIndex >= 0) {
        const at = Math.min(
          ...hits
            .map((w) => wordIndex(blocksLower[blockIndex], w))
            .filter((i) => i >= 0),
        );
        snippet = snippetAround(blocks[blockIndex], at);
      } else {
        snippet = snippetAround(description, 0);
      }
    }

    const tier =
      name === phrase || words.includes(name)
        ? 0
        : hits.some((w) => wordIndex(name, w) >= 0)
          ? 1
          : hits.some((w) => wordIndex(descriptionLower, w) >= 0)
            ? 2
            : 3;

    scored.push({
      all: hits.length === words.length,
      tier,
      count: hits.length,
      result: { id, displayName, category: componentCategory, snippet },
    });
  }

  // Fallback ignores docs-text-only hits (tier 3): too loose without all words.
  const pool = scored.some((s) => s.all)
    ? scored.filter((s) => s.all)
    : scored.filter((s) => s.tier < 3);
  return pool
    .sort((a, b) => a.tier - b.tier || b.count - a.count)
    .slice(0, max)
    .map((s) => s.result);
}
