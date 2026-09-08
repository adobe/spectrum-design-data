/*
Copyright 2026 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

/**
 * One-time backfill: adds a canonical `conceptId` UUID to every token, shared by
 * every mode row of the same design concept. See
 * docs/proposals/013-multimodal-model-spike-samples.md and bead
 * spectrum-design-data-uo7t.8 (DNA-1937).
 *
 * Grouping key per token, in priority order: `set_uuid` (the existing
 * cascade-migration bridge field, already a de-facto concept id for set-derived
 * tokens) -> `name.legacyKey` (shared by mode rows that predate/lack a set) ->
 * the token's own `uuid` (singleton concept). Where a group already has a
 * `set_uuid`, that value is *reused* as the `conceptId` (rather than minting a
 * new one), so re-keying the SDK from `set_uuid` onto `conceptId` later is a
 * no-op for every set-derived concept. A group is asserted to have at most one
 * `set_uuid` and one `legacyKey` -- see `set_uuid`/`legacyKey` 1:1 assumption
 * checked below.
 *
 * Idempotent: rows that already carry `conceptId` are left untouched, and
 * re-running after a partial write only fills in what's missing.
 *
 * Usage: node packages/design-data/scripts/backfill-concept-id.js [--dry-run]
 */

import { randomUUID } from "node:crypto";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..", "..", "..");
const tokensDir = join(repoRoot, "packages", "design-data", "tokens");

const dryRun = process.argv.includes("--dry-run");

/** Group key for a token: prefer set_uuid, then legacyKey, then its own uuid. */
function groupKey(token) {
  if (token.set_uuid) return `set:${token.set_uuid}`;
  const legacyKey = token.name?.legacyKey;
  if (legacyKey) return `legacy:${legacyKey}`;
  return `solo:${token.uuid}`;
}

function main() {
  const files = readdirSync(tokensDir).filter((f) =>
    f.endsWith(".tokens.json"),
  );

  // Pass 1: read every file, group all tokens across the whole corpus (a
  // legacyKey/set_uuid group can span files), and collect existing conceptIds
  // plus every legacy/set key's set_uuid so we can catch a 1:1 violation before
  // writing anything.
  const filesData = files.map((file) => {
    const filePath = join(tokensDir, file);
    return {
      file,
      filePath,
      tokens: JSON.parse(readFileSync(filePath, "utf8")),
    };
  });

  const groups = new Map(); // groupKey -> { conceptId, setUuid, legacyKeys: Set }
  for (const { tokens } of filesData) {
    for (const token of tokens) {
      const key = groupKey(token);
      let group = groups.get(key);
      if (!group) {
        group = { conceptId: null, setUuid: null, legacyKeys: new Set() };
        groups.set(key, group);
      }
      if (token.conceptId && !group.conceptId)
        group.conceptId = token.conceptId;
      if (token.set_uuid) group.setUuid = token.set_uuid;
      if (token.name?.legacyKey) group.legacyKeys.add(token.name.legacyKey);
    }
  }

  // Guard the 1:1 set_uuid<->legacyKey assumption the grouping strategy relies
  // on: a `set:` group must not span more than one legacyKey (a `legacy:` group
  // can't span set_uuids by construction, since set_uuid takes priority).
  for (const [key, group] of groups) {
    if (key.startsWith("set:") && group.legacyKeys.size > 1) {
      throw new Error(
        `set_uuid ${key.slice(4)} spans multiple legacyKeys (${[...group.legacyKeys].join(", ")}) -- grouping assumption violated, backfill aborted.`,
      );
    }
  }

  // Assign a conceptId per group: reuse an existing one if any row already has
  // one, else reuse the group's set_uuid (so conceptId is a strict superset of
  // set_uuid's values), else mint a fresh UUID.
  for (const group of groups.values()) {
    if (!group.conceptId) group.conceptId = group.setUuid ?? randomUUID();
  }

  // Pass 2: write conceptId onto every token that lacks one.
  let tokensChanged = 0;
  const filesChanged = [];
  for (const { filePath, tokens } of filesData) {
    let changedInFile = 0;
    for (const token of tokens) {
      if (token.conceptId) continue;
      token.conceptId = groups.get(groupKey(token)).conceptId;
      changedInFile++;
    }
    if (changedInFile > 0) {
      tokensChanged += changedInFile;
      filesChanged.push(filePath);
      if (!dryRun) {
        writeFileSync(filePath, JSON.stringify(tokens, null, 2) + "\n");
      }
    }
  }

  console.log(`Concept groups:   ${groups.size}`);
  console.log(`Tokens backfilled: ${tokensChanged}`);
  console.log(`Files touched:     ${filesChanged.length}`);
  if (dryRun) {
    console.log("\n(dry run — no files written)");
  } else if (filesChanged.length > 0) {
    console.log(
      "\nRun `npx prettier --write <files>` on the touched files to normalize formatting.",
    );
  }
}

main();
