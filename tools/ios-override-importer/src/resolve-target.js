// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0

// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const REPO_ROOT = fileURLToPath(new URL("../../../", import.meta.url));

// Color-palette slugs (`blue-1000`, `static-blue-1000`) aren't decomposable by
// the Rust CLI's `decompose-legacy-name` (naming::parse_legacy_name only knows
// variant/component/property/state, not the colorFamily+scaleIndex path — see
// sdk/core/src/naming.rs module doc). Recognize them directly instead of
// guessing: any slug ending in `-<digits>` whose prefix is a known color family.
function loadColorFamilies() {
  const path = `${REPO_ROOT}packages/design-data/registry/color-families.json`;
  const data = JSON.parse(readFileSync(path, "utf8"));
  return new Set(data.values.map((v) => v.id));
}

const PALETTE_RE = /^(.+)-(\d+)$/;

/** `{colorFamily, scaleIndex}` if `slug` is a recognized palette slug, else null. */
export function matchPaletteSlug(slug, colorFamilies) {
  const m = PALETTE_RE.exec(slug);
  if (!m) return null;
  const [, family, index] = m;
  if (!colorFamilies.has(family)) return null;
  return { colorFamily: family, scaleIndex: Number(index) };
}

/**
 * Default oracle: shells out to `design-data decompose-legacy-name` (added to
 * sdk/cli for this importer — reuses naming::parse_legacy_name/roundtrips
 * rather than reimplementing legacy-slug decomposition in JS). Returns the
 * parsed NameObject, or null if the slug doesn't roundtrip (untrustworthy).
 */
export function decomposeViaCli(
  slug,
  binPath = `${REPO_ROOT}sdk/target/debug/design-data`,
) {
  const out = execFileSync(binPath, ["decompose-legacy-name", slug], {
    encoding: "utf8",
  });
  const parsed = JSON.parse(out);
  if (!parsed.roundtrips) return null;
  delete parsed.roundtrips;
  return parsed;
}

/**
 * Resolve one CSV row's target slug to foundation name fields, trying the
 * token's own name first, then each entry in its `Aliases` chain in order.
 * `decompose` is injectable (tests use a fake; the CLI is the real default)
 * per the plan's ladder: palette slugs resolve locally, everything else
 * defers to the Rust decomposition the SDK already has.
 *
 * Returns `{ slug, name }` for the first candidate that resolves, or
 * `{ slug: null, candidates }` if none did (destined for the gap report).
 */
export function resolveTarget(
  row,
  { decompose = decomposeViaCli, colorFamilies } = {},
) {
  const families = colorFamilies ?? loadColorFamilies();
  const candidates = [row["Token Name"], ...splitAliases(row.Aliases)].filter(
    Boolean,
  );

  for (const slug of candidates) {
    const palette = matchPaletteSlug(slug, families);
    if (palette) return { slug, name: palette };

    const decomposed = decompose(slug);
    if (decomposed) return { slug, name: decomposed };
  }

  return { slug: null, candidates };
}

function splitAliases(aliases) {
  if (!aliases) return [];
  return aliases
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}
