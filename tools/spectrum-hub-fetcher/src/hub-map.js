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
 * Minimal, beta-scoped hub-path -> (category, slug) mapping.
 *
 * Deliberately narrow: covers only the /foundations, /content and /support
 * prefixes needed for the first beta of @adobe/design-data-mcp. The full
 * mapping (including component pages) is tracked as spectrum-design-data-085.2.2.
 */

/**
 * Hub top-level prefix -> guideline category. The category values are
 * constrained by packages/design-data-spec/schemas/guideline.schema.json,
 * whose enum is ["designing", "fundamentals", "developing", "support"].
 *
 * `/foundations/*` maps to "designing", not "fundamentals", to match the
 * convention already established in packages/design-data/guidelines: that
 * corpus reserves "fundamentals" for meta pages (home, introduction,
 * principles) and files concrete design guidance — colors, motion, brand,
 * typography — under "designing". Mapping to "fundamentals" instead would
 * relocate 11 existing guidelines for no editorial reason.
 */
const PREFIX_CATEGORIES = [
  ["/foundations/", "designing"],
  ["/content/", "designing"],
  ["/support/", "support"],
];

export const SUPPORTED_PREFIXES = PREFIX_CATEGORIES.map(([prefix]) => prefix);

/**
 * Explicit slug decisions for cases the generic rules below cannot settle on
 * their own. Keep this table small and justified — it is a curated override,
 * not a dumping ground.
 */
export const SLUG_OVERRIDES = {
  // Two genuinely distinct real pages both ending in "contact-us"; the
  // /support one is canonical, the /foundations one is a secondary entry point.
  "/foundations/support/contact-us": "foundations-contact-us",
};

/**
 * Explicit category decisions for pages whose hub prefix does not reflect the
 * audience the content actually serves. Like SLUG_OVERRIDES, keep this small.
 */
export const CATEGORY_OVERRIDES = {
  // Lives under /support on the hub, but it is developer-facing orientation
  // material and the guideline corpus already files it under "developing".
  "/support/developer-overview": "developing",
};

/**
 * Paths that lose to a canonical sibling when both are non-stub pages with the
 * same terminal segment. Unlike stubs (which are dropped automatically because
 * they carry no content), these are substantive pages whose overlap falls below
 * NEAR_DUPLICATE_THRESHOLD, so the choice has to be recorded explicitly.
 */
export const NON_CANONICAL_PATHS = new Set([
  // 91.5% similar to /foundations/brand, which is the fuller top-level treatment.
  "/foundations/visual-language/brand",
  // 90.0% similar to /foundations/attention-hierarchy, the fuller treatment.
  "/foundations/composition/attention-hierarchy",
]);

/**
 * Jaccard similarity above which two hub pages are treated as the same page
 * published at two paths.
 *
 * The hub really does serve duplicates: /foundations/color/color and
 * /foundations/color/colors were byte-for-byte equivalent prose (100%), and
 * /support/contact vs /support/contact-us overlapped at 98.5%. Emitting both
 * would put redundant guidelines into the MCP dataset, so the newer page wins.
 */
export const NEAR_DUPLICATE_THRESHOLD = 0.95;

function tokenize(text) {
  return new Set(
    String(text || "")
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter(Boolean),
  );
}

export function similarity(a, b) {
  const left = tokenize(a);
  const right = tokenize(b);
  if (left.size === 0 && right.size === 0) {
    return 1;
  }

  let shared = 0;
  for (const token of left) {
    if (right.has(token)) {
      shared += 1;
    }
  }

  return shared / (left.size + right.size - shared);
}

/**
 * Prefer the most recently modified page; fall back to the shallower path, then
 * to lexical order so the result is deterministic across runs.
 */
function preferred(a, b) {
  const aTime = Number.isFinite(a.lastModified) ? a.lastModified : -1;
  const bTime = Number.isFinite(b.lastModified) ? b.lastModified : -1;
  if (aTime !== bTime) {
    return aTime > bTime ? a : b;
  }

  const aDepth = segments(a.path).length;
  const bDepth = segments(b.path).length;
  if (aDepth !== bDepth) {
    return aDepth < bDepth ? a : b;
  }

  return a.path < b.path ? a : b;
}

/**
 * Collapse pages whose prose is the same content published at two hub paths.
 *
 * @param {Array<{path: string, text: string, lastModified?: number}>} pages
 * @returns {{ kept: Array, dropped: Array<{path: string, reason: string, duplicateOf: string}> }}
 */
