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
 * CI guard for platform recipe coverage (spectrum-design-data-p6ga.8.2).
 *
 * For every `platforms/<id>/manifest.json`, runs
 * `design-data validate --platform <id> --visuals-path ...` and fails when SPEC-076
 * reports a recipe binding that resolves on the foundation but not under that platform.
 * Every other diagnostic belongs to `design-data:validate` and is ignored here.
 *
 * Usage: node .github/scripts/validate-platform-recipes.mjs
 */

import { execFileSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

const repoRoot = new URL("../..", import.meta.url).pathname;
const platformsDir = join(repoRoot, "platforms");
const dataDir = join(repoRoot, "packages", "design-data");
const cli = join(repoRoot, "sdk", "target", "debug", "design-data");

if (!existsSync(cli)) {
  console.error(
    `design-data CLI not found at ${cli} — run \`moon run sdk:build\` first.`,
  );
  process.exit(1);
}

const ids = readdirSync(platformsDir, { withFileTypes: true })
  .filter(
    (entry) =>
      entry.isDirectory() &&
      existsSync(join(platformsDir, entry.name, "manifest.json")),
  )
  .map((entry) => entry.name)
  .sort();

let failed = false;

for (const id of ids) {
  let output;
  try {
    output = execFileSync(
      cli,
      [
        "validate",
        "./tokens",
        "--platform",
        id,
        "--components-path",
        "./components",
        "--relationships-path",
        "./relationships",
        "--visuals-path",
        "./visuals",
        "--components-report-only",
        "--exceptions-path",
        "./naming-exceptions.json",
        "--format",
        "json",
      ],
      { cwd: dataDir, encoding: "utf8", maxBuffer: 1 << 28 },
    );
  } catch (error) {
    // `validate` exits 1 on unrelated errors but still prints the JSON report.
    output = error.stdout;
    if (!output) {
      console.error(`${id}: validate failed to run: ${error.message}`);
      failed = true;
      continue;
    }
  }
  const report = JSON.parse(output);
  const gaps = [...report.errors, ...report.warnings].filter(
    (d) => d.rule_id === "SPEC-076",
  );
  if (gaps.length === 0) {
    console.log(`${id}: every recipe binding resolves`);
    continue;
  }
  failed = true;
  console.error(`${id}: ${gaps.length} recipe binding gap(s)`);
  for (const gap of gaps) {
    console.error(`  ${gap.file} ${gap.message}`);
  }
}

if (failed) {
  console.error("\nOne or more platforms drop tokens a recipe binds.");
  process.exit(1);
}
