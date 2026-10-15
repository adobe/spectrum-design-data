// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

/**
 * Sync the authoritative token-type schemas (`schemas/token-types/` and
 * `schemas/token-file.json`) and `packages/design-data/naming-exceptions.json`
 * to the generated copies that legacy consumers still read:
 *
 *   - packages/tokens/schemas/ and packages/tokens/naming-exceptions.json
 *     (published in @adobe/spectrum-tokens)
 *   - docs/site/public/schemas/ (served at the schema `$id` URLs)
 *
 * Usage: node scripts/sync-token-schemas.mjs [--check]
 * `--check` writes nothing and exits 1 when any copy is stale.
 */

import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const specSchemas = join(root, "packages/design-data-spec/schemas");
const exceptionsSource = join(root, "packages/design-data/naming-exceptions.json");

const schemaTargets = [
  join(root, "packages/tokens/schemas"),
  join(root, "docs/site/public/schemas"),
];
const exceptionsTargets = [join(root, "packages/tokens/naming-exceptions.json")];

const check = process.argv.includes("--check");

const listJson = (dir) =>
  existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith(".json")).sort() : [];
const same = (a, b) => existsSync(b) && readFileSync(a, "utf8") === readFileSync(b, "utf8");

const stale = [];

for (const target of schemaTargets) {
  const sourceTypes = join(specSchemas, "token-types");
  const targetTypes = join(target, "token-types");
  for (const f of listJson(sourceTypes)) {
    if (!same(join(sourceTypes, f), join(targetTypes, f))) stale.push(join(targetTypes, f));
  }
  for (const f of listJson(targetTypes)) {
    if (!existsSync(join(sourceTypes, f))) stale.push(join(targetTypes, f));
  }
  const tokenFile = join(target, "token-file.json");
  if (!same(join(specSchemas, "token-file.json"), tokenFile)) stale.push(tokenFile);
}

for (const target of exceptionsTargets) {
  if (!same(exceptionsSource, target)) stale.push(target);
}

if (check) {
  if (stale.length > 0) {
    console.error("Generated legacy asset copies are out of date:");
    for (const f of stale) console.error(`  ${f.replace(`${root}/`, "")}`);
    console.error("Run: node packages/design-data-spec/scripts/sync-token-schemas.mjs");
    process.exit(1);
  }
  console.log("Generated token schema and naming-exceptions copies are up to date.");
  process.exit(0);
}

for (const target of schemaTargets) {
  rmSync(join(target, "token-types"), { recursive: true, force: true });
  mkdirSync(target, { recursive: true });
  cpSync(join(specSchemas, "token-types"), join(target, "token-types"), { recursive: true });
  cpSync(join(specSchemas, "token-file.json"), join(target, "token-file.json"));
}
for (const target of exceptionsTargets) {
  cpSync(exceptionsSource, target);
}
console.log(`Synced ${stale.length} stale file(s).`);