export function dedupeByContent(
  pages,
  { threshold = NEAR_DUPLICATE_THRESHOLD } = {},
) {
  const kept = [];
  const dropped = [];

  for (const page of pages) {
    const matchIndex = kept.findIndex(
      (candidate) => similarity(candidate.text, page.text) >= threshold,
    );

    if (matchIndex === -1) {
      kept.push(page);
      continue;
    }

    const incumbent = kept[matchIndex];
    const winner = preferred(incumbent, page);
    const loser = winner === incumbent ? page : incumbent;

    kept[matchIndex] = winner;
    dropped.push({
      path: loser.path,
      reason: "near-duplicate",
      duplicateOf: winner.path,
    });
  }

  return { kept, dropped };
}

export function categoryForPath(path) {
  const override = CATEGORY_OVERRIDES[path];
  if (override) {
    return override;
  }

  for (const [prefix, category] of PREFIX_CATEGORIES) {
    if (path === prefix.slice(0, -1) || path.startsWith(prefix)) {
      return category;
    }
  }

  return null;
}

function segments(path) {
  return path.split("/").filter(Boolean);
}

function kebab(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Derive a slug from a hub path using `depth` trailing segments.
 * depth=1 -> "motion", depth=2 -> "behavior-motion".
 */
function slugAtDepth(path, depth) {
  const parts = segments(path);
  return kebab(parts.slice(Math.max(0, parts.length - depth)).join("-"));
}

/**
 * Assign a unique slug to every retained page.
 *
 * Rules, in order:
 *   1. An explicit SLUG_OVERRIDES entry always wins.
 *   2. Otherwise use the terminal path segment.
 *   3. On collision, widen to parent-qualified slugs ("app-frame-overview"),
 *      which matches the convention already used by the existing guideline
 *      corpus in packages/design-data/guidelines/.
 *   4. If widening still collides, suffix with a counter so the run can never
 *      silently drop a page.
 *
 * @param {string[]} paths - retained (non-stub, canonical) hub paths
 * @returns {Map<string, string>} path -> slug
 */
export function assignSlugs(paths) {
  const assigned = new Map();
  const taken = new Set();

  for (const path of paths) {
    const override = SLUG_OVERRIDES[path];
    if (override) {
      assigned.set(path, override);
      taken.add(override);
    }
  }

  const remaining = paths.filter((path) => !assigned.has(path));

  const byTerminal = new Map();
  for (const path of remaining) {
    const key = slugAtDepth(path, 1);
    if (!byTerminal.has(key)) {
      byTerminal.set(key, []);
    }
    byTerminal.get(key).push(path);
  }

  for (const [terminal, group] of byTerminal) {
    if (group.length === 1 && !taken.has(terminal)) {
      assigned.set(group[0], terminal);
      taken.add(terminal);
      continue;
    }

    for (const path of group) {
      const maxDepth = segments(path).length;
      let slug = null;

      for (let depth = 2; depth <= maxDepth; depth += 1) {
        const candidate = slugAtDepth(path, depth);
        if (!taken.has(candidate)) {
          slug = candidate;
          break;
        }
      }

      if (!slug) {
        const base = slugAtDepth(path, maxDepth);
        let counter = 2;
        while (taken.has(`${base}-${counter}`)) {
          counter += 1;
        }
        slug = `${base}-${counter}`;
      }

      assigned.set(path, slug);
      taken.add(slug);
    }
  }

  return assigned;
}

/**
 * Build the final page map from fetched pages.
 *
 * Order matters: stubs are removed before near-duplicate detection (an empty
 * shell is trivially "similar" to another empty shell), and slugs are assigned
 * last so they are only spent on pages that actually ship.
 *
 * @param {Array<{path: string, isStub: boolean, text?: string, lastModified?: number}>} pages
 * @returns {{ mapped: Map<string, {slug: string, category: string}>, dropped: Array<{path: string, reason: string}> }}
 */
export function buildPageMap(pages) {
  const dropped = [];
  const candidates = [];

  for (const page of pages) {
    const category = categoryForPath(page.path);

    if (!category) {
      dropped.push({ path: page.path, reason: "unmapped-prefix" });
      continue;
    }

    if (page.isStub) {
      dropped.push({ path: page.path, reason: "stub-page" });
      continue;
    }

    if (NON_CANONICAL_PATHS.has(page.path)) {
      dropped.push({ path: page.path, reason: "non-canonical-duplicate" });
      continue;
    }

    candidates.push({ ...page, category });
  }

  const { kept, dropped: duplicates } = dedupeByContent(candidates);
  dropped.push(...duplicates);

  const slugs = assignSlugs(kept.map((page) => page.path));
  const mapped = new Map();

  for (const page of kept) {
    mapped.set(page.path, {
      slug: slugs.get(page.path),
      category: page.category,
    });
  }

  return { mapped, dropped };
}
