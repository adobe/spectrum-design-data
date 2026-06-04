#!/usr/bin/env node
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
 * Fix stale `replaced_by` (and `$ref`) UUIDs in cascade token files.
 *
 * Background:
 *   During the legacy→cascade migration, each legacy scale-set token was split into
 *   N separate cascade tokens (one per scale: desktop, mobile). The scale-set wrapper
 *   UUID was demoted to a `set_uuid` field on each resulting cascade token; no cascade
 *   token inherited the wrapper UUID itself. The `replaced_by` (and often `$ref`) fields
 *   on deprecated alias tokens were copied verbatim from legacy and still hold those
 *   now-unreachable wrapper UUIDs — causing SPEC-010 failures.
 *
 * Fix strategy:
 *   For each stale `replaced_by` UUID:
 *     1. Look up cascade tokens where `set_uuid == staleUUID` → the replacement group.
 *     2a. If the deprecated token has `name.scale` → pick the group member with the
 *         matching scale → update `replaced_by` (and `$ref` if equally stale) to that
 *         single cascade UUID.
 *     2b. If the deprecated token has no `name.scale` → it was a pre-split single-value
 *         token; set `replaced_by` to an array of all group UUIDs (sorted by scale for
 *         determinism). SPEC-011 requires `deprecated_comment` when an array is used —
 *         all affected tokens already carry one.
 *
 * Usage (from repo root):
 *   node packages/design-data/scripts/fix-replaced-by.mjs           # apply fix
 *   node packages/design-data/scripts/fix-replaced-by.mjs --dry-run  # preview only
 */

import { readFileSync, writeFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const isDryRun = process.argv.includes("--dry-run");

const tokensDir = join(__dirname, "../tokens");

// ── Load all cascade token files ──────────────────────────────────────────────

const tokenFiles = readdirSync(tokensDir)
  .filter((f) => f.endsWith(".tokens.json"))
  .sort();

/** @type {Map<string, {uuid: string, scale: string|undefined, token: object}[]>} */
const setUUIDIndex = new Map(); // set_uuid → [{uuid, scale, token}]

/** @type {Set<string>} */
const cascadeUUIDs = new Set();

/** @type {Map<string, object[]>} */
const fileData = new Map(); // filename → token array

for (const filename of tokenFiles) {
  const filePath = join(tokensDir, filename);
  const tokens = JSON.parse(readFileSync(filePath, "utf8"));
  fileData.set(filename, tokens);
  for (const token of tokens) {
    if (token.uuid) cascadeUUIDs.add(token.uuid);
  }
}

// Build set_uuid index after all UUIDs are collected (so cross-file refs are known)
for (const [, tokens] of fileData) {
  for (const token of tokens) {
    if (!token.set_uuid) continue;
    if (!setUUIDIndex.has(token.set_uuid)) setUUIDIndex.set(token.set_uuid, []);
    setUUIDIndex.get(token.set_uuid).push({
      uuid: token.uuid,
      scale: token.name?.scale,
      token,
    });
  }
}

// ── Sort set members consistently (desktop < mobile < undefined) ──────────────

const SCALE_ORDER = ["desktop", "mobile"];
const scaleRank = (s) => {
  const i = SCALE_ORDER.indexOf(s);
  return i === -1 ? SCALE_ORDER.length : i;
};
for (const members of setUUIDIndex.values()) {
  members.sort((a, b) => scaleRank(a.scale) - scaleRank(b.scale));
}

// ── Find and fix stale tokens ─────────────────────────────────────────────────

const dirtyFiles = new Set();
let fixedCount = 0;
let warnCount = 0;

for (const [filename, tokens] of fileData) {
  for (const token of tokens) {
    const staleUUID =
      typeof token.replaced_by === "string" &&
      !cascadeUUIDs.has(token.replaced_by)
        ? token.replaced_by
        : null;

    if (!staleUUID) continue;

    const candidates = setUUIDIndex.get(staleUUID);

    if (!candidates || candidates.length === 0) {
      console.warn(
        `  WARN  [${filename}] token ${token.uuid}: no set_uuid match for ${staleUUID}`,
      );
      warnCount++;
      continue;
    }

    const tokenScale = token.name?.scale;
    let newValue;

    if (tokenScale) {
      // Deprecated token is scale-specific → pick the matching scale variant.
      const match = candidates.find((c) => c.scale === tokenScale);
      if (!match) {
        console.warn(
          `  WARN  [${filename}] token ${token.uuid}: no candidate with scale="${tokenScale}" for stale ${staleUUID} (candidates: ${candidates.map((c) => c.scale).join(", ")})`,
        );
        warnCount++;
        continue;
      }
      newValue = match.uuid;
    } else {
      // Deprecated token has no scale → was a pre-split single-value token.
      // Point replaced_by at all scale variants (array form, sorted).
      newValue =
        candidates.length === 1
          ? candidates[0].uuid
          : candidates.map((c) => c.uuid);
    }

    if (isDryRun) {
      console.log(
        `  DRY   [${filename}] ${JSON.stringify(token.name)} ${token.uuid}: replaced_by ${staleUUID} → ${JSON.stringify(newValue)}`,
      );
    } else {
      token.replaced_by = newValue;
      // Fix $ref too when it holds the same stale UUID (it's the alias target).
      if (token["$ref"] === staleUUID) {
        // For array newValue (no-scale case), the $ref should point to a single token.
        // Use the first (desktop) variant as the canonical alias target.
        token["$ref"] = Array.isArray(newValue) ? newValue[0] : newValue;
      }
    }

    dirtyFiles.add(filename);
    fixedCount++;
  }
}

// ── Write dirty files ─────────────────────────────────────────────────────────

if (!isDryRun) {
  for (const filename of dirtyFiles) {
    const filePath = join(tokensDir, filename);
    writeFileSync(filePath, JSON.stringify(fileData.get(filename), null, 2) + "\n");
    console.log(`  WROTE ${filename}`);
  }
}

// ── Summary ───────────────────────────────────────────────────────────────────

console.log();
if (isDryRun) {
  console.log(
    `Dry run complete. Would fix ${fixedCount} tokens across ${dirtyFiles.size} files.`,
  );
} else {
  console.log(
    `Done. Fixed ${fixedCount} tokens across ${dirtyFiles.size} files.`,
  );
}
if (warnCount > 0) {
  console.log(`Warnings: ${warnCount} tokens could not be resolved automatically.`);
  process.exitCode = 1;
}
