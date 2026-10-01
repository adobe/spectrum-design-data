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
 * CI guard for incubating platform manifests (spectrum-design-data-h890.27.12).
 *
 * For every `platforms/<id>/manifest.json` directory, runs the same
 * `--platform <id> validate-manifest` check a consumer would run locally, then
 * prints `platform show <id>` for advisory foundation-drift visibility (drift
 * is informational only — see `run_platform_show` in sdk/cli/src/main.rs — so
 * it never fails the build; only a Layer 1/apply-time validation failure does).
 *
 * Fails (non-zero exit) the moment any platform fails validation, and prints
 * every id's result before exiting so a PR sees every failing platform at
 * once instead of stopping at the first one.
 *
 * Usage: node .github/scripts/validate-platforms.mjs
 */

import { execFileSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

const repoRoot = new URL("../..", import.meta.url).pathname;
const platformsDir = join(repoRoot, "platforms");
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

if (ids.length === 0) {
  console.log(
    "No platforms/<id>/manifest.json entries found — nothing to validate.",
  );
  process.exit(0);
}

let failed = false;

for (const id of ids) {
  console.log(`\n=== platform: ${id} ===`);
  try {
    // --platform must follow the subcommand — see the CLI's own --help note
    // on this ordering limitation (top-level Cli flattens an optional TUI
    // positional, so a leading --platform can be misparsed).
    execFileSync(cli, ["validate-manifest", "--platform", id], {
      cwd: repoRoot,
      stdio: "inherit",
    });
  } catch {
    failed = true;
  }
  // Advisory only — never affects exit status.
  try {
    execFileSync(cli, ["platform", "show", id], {
      cwd: repoRoot,
      stdio: "inherit",
    });
  } catch {
    // `platform show` itself failing (e.g. unknown id) would already have
    // been caught by validate-manifest above; ignore here.
  }
}

if (failed) {
  console.error(
    "\nOne or more platform manifests failed validation — see above.",
  );
  process.exit(1);
}

console.log(
  `\nAll ${ids.length} platform manifest(s) validated: ${ids.join(", ")}`,
);
