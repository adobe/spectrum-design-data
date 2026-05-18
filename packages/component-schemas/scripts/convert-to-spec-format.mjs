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
 * One-time conversion script: old component-schemas format → new design-data-spec format.
 *
 * Reads packages/component-schemas/schemas/components/*.json (old format)
 * and writes packages/design-data-spec/components/{name}.json (new format).
 *
 * Skips button.json (hand-crafted in Phase 6.4).
 * Run: node packages/component-schemas/scripts/convert-to-spec-format.mjs
 */

import { readFile, writeFile, mkdir } from "fs/promises";
import { glob } from "glob";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "../../..");
const sourceDir = resolve(repoRoot, "packages/component-schemas/schemas/components");
const destDir = resolve(repoRoot, "packages/design-data-spec/components");

const SKIP = new Set(["button.json"]);

// States that are driven by runtime interaction (vs persistent prop).
const INTERACTION_STATES = new Set([
  "hover",
  "focus",
  "focus-visible",
  "active",
  "pressed",
  "down",
  "keyboard-focus",
  "dragging",
]);

function toKebabCase(str) {
  return str.trim().toLowerCase().replace(/\s+/g, "-");
}

function getSlugFromDocumentationUrl(url) {
  return url
    .split("/")
    .filter((p) => p !== "")
    .pop();
}

function convertStateEnum(stateEnum) {
  if (!Array.isArray(stateEnum)) return [];
  return stateEnum
    .filter((v) => v !== "default")
    .map((v) => {
      const name = toKebabCase(v);
      const trigger = INTERACTION_STATES.has(name) ? "interaction" : "prop";
      return { name, trigger };
    });
}

async function convertFile(srcPath, fileName) {
  const raw = await readFile(srcPath, "utf8");
  const old = JSON.parse(raw);

  const name = getSlugFromDocumentationUrl(old.meta.documentationUrl);
  const displayName = old.title;

  // properties → options (remove state; keep everything else)
  const { state: stateProperty, ...remainingProperties } = old.properties ?? {};
  const options = Object.keys(remainingProperties).length > 0 ? remainingProperties : undefined;

  // Derive states from old state.enum
  const stateList = convertStateEnum(stateProperty?.enum);
  const states = stateList.length > 0 ? stateList : undefined;

  // Build new $id and $schema
  const newId = (old.$id ?? "").replace(
    "https://opensource.adobe.com/spectrum-design-data/schemas/components/",
    "https://opensource.adobe.com/spectrum-design-data/schemas/v0/components/",
  );

  const newDoc = {
    $schema:
      "https://opensource.adobe.com/spectrum-design-data/schemas/v0/component.schema.json",
    $id: newId,
    specVersion: "1.0.0-draft",
    name,
    displayName,
    ...(old.description ? { description: old.description } : {}),
    meta: old.meta,
    ...(options ? { options } : {}),
    ...(states ? { states } : {}),
    lifecycle: { introduced: "1.0.0-draft" },
  };

  return newDoc;
}

async function main() {
  await mkdir(destDir, { recursive: true });

  const srcFiles = (await glob(`${sourceDir}/*.json`)).sort();
  let converted = 0;
  let skipped = 0;

  for (const srcPath of srcFiles) {
    const fileName = srcPath.split("/").pop();

    if (SKIP.has(fileName)) {
      console.log(`  skip  ${fileName} (hand-crafted)`);
      skipped++;
      continue;
    }

    const newDoc = await convertFile(srcPath, fileName);
    const destPath = resolve(destDir, fileName);
    await writeFile(destPath, JSON.stringify(newDoc, null, 2) + "\n", "utf8");
    console.log(`  write ${fileName} → ${newDoc.name}`);
    converted++;
  }

  console.log(`\nDone: ${converted} converted, ${skipped} skipped.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
