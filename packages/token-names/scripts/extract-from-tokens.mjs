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
 * One-shot migration script: lifts inline `name` objects out of
 * packages/tokens/src/*.json and writes them to packages/token-names/names/*.json.
 *
 * Usage:
 *   node scripts/extract-from-tokens.mjs            # dry-run (default)
 *   node scripts/extract-from-tokens.mjs --write    # apply changes to disk
 *
 * Safe to re-run: tokens that already lack a `name` field are untouched;
 * sidecar entries already present in names/*.json are not duplicated.
 *
 * After running with --write, this script can be deleted — it is a one-time
 * migration tool.
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve, basename, dirname } from "path";
import { fileURLToPath } from "url";
import { glob } from "glob";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TOKENS_SRC = resolve(__dirname, "../../tokens/src");
const NAMES_DIR = resolve(__dirname, "../names");
const WRITE = process.argv.includes("--write");

const tokenFiles = await glob("*.json", { cwd: TOKENS_SRC, absolute: true });

let totalExtracted = 0;
let totalFiles = 0;

for (const tokenFile of tokenFiles.sort()) {
  const filename = basename(tokenFile);
  const sidecarFile = resolve(NAMES_DIR, filename);

  const tokens = JSON.parse(readFileSync(tokenFile, "utf8"));

  // Load existing sidecar (if any) so we can merge without overwriting
  const existingSidecar = existsSync(sidecarFile)
    ? JSON.parse(readFileSync(sidecarFile, "utf8"))
    : {};

  const newNames = {};
  const strippedTokens = {};
  let extracted = 0;

  for (const [key, token] of Object.entries(tokens)) {
    if (token && typeof token === "object" && "name" in token) {
      newNames[key] = token.name;
      // eslint-disable-next-line no-unused-vars
      const { name: _name, ...rest } = token;
      strippedTokens[key] = rest;
      extracted++;
    } else {
      strippedTokens[key] = token;
    }
  }

  if (extracted === 0) {
    console.log(`${filename}: no name objects — skipped`);
    continue;
  }

  const mergedSidecar = { ...existingSidecar, ...newNames };
  totalExtracted += extracted;
  totalFiles++;

  console.log(`${filename}: ${extracted} name objects → names/${filename}`);

  if (WRITE) {
    writeFileSync(
      sidecarFile,
      JSON.stringify(mergedSidecar, null, 2) + "\n",
      "utf8"
    );
    writeFileSync(
      tokenFile,
      JSON.stringify(strippedTokens, null, 2) + "\n",
      "utf8"
    );
  }
}

console.log(
  `\nTotal: ${totalExtracted} names extracted from ${totalFiles} files.`
);
if (!WRITE) {
  console.log("Dry-run — pass --write to apply changes.");
}
