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
 * Asserts that every slug in names/*.json corresponds to an existing token in
 * packages/tokens/src/. Exits with code 1 if orphan entries are found.
 *
 * Run via `moon run token-names:check` or `node scripts/check-coverage.mjs`.
 */

import { readFileSync, existsSync } from "fs";
import { resolve, basename, dirname } from "path";
import { fileURLToPath } from "url";
import { glob } from "glob";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TOKENS_SRC = resolve(__dirname, "../../tokens/src");
const NAMES_DIR = resolve(__dirname, "../names");

const nameFiles = await glob("*.json", { cwd: NAMES_DIR, absolute: true });

let orphans = 0;
let checked = 0;

for (const nameFile of nameFiles.sort()) {
  const filename = basename(nameFile);
  const tokenFile = resolve(TOKENS_SRC, filename);

  if (!existsSync(tokenFile)) {
    console.error(
      `ERROR: names/${filename} has no corresponding tokens/src/${filename}`
    );
    orphans++;
    continue;
  }

  const nameMap = JSON.parse(readFileSync(nameFile, "utf8"));
  const tokens = JSON.parse(readFileSync(tokenFile, "utf8"));
  const tokenSlugs = new Set(Object.keys(tokens));

  for (const slug of Object.keys(nameMap)) {
    checked++;
    if (!tokenSlugs.has(slug)) {
      console.error(
        `ORPHAN: names/${filename}["${slug}"] has no matching token in tokens/src/${filename}`
      );
      orphans++;
    }
  }
}

if (orphans > 0) {
  console.error(`\n${orphans} orphan(s) found. Remove or update stale entries.`);
  process.exit(1);
} else {
  console.log(`OK: ${checked} name entries checked — all slugs resolve.`);
}
