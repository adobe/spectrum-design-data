// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0

// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

import { categorizeRow } from "./categorize.js";
import { resolveTarget } from "./resolve-target.js";
import { findTokenUuid, loadLegacyKeyIndex } from "./find-token-uuid.js";
import { isFontSizeValue, parseFontSize } from "./parse-scale.js";

const COLOR_SCHEMA =
  "https://opensource.adobe.com/spectrum-design-data/schemas/token-types/color.json";

/**
 * Resolve a font-size row directly by uuid existence at the `mobile` scale
 * member, scanning `[Token Name, ...Aliases]` in order — NOT via
 * `resolveTarget`'s structural decompose. A component name like
 * `action-bar-counter-font-size` roundtrips through `decompose-legacy-name`
 * just fine (it's a valid property slug), which would resolve to itself and
 * shadow the real `font-size-100` alias it points to. Existence in the
 * legacy-key index (built from the same tokens the CSV was generated
 * against) is the reliable signal here instead.
 */
function emitFontSizeRow(row, legacyKeyIndex) {
  const candidates = [row["Token Name"], ...splitAliases(row.Aliases)].filter(
    Boolean,
  );
  const value = parseFontSize(row["New Value"]);
  for (const slug of candidates) {
    const uuid = findTokenUuid(legacyKeyIndex, slug, { scale: "mobile" });
    if (uuid) {
      return { overrides: [{ target: uuid, value }], extensionTokens: [] };
    }
  }
  return { overrides: [], extensionTokens: [], unresolved: candidates };
}

function splitAliases(aliases) {
  if (!aliases) return [];
  return aliases
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Turn one categorized+resolved row into manifest fragments, per MODE rather
 * than per row's overall category — a single row can need both kinds of
 * fragment at once (e.g. its light base value changed AND it grew a new
 * light/contrast:high slot that didn't exist before). See categorizeRow's
 * doc for why the split happens there.
 *
 * - `overrideModes` → one `overrides[]` entry per mode, targeted by the
 *   existing foundation token's **uuid**, looked up via its computed legacy
 *   key (see find-token-uuid.js for why: uuid is the only unambiguous
 *   target, and legacy-key string matching is the only reliable lookup).
 *   A mode whose uuid can't be found is dropped into `unresolved` for the
 *   gap report rather than emitted with a broken target.
 * - `extensionModes` → one `extensions.tokens[]` entry per mode, reusing the
 *   resolved name fields (mirrors the color-set member shape — same
 *   identity, different colorScheme/contrast). These are new records, so no
 *   existence check is needed.
 * - `out-of-scope` (letter-spacing, non-color/font-size sizing) → no manifest
 *   fragment.
 *
 * Rows whose target doesn't resolve at all (own name nor any Aliases entry)
 * produce no fragment either — the caller logs `row` into the gap report
 * instead of fabricating a name.
 *
 * Font-size rows (`FontSize(N)` / `Scale(FontSize(N))`) are handled up front
 * via `emitFontSizeRow`, bypassing `categorizeRow`/`resolveTarget` entirely —
 * see that function's doc for why. See spectrum-design-data-h890.15.
 */
export function emitRow(row, options) {
  if (isFontSizeValue(row["New Value"])) {
    const legacyKeyIndex = options?.legacyKeyIndex ?? loadLegacyKeyIndex();
    return emitFontSizeRow(row, legacyKeyIndex);
  }

  const { category, overrideModes, extensionModes } = categorizeRow(row);
  if (category === "out-of-scope") {
    return { overrides: [], extensionTokens: [] };
  }

  const target = resolveTarget(row, options);
  if (!target.slug) {
    return {
      overrides: [],
      extensionTokens: [],
      unresolved: target.candidates,
    };
  }

  const overrides = [];
  const unresolved = [];
  if (overrideModes.length) {
    const legacyKeyIndex = options?.legacyKeyIndex ?? loadLegacyKeyIndex();
    for (const m of overrideModes) {
      const uuid = findTokenUuid(legacyKeyIndex, target.slug, m);
      if (uuid) {
        overrides.push({ target: uuid, value: m.value });
      } else {
        unresolved.push(
          `${target.slug} (${m.colorScheme}${m.contrast ? `/${m.contrast}` : ""})`,
        );
      }
    }
  }

  const extensionTokens = extensionModes.map((m) => ({
    name: {
      ...target.name,
      colorScheme: m.colorScheme,
      ...(m.contrast ? { contrast: m.contrast } : {}),
    },
    $schema: COLOR_SCHEMA,
    value: m.value,
  }));

  return {
    overrides,
    extensionTokens,
    ...(unresolved.length ? { unresolved } : {}),
  };
}

/**
 * Run `emitRow` over every row, merging into one manifest's `overrides`/
 * `extensions.tokens`, sorted for deterministic output (the SDK reads with
 * `serde_json` `preserve_order`, so insertion order is what ships).
 */
export function emitManifest(rows, options) {
  const overrides = [];
  const extensionTokens = [];
  const unresolved = [];

  // Load once for the whole run — emitRow shells out to the CLI binary and
  // dumps the entire corpus, which is too expensive to repeat per row.
  const withIndex = {
    ...options,
    legacyKeyIndex: options?.legacyKeyIndex ?? loadLegacyKeyIndex(),
  };

  for (const row of rows) {
    const result = emitRow(row, withIndex);
    overrides.push(...result.overrides);
    extensionTokens.push(...result.extensionTokens);
    if (result.unresolved)
      unresolved.push({ row, candidates: result.unresolved });
  }

  overrides.sort((a, b) => a.target.localeCompare(b.target));
  extensionTokens.sort((a, b) =>
    JSON.stringify(a.name).localeCompare(JSON.stringify(b.name)),
  );

  return { overrides, extensionTokens, unresolved };
}
