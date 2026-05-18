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
 * Seed tokenBindings on component files from spec-snoop figma.json data.
 *
 * Source: ~/Spectrum/spec-snoop/data/figma.json
 * Target: packages/design-data-spec/components/*.json
 *
 * Each entry in figma.json maps a component display name to an object of
 * token-name → [{description, ...}] pairs. The description field is used as
 * the context label in the tokenBinding entry.
 *
 * Usage:
 *   node scripts/seed-token-bindings.mjs           # writes component files
 *   node scripts/seed-token-bindings.mjs --dry-run  # preview only, no writes
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { homedir } from "os";

const __dirname = dirname(fileURLToPath(import.meta.url));
const isDryRun = process.argv.includes("--dry-run");

const figmaDataPath = join(homedir(), "Spectrum/spec-snoop/data/figma.json");
const componentsDir = join(__dirname, "../components");

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

let seeded = 0;
let skipped = 0;
let warnings = 0;

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

  // Build tokenBindings array: one entry per token, using first description as context.
  const tokenBindings = [];
  for (const [tokenName, refs] of Object.entries(tokenMap)) {
    const firstRef = Array.isArray(refs) ? refs[0] : null;
    const context = firstRef?.description;
    tokenBindings.push(context ? { token: tokenName, context } : { token: tokenName });
  }

  const component = JSON.parse(readFileSync(componentPath, "utf8"));
  component.tokenBindings = tokenBindings;

  if (isDryRun) {
    console.log(
      `  DRY   ${displayName} → ${slug}.json (${tokenBindings.length} bindings)`,
    );
  } else {
    writeFileSync(componentPath, JSON.stringify(component, null, 2) + "\n");
    console.log(
      `  WROTE ${displayName} → ${slug}.json (${tokenBindings.length} bindings)`,
    );
    seeded++;
  }
}

console.log();
if (isDryRun) {
  console.log(`Dry run complete. Would seed ${Object.keys(figmaData).length - skipped} component files.`);
} else {
  console.log(`Done. Seeded ${seeded} component files. Skipped ${skipped} (no matching file).`);
}
if (warnings > 0) {
  console.log(`Warnings: ${warnings} components in figma.json had no matching component file.`);
}
