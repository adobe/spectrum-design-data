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
 * Reconciles category migrations by component filename. Components omitted
 * from this run are left untouched. Unlike stage-docs.js, subdirectories are
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
  unlinkSync,
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

  for (const category of readdirSync(from, { withFileTypes: true })) {
    if (!category.isDirectory()) continue;
    const dir = join(from, category.name);
    for (const file of readdirSync(dir, { withFileTypes: true })) {
      if (file.isFile() && file.name.endsWith(".md")) {
        files.push({
          category: category.name,
          name: file.name,
          source: join(dir, file.name),
        });
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
  let removed = 0;
  const incoming = new Map();
  for (const file of files) {
    if (incoming.has(file.name)) {
      throw new Error(
        `Duplicate component "${file.name}" in ${incoming.get(file.name)} and ${file.source}`,
      );
    }
    incoming.set(file.name, file.source);
  }
  const existing = collect(options.to);

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
    for (const old of existing) {
      if (old.name !== file.name || old.category === file.category) continue;
      removed += 1;
      if (!options.dryRun) unlinkSync(old.source);
    }
  }

  const prefix = options.dryRun ? "[dry-run] " : "";
  console.log(`${prefix}${files.length} component page(s) -> ${options.to}`);
  console.log(
    `${prefix}added ${added}, updated ${updated}, unchanged ${unchanged}, removed ${removed} superseded path(s)`,
  );
}

main();
