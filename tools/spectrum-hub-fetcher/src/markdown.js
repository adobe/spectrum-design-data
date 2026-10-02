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

export function buildFrontmatter({
  title,
  category,
  sourceUrl,
  lastUpdated,
  tags = [],
  status = "published",
  extra = {},
}) {
  const frontmatter = {
    title,
    ...(category ? { category } : {}),
    source_url: sourceUrl,
    last_updated: lastUpdated,
    status,
    tags,
    ...extra,
  };

  return frontmatter;
}

export function normalizeMarkdown(value) {
  return value
    .replace(/\u00a0/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/\n[ \t]+\n/g, "\n\n")
    .trim();
}

export function renderPage({
  title,
  category,
  sections = [],
  sourceUrl,
  lastUpdated,
  tags = [],
  status = "published",
  extra = {},
}) {
  const bodySections = (sections || []).filter((section) => {
    const sameTitle = section.level === 1 && section.heading === title;
    return !sameTitle;
  });

  const body = bodySections
    .map((section) => {
      const lines = [];
      if (section.heading) {
        const level =
          section.level <= 1 ? "#" : section.level === 2 ? "##" : "###";
        lines.push(`${level} ${section.heading}`);
      }

      if (section.text) {
        lines.push(section.text);
      }

      return lines.join("\n\n");
    })
    .filter(Boolean)
    .join("\n\n");

  const markdown = normalizeMarkdown(
    [`# ${title}`, body].filter(Boolean).join("\n\n"),
  );
  const frontmatter = buildFrontmatter({
    title,
    category,
    sourceUrl,
    lastUpdated,
    tags,
    status,
    extra,
  });

  const yamlText = yaml
    .dump(frontmatter, {
      lineWidth: -1,
      noRefs: true,
    })
    .trimEnd();

  return `---\n${yamlText}\n---\n\n${markdown}\n`;
}
