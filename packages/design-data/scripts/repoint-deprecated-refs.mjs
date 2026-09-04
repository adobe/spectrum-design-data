// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0

// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

/**
 * One-time pass: re-points relationship-only CTRs (`{ scope, context?, $ref }`,
 * no `uuid`/`legacyKey`) whose `$ref` resolves to a deprecated token, onto the
 * live token its `lifecycle.replacedBy` chain points to.
 *
 * Scoped to relationship-only entries on purpose: value-owning CTRs (`uuid` +
 * `legacyKey` present) are themselves the deprecated token record and feed
 * `packages/tokens/src/` via sdk/core/src/legacy.rs's `ctr_to_legacy_token` —
 * touching them would change the published @adobe/spectrum-tokens package.
 * Relationship-only entries carry neither field, so `ctr_to_legacy_token`
 * returns `None` for them and they never reach legacy output; re-pointing
 * their `$ref` is safe. See the PR description for the verified partition
 * (uuid and legacyKey always co-occur, 0 mismatches across the corpus).
 *
 * Entries with no `replacedBy`, or an array-form `replacedBy` (ambiguous —
 * multiple candidate replacements), are left untouched; SPEC-058 flags them
 * as warnings for manual follow-up.
 *
 * Run `prettier --write` on touched files afterward (same convention as
 * migrate-to-relationships.mjs) — this repo's default prettier config keeps
 * short arrays like `"state": ["disabled"]` inline, which plain
 * `JSON.stringify` does not, so skipping this step produces a noisy diff.
 *
 * Usage: node repoint-deprecated-refs.mjs [--dry-run]
 */

import { readFileSync, readdirSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { resolveReplacementUuid } from "../../../tools/token-mapping-analyzer/src/replacement-resolver.js";
import { buildUuidToTokenIndex } from "../../../tools/token-mapping-analyzer/src/registry-index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TOKENS_DIR = join(__dirname, "..", "tokens");
const RELATIONSHIPS_DIR = join(__dirname, "..", "relationships");
const isDryRun = process.argv.includes("--dry-run");

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function jsonFiles(dir) {
  return readdirSync(dir).filter((f) => f.endsWith(".json"));
}

function isRelationshipOnly(entry) {
  return entry?.uuid === undefined && entry?.legacyKey === undefined && entry?.$ref !== undefined;
}

function main() {
  const uuidToToken = buildUuidToTokenIndex(TOKENS_DIR, RELATIONSHIPS_DIR);
  let repointed = 0;
  let noReplacedBy = 0;
  let ambiguous = 0;

  for (const file of jsonFiles(RELATIONSHIPS_DIR)) {
    const filePath = join(RELATIONSHIPS_DIR, file);
    const entries = readJson(filePath);
    let changed = false;

    for (const entry of entries) {
      if (!isRelationshipOnly(entry)) continue;
      const target = uuidToToken.get(entry.$ref);
      const deprecated = Boolean(target?.lifecycle?.deprecatedIn);
      if (!deprecated) continue;

      const replacedBy = target.lifecycle.replacedBy;
      if (replacedBy === undefined || replacedBy === null || replacedBy === "") {
        noReplacedBy++;
        continue;
      }
      if (Array.isArray(replacedBy)) {
        ambiguous++;
        continue;
      }

      const resolved = resolveReplacementUuid(target, uuidToToken);
      if (resolved !== entry.$ref) {
        entry.$ref = resolved;
        changed = true;
        repointed++;
      }
    }

    if (changed && !isDryRun) {
      writeFileSync(filePath, JSON.stringify(entries, null, 2) + "\n");
    }
  }

  console.log(
    `${isDryRun ? "[dry run] " : ""}Re-pointed ${repointed} refs. ` +
      `Left ${noReplacedBy} unmapped (no replacedBy) and ${ambiguous} ambiguous (array replacedBy) for manual follow-up.`,
  );
}

main();
