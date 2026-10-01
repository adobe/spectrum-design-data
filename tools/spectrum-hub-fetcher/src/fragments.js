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

import { parse } from "node-html-parser";

const MAX_DEPTH = 3;
const FRAGMENT_LINK = 'a[href*="/fragments/"]';

function toPath(href) {
  try {
    const result = new URL(href, "https://fragment.invalid");
    return result.pathname.replace(/\.html$/, "");
  } catch {
    return href;
  }
}

function replacementTarget(anchor) {
  const parent = anchor.parentNode;
  const isLinkOnlyParagraph =
    (parent?.rawTagName || "").toLowerCase() === "p" &&
    parent.text.trim() === anchor.text.trim();
  return isLinkOnlyParagraph ? parent : anchor;
}

async function inline(node, fetchPage, depth, visited, stats) {
  if (depth >= MAX_DEPTH) {
    return;
  }

  for (const anchor of node.querySelectorAll(FRAGMENT_LINK)) {
    const path = toPath(anchor.getAttribute("href") || "");
    const target = replacementTarget(anchor);

    if (visited.has(path)) {
      target.remove();
      continue;
    }

    let fetched = null;
    let reason = null;
    let bucket = "missing";

    try {
      fetched = await fetchPage(path);
    } catch (error) {
      reason = error instanceof Error ? error.message : String(error);
      bucket = "unavailable";
    }

    const fragmentRoot = !reason && fetched?.html ? parse(fetched.html) : null;
    const fragmentNode = fragmentRoot
      ? (fragmentRoot.querySelector("main") ?? fragmentRoot)
      : null;

    if (!reason && !fragmentNode) {
      reason = fetched?.html ? "no fragment content found" : "not found";
    }

    if (fragmentNode) {
      if (Number.isFinite(fetched.lastModified)) {
        stats.timestamps.push(fetched.lastModified);
      }

      await inline(
        fragmentNode,
        fetchPage,
        depth + 1,
        new Set([...visited, path]),
        stats,
      );

      const replacementNodes = [...fragmentNode.childNodes].filter(
        (child) => child !== undefined,
      );
      if (replacementNodes.length) {
        stats.resolved += 1;
        target.replaceWith(...replacementNodes);
      } else {
        reason = "empty fragment";
      }
    }

    if (reason) {
      stats[bucket] += 1;
      stats.warn(
        `WARNING: fragment ${path} contributed no content (${reason})`,
      );
      target.remove();
    }
  }
}

export async function inlineFragments(
  root,
  fetchPage,
  { warn = console.warn } = {},
) {
  const stats = {
    timestamps: [],
    resolved: 0,
    missing: 0,
    unavailable: 0,
    warn,
  };

  await inline(root, fetchPage, 0, new Set(), stats);

  return {
    timestamps: stats.timestamps,
    resolved: stats.resolved,
    missing: stats.missing,
    unavailable: stats.unavailable,
    failed: stats.missing + stats.unavailable,
  };
}
