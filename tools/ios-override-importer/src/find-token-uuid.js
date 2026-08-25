// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0

// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const REPO_ROOT = fileURLToPath(new URL("../../../", import.meta.url));
const TOKENS_DIR = `${REPO_ROOT}packages/design-data/tokens`;
const CLI_BIN = `${REPO_ROOT}sdk/target/debug/design-data`;

// ponytail: a true-value-change override must target one specific colorScheme
// member of a color-set group, and the manifest's bare-slug/query-target
// resolution can't do that — `query::ALLOWED_KEYS` (sdk/core/src/query.rs)
// doesn't include colorFamily/scaleIndex, and the legacy-name index collapses
// all colorScheme members of a group to one arbitrary uuid (graph.rs:967-978).
// A uuid target resolves to exactly one record, so we look the real uuid up
// directly from the foundation corpus instead.
//
// Matching by structurally-decomposed name fields (parse_legacy_name) was
// tried first and under-resolved badly: that reverse decomposition is coarser
// than the full taxonomy some real tokens use (colorRole/object/etc.), so a
// self-consistent-but-wrong decomposition can pass `roundtrips=true` and
// still not match the real record's fields. Matching directly on the
// FORWARD-computed `legacyKey` string (`naming::extract_legacy_key`, via the
// `dump-legacy-keys` CLI command) against the CSV-resolved slug sidesteps
// that entirely — it's the exact same string the CSV/Aliases column already
// contains.
export function loadLegacyKeyIndex(tokensDir = TOKENS_DIR, binPath = CLI_BIN) {
  if (!existsSync(binPath)) {
    throw new Error(
      `design-data CLI binary not found at ${binPath} — run \`moon run sdk:build\` first.`,
    );
  }
  const out = execFileSync(binPath, ["dump-legacy-keys", tokensDir], {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  const index = new Map();
  for (const e of JSON.parse(out)) {
    index.set(
      indexKey(e.legacyKey, e.colorScheme, e.contrast, e.scale),
      e.uuid,
    );
  }
  return index;
}

function indexKey(legacyKey, colorScheme, contrast, scale) {
  return `${legacyKey}::${colorScheme ?? ""}::${contrast ?? ""}::${scale ?? ""}`;
}

/**
 * Look up the uuid of the foundation token whose computed legacy key is
 * `slug`, at the given `{colorScheme, contrast?, scale?}` mode. `scale`
 * disambiguates scale-set members that share a legacy key (e.g.
 * `font-size-100` has both a `mobile` and `desktop` uuid) — color modes
 * don't set it, so they fall back to matching the null/null scale entry as
 * before. Returns null if no match exists — callers should treat that as
 * unresolved, not guess.
 */
export function findTokenUuid(index, slug, mode) {
  return (
    index.get(indexKey(slug, mode.colorScheme, mode.contrast, mode.scale)) ??
    null
  );
}
