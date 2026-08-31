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
 * Seed Component/Token Relationship (CTR) entries from spec-snoop figma.json data.
 *
 * Source: ~/Spectrum/spec-snoop/data/figma.json
 * Target: packages/design-data/relationships/*.json
 *
 * Each entry in figma.json maps a component display name to an object of
 * token-name → [{description, ...}] pairs. The description field is used as
 * the CTR's context label. Token names are resolved to uuids against
 * packages/design-data/tokens/*.tokens.json (see migrate-to-relationships.mjs,
 * which performed the same tokenBindings → CTR conversion for the existing corpus).
 *
 * Usage:
 *   node scripts/seed-token-bindings.mjs           # writes relationships files
 *   node scripts/seed-token-bindings.mjs --dry-run  # preview only, no writes
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync } from "fs";
import { join, dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { homedir } from "os";
import { serialize } from "../../../tools/token-mapping-analyzer/src/decomposer.js";
import { loadRegistries } from "../../../tools/token-mapping-analyzer/src/registry-index.js";
import { resolveReplacementUuid } from "../../../tools/token-mapping-analyzer/src/replacement-resolver.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const isDryRun = process.argv.includes("--dry-run");

const figmaDataPath = join(homedir(), "Spectrum/spec-snoop/data/figma.json");
const repoRoot = resolve(__dirname, "../../..");
const componentsDir = join(__dirname, "../../design-data/components");
const tokensDir = join(repoRoot, "packages/design-data/tokens");
const relationshipsDir = join(repoRoot, "packages/design-data/relationships");

if (!existsSync(figmaDataPath)) {
  console.error(`Error: spec-snoop data not found at ${figmaDataPath}`);
  process.exit(1);
}

const figmaData = JSON.parse(readFileSync(figmaDataPath, "utf8"));

/**
 * Convert a display name like "Action bar" to a kebab-case slug "action-bar".
 */
function toKebabCase(displayName) {
  return displayName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Legacy flat key for a token's `name` field, keyed for lookup below. */
function legacyKeyFor(name, registry) {
  if (typeof name === "string") return name;
  if (!name || typeof name !== "object") return null;
  if (typeof name.legacyKey === "string") return name.legacyKey;
  return serialize(name, registry.tokenNameMap, registry.serializationOrder);
}

/** Every token across tokens/*.tokens.json, keyed by its computed legacy flat key. */
function buildFlatKeyIndex(registry) {
  const index = new Map();
  const uuidToToken = new Map();
  for (const file of readdirSync(tokensDir).filter((f) => f.endsWith(".tokens.json"))) {
    const tokens = JSON.parse(readFileSync(join(tokensDir, file), "utf8"));
    for (const token of tokens) {
      if (token.uuid) uuidToToken.set(token.uuid, token);
      const key = legacyKeyFor(token.name, registry);
      if (!key) continue;
      if (!index.has(key)) index.set(key, []);
      index.get(key).push(token);
    }
  }
  return { index, uuidToToken };
}

const registry = loadRegistries();
const { index: flatKeyIndex, uuidToToken } = buildFlatKeyIndex(registry);

let seeded = 0;
let skipped = 0;
let warnings = 0;
let unresolved = 0;

if (!isDryRun) mkdirSync(relationshipsDir, { recursive: true });

for (const [displayName, references] of Object.entries(figmaData)) {
  if (!references || typeof references !== "object") continue;
  // figma.json shape: { "status": "done", "references": { tokenName: [{description, ...}] } }
  const tokenMap = references.references ?? references;
  if (!tokenMap || typeof tokenMap !== "object") continue;

  const slug = toKebabCase(displayName);
  const componentPath = join(componentsDir, `${slug}.json`);

  if (!existsSync(componentPath)) {
    console.warn(`  SKIP  ${displayName} → ${slug}.json (file not found)`);
    skipped++;
    warnings++;
    continue;
  }

  // Build CTRs: one entry per token, using the first description as context.
  const ctrs = [];
  for (const [tokenName, refs] of Object.entries(tokenMap)) {
    const matches = flatKeyIndex.get(tokenName);
    if (!matches) {
      unresolved++;
      continue;
    }
    const firstRef = Array.isArray(refs) ? refs[0] : null;
    const context = firstRef?.description;
    for (const token of matches) {
      const property = typeof token.name === "object" ? token.name.property : undefined;
      ctrs.push({
        scope: { component: slug, ...(property !== undefined ? { property } : {}) },
        ...(context ? { context } : {}),
        // Follow replacedBy so re-seeding from the Figma spec never pins a
        // deprecated token's uuid when a live semantic replacement exists.
        $ref: resolveReplacementUuid(token, uuidToToken),
      });
    }
  }

  const relationshipPath = join(relationshipsDir, `${slug}.json`);
  const existing = existsSync(relationshipPath)
    ? JSON.parse(readFileSync(relationshipPath, "utf8"))
    : [];
  const merged = existing.concat(ctrs);

  if (isDryRun) {
    console.log(`  DRY   ${displayName} → ${slug}.json (${ctrs.length} CTRs)`);
  } else {
    writeFileSync(relationshipPath, JSON.stringify(merged, null, 2) + "\n");
    console.log(`  WROTE ${displayName} → ${slug}.json (${ctrs.length} CTRs)`);
    seeded++;
  }
}

console.log();
if (isDryRun) {
  console.log(`Dry run complete. Would seed ${Object.keys(figmaData).length - skipped} relationship files.`);
} else {
  console.log(`Done. Seeded ${seeded} relationship files. Skipped ${skipped} (no matching component file).`);
}
if (warnings > 0) {
  console.log(`Warnings: ${warnings} components in figma.json had no matching component file.`);
}
if (unresolved > 0) {
  console.log(`Unresolved: ${unresolved} token names had no match in packages/design-data/tokens.`);
}
