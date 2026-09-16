/**
 * Copyright 2026 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */

/**
 * Copies fetched+merged component Markdown from a scratch directory into the
 * docs/s2-docs/components tree that tools/s2-docs-to-document-blocks's
 * `transform` command reads.
 *
 * Deliberately additive, mirroring scripts/stage-docs.js's "hub wins" policy:
 * files already in docs/s2-docs/components that this run has no counterpart
 * for are left untouched. Unlike stage-docs.js, category subdirectories are
 * discovered from the source tree rather than a hardcoded list — component
 * categories (actions/containers/data-visualization/feedback/inputs/
 * navigation/status) come from each target's own `meta.category` field (see
 * `component-sync-cli.js`), not a fixed guideline-style enum, so hardcoding
 * them here would be one more list to keep in sync for no benefit.
 *
 * Usage:
 *   node scripts/stage-components.js --from ./_hub-component-fetch --to ./docs/s2-docs/components [--dry-run]
 */

import {
  readdirSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  existsSync,
} from "node:fs";
import { join } from "node:path";

function parseArgs(argv) {
  const options = {
    from: "./_hub-component-fetch",
    to: "./docs/s2-docs/components",
    dryRun: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--from") options.from = argv[index + 1];
    else if (arg === "--to") options.to = argv[index + 1];
    else if (arg === "--dry-run") options.dryRun = true;
  }

  return options;
}

function collect(from) {
  const files = [];

  if (!existsSync(from)) {
    return files;
  }

  for (const category of readdirSync(from)) {
    const dir = join(from, category);
    for (const name of readdirSync(dir)) {
      if (name.endsWith(".md")) {
        files.push({ category, name, source: join(dir, name) });
      }
    }
  }

  return files;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const files = collect(options.from);

  if (files.length === 0) {
    console.error(
      `No markdown found under ${options.from}. Run component-sync-cli.js first.`,
    );
    process.exitCode = 1;
    return;
  }

  let added = 0;
  let updated = 0;
  let unchanged = 0;

  for (const file of files) {
    const targetDir = join(options.to, file.category);
    const target = join(targetDir, file.name);
    const contents = readFileSync(file.source, "utf8");

    if (!existsSync(target)) added += 1;
    else if (readFileSync(target, "utf8") === contents) unchanged += 1;
    else updated += 1;

    if (!options.dryRun) {
      mkdirSync(targetDir, { recursive: true });
      writeFileSync(target, contents);
    }
  }

  const prefix = options.dryRun ? "[dry-run] " : "";
  console.log(`${prefix}${files.length} component page(s) -> ${options.to}`);
  console.log(
    `${prefix}added ${added}, updated ${updated}, unchanged ${unchanged}`,
  );
}

main();
