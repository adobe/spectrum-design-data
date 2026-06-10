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

import { buildBlocks } from "./blocks-builder.js";

const GUIDELINE_ID_BASE =
  "https://opensource.adobe.com/spectrum-design-data/guidelines/";
const GUIDELINE_SCHEMA =
  "https://opensource.adobe.com/spectrum-design-data/schemas/v0/guideline.schema.json";

/**
 * Build a guideline document object from a parsed markdown doc and its slug.
 *
 * @param {object} parsedDoc - result from parseDoc()
 * @param {string} slug - kebab-case file slug (e.g. "colors")
 * @param {object} [options]
 * @param {Set<string>} [options.componentNames] - known component name slugs for kind resolution
 * @param {Set<string>} [options.guidelineSlugs] - known guideline slugs for kind resolution
 * @returns {{ doc: object|null, blocks: Array, flags: string[], isStub: boolean }}
 */
export function buildGuideline(parsedDoc, slug, options = {}) {
  const { componentNames = new Set(), guidelineSlugs = new Set() } = options;
  const { frontmatter, isStub } = parsedDoc;

  const { blocks, flags } = buildBlocks(parsedDoc, {
    // Title seeds a purpose block when there's no ## Overview section,
    // mirroring the component description fallback.
    description: frontmatter.title ?? slug,
  });

  if (isStub || blocks.length === 0) {
    return { doc: null, blocks, flags, isStub: true };
  }

  // Warn when category is absent in frontmatter so the review report surfaces it
  // rather than silently emitting a potentially wrong "designing" default.
  if (!frontmatter.category) {
    flags.push(
      `REVIEW: no "category" in frontmatter — defaulting to "designing". ` +
        `Set category to one of: designing, fundamentals, developing, support.`,
    );
  }

  const doc = {
    $schema: GUIDELINE_SCHEMA,
    $id: `${GUIDELINE_ID_BASE}${slug}.json`,
    name: slug,
    title: frontmatter.title ?? slug,
    category: frontmatter.category ?? "designing",
    documentBlocks: blocks,
  };

  // Optional fields — only include when the frontmatter provides them
  if (frontmatter.source_url) {
    doc.sourceUrl = frontmatter.source_url;
  }
  if (frontmatter.last_updated) {
    // js-yaml parses bare dates as JavaScript Date objects; emit YYYY-MM-DD string.
    const d = frontmatter.last_updated;
    doc.lastUpdated =
      d instanceof Date ? d.toISOString().slice(0, 10) : String(d);
  }
  if (frontmatter.status) {
    doc.status = frontmatter.status;
  }
  if (Array.isArray(frontmatter.tags) && frontmatter.tags.length > 0) {
    doc.tags = frontmatter.tags;
  }

  // Map related_components → related[].ref, resolving kind when possible.
  // The frontmatter key mixes component and guideline refs — set kind when the
  // ref resolves against the provided name sets; leave it absent otherwise so
  // SPEC-046 falls back to checking both catalogs at validation time.
  if (
    Array.isArray(frontmatter.related_components) &&
    frontmatter.related_components.length > 0
  ) {
    doc.related = frontmatter.related_components
      .filter((r) => typeof r === "string" && r.trim())
      .map((r) => {
        const ref = r.trim();
        const entry = { ref };
        if (componentNames.has(ref)) {
          entry.kind = "component";
        } else if (guidelineSlugs.has(ref)) {
          entry.kind = "guideline";
        }
        return entry;
      });
  }

  return { doc, blocks, flags, isStub: false };
}
