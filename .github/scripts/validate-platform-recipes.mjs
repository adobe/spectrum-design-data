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
 * `design-data validate --platform <id> --visuals-path ...` and fails when
 * - SPEC-076 reports a recipe binding that resolves on the foundation but not under
 *   that platform, or
 * - SPEC-079 reports a gap in a platform-owned recipe. SPEC-079 is a warning for one
 *   minor version, so plain `validate` stays green; this guard fails anyway so a gap
 *   cannot land during that period.
 * SPEC-080 (info: a recipe replaces a foundation recipe) is not a gap. SPEC-081 (bad
 * `componentAliases`) is an error, so `design-data:validate` already fails on it.
 * Every other diagnostic belongs to `design-data:validate` and is ignored here.
 *
 * Usage: node .github/scripts/validate-platform-recipes.mjs [--report <file.json>] [--repo-root <dir>]
 * `--report` checks one saved `validate --format json` report instead of running the CLI.
 * `--repo-root` reads `platforms/`, `packages/design-data` and `.design-data.toml` from another
 * tree (the end-to-end test uses a copy with a recipe added); the CLI is always this repo's.
 */

import { execFileSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const GUARDED_RULES = new Set(["SPEC-076", "SPEC-079"]);

export function findGaps(report) {
  return [...report.errors, ...report.warnings].filter((d) =>
    GUARDED_RULES.has(d.rule_id),
  );
}

function printGaps(label, gaps) {
  console.error(`${label}: ${gaps.length} recipe binding gap(s)`);
  for (const gap of gaps) {
    console.error(`  ${gap.file} ${gap.message}`);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}

function main() {
  const reportIndex = process.argv.indexOf("--report");
  if (reportIndex !== -1) {
    const gaps = findGaps(
      JSON.parse(readFileSync(process.argv[reportIndex + 1], "utf8")),
    );
    if (gaps.length === 0) {
      console.log("report: every recipe binding resolves");
      process.exit(0);
    }
    printGaps("report", gaps);
    process.exit(1);
  }

  const cliRoot = new URL("../..", import.meta.url).pathname;
  const rootIndex = process.argv.indexOf("--repo-root");
  const repoRoot = rootIndex === -1 ? cliRoot : process.argv[rootIndex + 1];
  const platformsDir = join(repoRoot, "platforms");
  const dataDir = join(repoRoot, "packages", "design-data");
  const cli = join(cliRoot, "sdk", "target", "debug", "design-data");

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
          // ios declares platformExtensions that extend the `contrast` mode set; without it the
          // manifest fails to apply and the recipe rules silently do nothing.
          "--mode-sets-path",
          "./mode-sets",
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
    const gaps = findGaps(report);
    if (gaps.length === 0) {
      console.log(`${id}: every recipe binding resolves`);
      continue;
    }
    failed = true;
    printGaps(id, gaps);
  }

  if (failed) {
    console.error("\nOne or more platforms drop tokens a recipe binds.");
    process.exit(1);
  }
}
