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
 * Copies fetched component Markdown from a scratch directory into the
 * docs/s2-docs tree, preserving the Hub's own layout:
 *
 *   web/rsp/components/<hub-slug>.md
 *   web/swc/components/<hub-slug>.md
 *
 * Staged pages carry `design_data_targets` frontmatter, which
 * tools/s2-docs-to-document-blocks's `transform` command uses to find the
 * page for each design-data component. Staged pages that the fetch no longer
 * produces are removed, but only when the run covered every known slug
 * (pass --prune); partial runs leave pages absent from the fetch untouched.
 *
 * Usage:
 *   node scripts/stage-components.js --from ./_hub-component-fetch --to ./docs/s2-docs [--prune] [--dry-run]
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

const PLATFORMS = ["rsp", "swc"];

function parseArgs(argv) {
  const options = {
    from: "./_hub-component-fetch",
    to: "./docs/s2-docs",
    prune: false,
    dryRun: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--from") options.from = argv[index + 1];
    else if (arg === "--to") options.to = argv[index + 1];
    else if (arg === "--prune") options.prune = true;
    else if (arg === "--dry-run") options.dryRun = true;
  }

  return options;
}

function collect(root) {
  const files = [];

  for (const platform of PLATFORMS) {
    const dir = join(root, "web", platform, "components");
    if (!existsSync(dir)) continue;
    for (const file of readdirSync(dir, { withFileTypes: true })) {
      if (file.isFile() && file.name.endsWith(".md")) {
        files.push({
          platform,
          name: file.name,
          relative: join("web", platform, "components", file.name),
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
      `No markdown found under ${options.from}/web. Run component-sync-cli.js first.`,
    );
    process.exitCode = 1;
    return;
  }

  let added = 0;
  let updated = 0;
  let unchanged = 0;
  let removed = 0;

  for (const file of files) {
    const target = join(options.to, file.relative);
    const contents = readFileSync(file.source, "utf8");

    if (!existsSync(target)) added += 1;
    else if (readFileSync(target, "utf8") === contents) unchanged += 1;
    else updated += 1;

    if (!options.dryRun) {
      mkdirSync(join(target, ".."), { recursive: true });
      writeFileSync(target, contents);
    }
  }

  if (options.prune) {
    const incoming = new Set(files.map((file) => file.relative));
    for (const old of collect(options.to)) {
      if (incoming.has(old.relative)) continue;
      removed += 1;
      if (!options.dryRun) unlinkSync(old.source);
    }
  }

  const prefix = options.dryRun ? "[dry-run] " : "";
  console.log(`${prefix}${files.length} component page(s) -> ${options.to}`);
  console.log(
    `${prefix}added ${added}, updated ${updated}, unchanged ${unchanged}, removed ${removed} stale page(s)`,
  );
}

main();
