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

import { readFileSync, existsSync } from "fs";
import { resolve, basename, dirname } from "path";
import { fileURLToPath } from "url";
import { glob } from "glob";
import test from "ava";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TOKENS_SRC = resolve(__dirname, "../../tokens/src");
const NAMES_DIR = resolve(__dirname, "../names");

const nameFiles = await glob("*.json", { cwd: NAMES_DIR, absolute: true });

test("names directory contains at least one sidecar file", (t) => {
  t.true(nameFiles.length > 0, "expected at least one names/*.json file");
});

for (const nameFile of nameFiles) {
  const filename = basename(nameFile);
  const tokenFile = resolve(TOKENS_SRC, filename);

  test(`names/${filename} has a matching tokens/src file`, (t) => {
    t.true(
      existsSync(tokenFile),
      `tokens/src/${filename} not found — remove the sidecar or add the token file`,
    );
  });

  test(`names/${filename}: all slugs resolve in tokens/src/${filename}`, (t) => {
    if (!existsSync(tokenFile)) {
      t.pass("skipped — file not found (caught by prior test)");
      return;
    }
    const nameMap = JSON.parse(readFileSync(nameFile, "utf8"));
    const tokens = JSON.parse(readFileSync(tokenFile, "utf8"));
    const tokenSlugs = new Set(Object.keys(tokens));
    const orphans = Object.keys(nameMap).filter((s) => !tokenSlugs.has(s));
    t.deepEqual(
      orphans,
      [],
      `orphan slugs in names/${filename}: ${orphans.join(", ")}`,
    );
  });

  test(`names/${filename}: no duplicate top-level slugs`, (t) => {
    const raw = readFileSync(nameFile, "utf8");
    // JSON.parse silently last-wins on duplicate keys. Compare the raw count
    // of top-level key lines (2-space-indented "key": {) to parsed count.
    // Each top-level entry in 2-space-formatted JSON appears as:
    //   ^  "<slug>": {   (exactly two leading spaces)
    const topLevelKeyRe = /^  "[^"]+":/gm;
    const rawCount = (raw.match(topLevelKeyRe) ?? []).length;
    const parsed = JSON.parse(raw);
    const parsedCount = Object.keys(parsed).length;
    t.is(
      rawCount,
      parsedCount,
      `duplicate top-level slugs detected in names/${filename} (raw=${rawCount} vs parsed=${parsedCount})`,
    );
  });

  test(`names/${filename}: every entry has a 'property' field`, (t) => {
    const nameMap = JSON.parse(readFileSync(nameFile, "utf8"));
    const missing = Object.entries(nameMap)
      .filter(([, v]) => typeof v !== "object" || !v.property)
      .map(([k]) => k);
    t.deepEqual(
      missing,
      [],
      `entries missing 'property' in names/${filename}: ${missing.join(", ")}`,
    );
  });
}
