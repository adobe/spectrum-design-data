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

import yaml from "js-yaml";

/**
 * Strip YAML frontmatter and return { frontmatter, body }
 */
export function splitFrontmatter(markdown) {
  const match = markdown.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) {
    return { frontmatter: {}, body: markdown };
  }
  let frontmatter = {};
  try {
    frontmatter = yaml.load(match[1]) ?? {};
  } catch {
    // malformed frontmatter — treat as empty
  }
  return { frontmatter, body: match[2] };
}

/**
 * Parse a markdown body into a list of top-level sections (## headings).
 * Each section includes its h3 subsections.
 *
 * Returns:
 *   [{ heading: string, content: string, subsections: [{ heading, content }] }]
 */
export function parseSections(body) {
  // Split on ## headings (level 2). Capture heading text and body.
  const sectionRegex = /^## (.+)$/gm;
  const positions = [];
  let match;

  while ((match = sectionRegex.exec(body)) !== null) {
    positions.push({
      heading: match[1].trim(),
      index: match.index,
      endIndex: match.index + match[0].length,
    });
  }

  const sections = [];

  for (let i = 0; i < positions.length; i++) {
    const start = positions[i].endIndex;
    const end = i + 1 < positions.length ? positions[i + 1].index : body.length;
    const sectionBody = body.slice(start, end).trim();

    sections.push({
      heading: positions[i].heading,
      content: sectionBody,
      subsections: parseSubsections(sectionBody),
    });
  }

  return sections;
}

/**
 * Parse ### subsections out of a section body.
 * Returns [{ heading, content }]
 */
function parseSubsections(body) {
  const subRegex = /^### (.+)$/gm;
  const positions = [];
  let match;

  while ((match = subRegex.exec(body)) !== null) {
    positions.push({
      heading: match[1].trim(),
      index: match.index,
      endIndex: match.index + match[0].length,
    });
  }

  if (positions.length === 0) return [];

  const subsections = [];
  for (let i = 0; i < positions.length; i++) {
    const start = positions[i].endIndex;
    const end = i + 1 < positions.length ? positions[i + 1].index : body.length;
    subsections.push({
      heading: positions[i].heading,
      content: body.slice(start, end).trim(),
    });
  }
  return subsections;
}

/**
 * Parse a full s2-docs markdown file.
 *
 * Returns:
 * {
 *   frontmatter: {},
 *   title: string,
 *   sections: [{ heading, content, subsections }],
 *   isStub: boolean,
 * }
 */
export function parseDoc(markdown) {
  const { frontmatter, body } = splitFrontmatter(markdown);

  // Extract # title
  const titleMatch = body.match(/^# (.+)$/m);
  const title = titleMatch ? titleMatch[1].trim() : (frontmatter.title ?? "");

  const isStub = body.includes("Content should be scraped from the live site");

  const sections = parseSections(body);

  return { frontmatter, title, sections, isStub };
}

/**
 * Return the text content of a section (heading ignored, stripped of inner ### headings).
 * Used for duplicate detection.
 */
export function sectionTextContent(section) {
  // Remove ### headings, keeping only their body text
  return section.content
    .replace(/^### .+$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
