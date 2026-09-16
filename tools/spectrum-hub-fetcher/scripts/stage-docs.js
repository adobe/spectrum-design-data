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
 * Copies fetched hub Markdown from a scratch directory into the docs/s2-docs
 * tree that tools/s2-docs-to-document-blocks reads.
 *
 * This is deliberately additive: files already in docs/s2-docs that the hub has
 * no counterpart for are left untouched. Only slugs the hub actually publishes
 * are overwritten, per the "hub wins" policy.
 *
 * Usage:
 *   node scripts/stage-docs.js --from ./_hub-fetch --to ./docs/s2-docs [--dry-run]
 */

import {
  readdirSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  existsSync,
} from "node:fs";
import { join } from "node:path";

const CATEGORIES = ["designing", "fundamentals", "developing", "support"];

function parseArgs(argv) {
  const options = { from: "./_hub-fetch", to: "./docs/s2-docs", dryRun: false };

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

  for (const category of CATEGORIES) {
    const dir = join(from, category);
    if (!existsSync(dir)) continue;

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
      `No markdown found under ${options.from}. Run the fetcher first.`,
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
  console.log(`${prefix}${files.length} hub page(s) -> ${options.to}`);
  console.log(
    `${prefix}added ${added}, updated ${updated}, unchanged ${unchanged}`,
  );
}

main();
