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

const HEADING_TAGS = new Set(["h1", "h2", "h3", "h4", "h5", "h6"]);
const TEXT_NODE = 3;
const ELEMENT_NODE = 1;

function normalize(value) {
  return value
    .replace(/\s+/g, " ")
    .replace(/\s+([.,;:!?])/g, "$1")
    .trim();
}

export function stripNoise(root) {
  root
    .querySelectorAll(
      ".playground, .section-metadata, picture, img, figure, video, style, script",
    )
    .forEach((element) => {
      element.remove();
    });

  root.querySelectorAll("span.icon").forEach((element) => {
    element.remove();
  });

  root.querySelectorAll("a").forEach((anchor) => {
    const text = (anchor.text || "").trim();
    if (/^https?:\/\//i.test(text)) {
      anchor.remove();
    }
  });
}

/**
 * A hub page that cannot become a guideline. Two shapes qualify:
 *
 * 1. Navigation shells, whose real content lives at a sibling path — the served
 *    `.plain.html` is literally `<div><h1 id="…">Title</h1></div>`. Example:
 *    /foundations/support/faqs (40 bytes) vs /support/faqs (16,598 bytes).
 * 2. Section landing pages that carry only AEM block-authoring boilerplate under
 *    h3s and never open an h2. Example: /foundations/behavior.
 *
 * Both are detected structurally rather than by byte count. The h2 requirement
 * mirrors the downstream contract: tools/s2-docs-to-document-blocks keys its
 * document blocks off h2 headings, so an h2-less page yields nothing either way.
 */
export function isStubSections(sections) {
  const hasBody = sections.some(
    (section) => section.text || section.level >= 2,
  );
  const hasH2 = sections.some((section) => section.level === 2);

  return !hasBody || !hasH2;
}

export function splitSections(root) {
  const collected = [];
  let current = { heading: "", level: 0, anchor: "", nodes: [] };

  const flush = () => {
    if (current.heading || current.nodes.length) {
      collected.push({ ...current });
    }
    current = { heading: "", level: 0, anchor: "", nodes: [] };
  };

  const walk = (node) => {
    if (node.nodeType === TEXT_NODE) {
      if (node.text && node.text.trim()) {
        current.nodes.push(node);
      }
      return;
    }

    if (node.nodeType !== ELEMENT_NODE) {
      return;
    }

    const tag = (node.rawTagName || "").toLowerCase();
    if (HEADING_TAGS.has(tag)) {
      const heading = normalize(node.text || "");
      if (heading || current.heading || current.nodes.length) {
        flush();
      }

      current = {
        heading,
        level: Number(tag[1]) || 1,
        anchor: node.getAttribute("id") || "",
        nodes: [],
      };
      return;
    }

    if (
      [
        "html",
        "body",
        "main",
        "div",
        "section",
        "article",
        "aside",
        "header",
        "footer",
        "nav",
      ].includes(tag)
    ) {
      node.childNodes.forEach(walk);
      return;
    }

    current.nodes.push(node);
  };

  root.childNodes.forEach(walk);
  flush();

  if (
    collected.length > 1 &&
    !collected[0].heading &&
    collected[0].nodes.length
  ) {
    collected[1].nodes = [...collected[0].nodes, ...collected[1].nodes];
    collected.shift();
  }

  return collected
    .map((section) => {
      const html = section.nodes.map((node) => node.toString()).join("");
      return {
        heading: section.heading,
        level: section.level,
        anchor: section.anchor,
        text: normalize(html.replace(/<[^>]+>/g, " ")),
      };
    })
    .filter((section) => section.heading || section.text);
}
