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

/**
 * Sections we skip entirely — structured data already in component JSON,
 * boilerplate, or implementation references.
 */
const SKIP_SECTIONS = new Set([
  "resources",
  "anatomy",
  "component options",
  "states",
  "design tokens",
  "changelog",
  "questions or feedback?",
  "related components",
]);

/**
 * Rewrite internal Spectrum 2 page links to absolute URLs.
 * Converts /page/{slug}/ to https://spectrum.adobe.com/page/{slug}/
 */
export function rewriteLinks(text) {
  return text.replace(
    /(?<!\w)(\/page\/[a-z0-9-]+\/)/g,
    (_, path) => `https://spectrum.adobe.com${path}`,
  );
}

/**
 * Normalize extracted prose: trim whitespace, strip outer smart quotes
 * sometimes inserted by the scraper, collapse 3+ blank lines.
 */
function normalize(text) {
  return text
    .replace(/^[""]|[""]$/g, "") // strip leading/trailing curly quotes
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Build a content string from a heading + body.
 * Format: "Heading sentence. Body prose."
 */
function buildContent(heading, body) {
  const h = heading.trim();
  const b = normalize(body);

  if (!b) return h;
  if (!h) return b;

  // Avoid duplicating when body already starts with heading words
  const headingWords = h.toLowerCase().replace(/[^a-z0-9 ]/g, "");
  const bodyStart = b.toLowerCase().slice(0, headingWords.length + 10);
  if (bodyStart.startsWith(headingWords)) return b;

  // Append heading as lead-in sentence
  const hSentence = /[.!?]$/.test(h) ? h : `${h}.`;
  return rewriteLinks(`${hSentence}\n\n${b}`);
}

/**
 * Detect if a heading indicates a "don't / avoid" usage pattern.
 */
function isDontHeading(heading) {
  return /^(don't|do not|avoid|never)\b/i.test(heading.trim());
}

/**
 * Split a "don't" heading subsection into a do-dont block.
 * content = the heading (summary), dont = the body prose.
 */
function buildDoDontBlock(heading, body) {
  const block = {
    type: "do-dont",
    content: heading.trim(),
  };
  const bodyText = normalize(rewriteLinks(body));
  if (bodyText) {
    block.dont = bodyText;
  }
  return block;
}

/**
 * Extract paragraphs from a flat (no-subsection) section body.
 * Strips tables, code fences, and the "These options are used in..." boilerplate.
 */
function extractParagraphs(body) {
  const boilerplate = [
    // Matches both ASCII apostrophe and Unicode curly right-single-quote (U+2019)
    /these options are used in spectrum/i,
    /use the \[spectrum token visualization tool\]/i,
    /ask questions about this component/i,
  ];

  return body
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter((p) => {
      if (!p) return false;
      // Skip code fences, headings, tables, horizontal rules
      if (/^```/.test(p)) return false;
      if (/^\|/.test(p)) return false;
      if (/^#+/.test(p)) return false;
      if (/^---+$/.test(p)) return false;
      if (boilerplate.some((re) => re.test(p))) return false;
      // Skip very short fragments (< 20 chars) — likely noise
      if (p.replace(/[^a-zA-Z]/g, "").length < 20) return false;
      return true;
    });
}

/**
 * Detect duplicate content within a set of blocks.
 * Returns a Set of content strings that appear more than once.
 */
function findDuplicateContent(blocks) {
  const seen = new Map();
  for (const block of blocks) {
    const key = block.content.trim().toLowerCase();
    seen.set(key, (seen.get(key) ?? 0) + 1);
  }
  return new Set(
    [...seen.entries()].filter(([, count]) => count > 1).map(([key]) => key),
  );
}

/**
 * Build document blocks from a parsed doc.
 *
 * @param {object} parsedDoc - result from parseDoc()
 * @param {{ description?: string }} [options] - component-level fallback values
 * @returns {{ blocks: Array, flags: string[] }}
 */
export function buildBlocks(parsedDoc, { description = "" } = {}) {
  const { sections, isStub } = parsedDoc;
  const flags = [];

  if (isStub) {
    flags.push(
      "STUB: page has no scraped content — needs source from live site",
    );
    return { blocks: [], flags };
  }

  const blocks = [];
  let hasOverview = false;

  for (const section of sections) {
    const headingKey = section.heading.toLowerCase();

    // Sections to skip
    if (SKIP_SECTIONS.has(headingKey)) continue;

    // ── Overview → purpose block ──────────────────────────────────────────
    if (headingKey === "overview") {
      const text = normalize(rewriteLinks(section.content));
      if (text) {
        blocks.push({ type: "purpose", content: text });
        hasOverview = true;
      } else {
        flags.push(`EMPTY: "## Overview" section has no content`);
      }
      continue;
    }

    // ── External links (scraper artifact) → guideline blocks ─────────────
    // This section sometimes contains the real prose when the scraper failed
    // to populate the proper sections.
    if (headingKey === "external links") {
      if (section.subsections.length > 0) {
        // Subsections present — treat like Usage guidelines
        for (const sub of section.subsections) {
          const body = normalize(rewriteLinks(sub.content));
          if (!body && !sub.heading) continue;
          blocks.push({
            type: "guideline",
            content: buildContent(sub.heading, sub.content),
            _source: "external-links",
          });
        }
      } else {
        // Flat paragraphs — one block per paragraph
        const paras = extractParagraphs(rewriteLinks(section.content));
        for (const para of paras) {
          blocks.push({
            type: "guideline",
            content: normalize(para),
            _source: "external-links",
          });
        }
      }
      flags.push(
        'REVIEW: "## External links" section contained prose — content may overlap with other sections; verify placement and remove duplicates.',
      );
      continue;
    }

    // ── Behaviors → guideline blocks ──────────────────────────────────────
    if (headingKey === "behaviors") {
      if (section.subsections.length > 0) {
        for (const sub of section.subsections) {
          const content = buildContent(sub.heading, sub.content);
          if (content) {
            blocks.push({ type: "guideline", content });
          }
        }
      } else {
        const paras = extractParagraphs(rewriteLinks(section.content));
        for (const para of paras) {
          blocks.push({ type: "guideline", content: normalize(para) });
        }
      }
      continue;
    }

    // ── Usage guidelines → guideline or do-dont blocks ────────────────────
    if (headingKey === "usage guidelines") {
      if (section.subsections.length > 0) {
        for (const sub of section.subsections) {
          if (isDontHeading(sub.heading)) {
            const block = buildDoDontBlock(sub.heading, sub.content);
            // do-dont needs at least one of do/dont — if body empty, downgrade to guideline
            if (!block.dont) {
              blocks.push({ type: "guideline", content: block.content });
              flags.push(
                `REVIEW: "### ${sub.heading}" looks like a don't rule but has no body text — stored as guideline.`,
              );
            } else {
              blocks.push(block);
            }
          } else {
            const content = buildContent(sub.heading, sub.content);
            if (content) {
              blocks.push({ type: "guideline", content });
            }
          }
        }
      } else {
        const paras = extractParagraphs(rewriteLinks(section.content));
        for (const para of paras) {
          blocks.push({ type: "guideline", content: normalize(para) });
        }
        if (paras.length === 0 && section.content.trim()) {
          flags.push(
            'EMPTY: "## Usage guidelines" section has no extractable paragraphs',
          );
        }
      }
      continue;
    }

    // ── Component options subsections → guideline blocks ─────────────────
    // Only pick up the detailed ### subsections — the main table is skipped.
    if (headingKey === "component options") {
      for (const sub of section.subsections) {
        const content = buildContent(sub.heading, sub.content);
        if (content) {
          blocks.push({ type: "guideline", content });
        }
      }
      continue;
    }

    // ── Any other non-skipped section with prose ──────────────────────────
    if (section.subsections.length > 0) {
      for (const sub of section.subsections) {
        const content = buildContent(sub.heading, sub.content);
        if (content) {
          blocks.push({ type: "guideline", content });
        }
      }
    } else {
      const paras = extractParagraphs(rewriteLinks(section.content));
      for (const para of paras) {
        blocks.push({ type: "guideline", content: normalize(para) });
      }
    }
  }

  // ── Quality checks ────────────────────────────────────────────────────

  if (!hasOverview && blocks.length > 0) {
    const desc = description && description.trim();
    if (desc) {
      // Seed a purpose block from the component's own description field
      blocks.unshift({ type: "purpose", content: desc });
    } else {
      flags.push(
        'REVIEW: No "## Overview" section found — no purpose block generated. Consider adding one manually.',
      );
    }
  }

  // Strip internal _source metadata before deduplicating
  const strippedBlocks = blocks.map(({ _source: _ignored, ...rest }) => rest); // eslint-disable-line no-unused-vars

  // Auto-remove duplicate content (keep first occurrence).
  // Duplicates are a partial-scrape artefact — silently removing them is safer
  // than leaving bad data in the JSON.
  const seen = new Set();
  const dedupedBlocks = [];
  let removedCount = 0;
  for (const block of strippedBlocks) {
    const key = block.content.trim().toLowerCase();
    if (seen.has(key)) {
      removedCount++;
    } else {
      seen.add(key);
      dedupedBlocks.push(block);
    }
  }
  if (removedCount > 0) {
    flags.push(
      `INFO: removed ${removedCount} duplicate block(s) — partial-scrape artefact auto-cleaned.`,
    );
  }

  return { blocks: dedupedBlocks, flags };
}
