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
 * Reconciles renamed Hub pages by canonical path while preserving pages absent
 * from this fetch, including legacy-only guidance and partial-sync omissions.
 *
 * Usage:
 *   node scripts/stage-docs.js --from ./_hub-fetch --to ./docs/s2-docs
 *                             [--guidelines-dir ./packages/design-data/guidelines]
 *                             [--dry-run]
 */

import {
  readdirSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  existsSync,
  unlinkSync,
  appendFileSync,
} from "node:fs";
import { basename, join } from "node:path";
import { parseDoc } from "../../s2-docs-to-document-blocks/src/md-parser.js";
import { canonicalGuidelinePath } from "../src/hub-map.js";

const CATEGORIES = ["designing", "fundamentals", "developing", "support"];
const HUB_HOSTS = new Set([
  "spectrum.adobe.com",
  "preview.spectrum.adobe.com",
  "main--spectrum-hub--adobe.aem.live",
]);

function parseArgs(argv) {
  const options = {
    from: "./_hub-fetch",
    to: "./docs/s2-docs",
    guidelinesDir: null,
    dryRun: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--from") options.from = argv[index + 1];
    else if (arg === "--to") options.to = argv[index + 1];
    else if (arg === "--guidelines-dir") {
      if (!argv[index + 1] || argv[index + 1].startsWith("--")) {
        throw new Error("--guidelines-dir requires a directory.");
      }
      options.guidelinesDir = argv[index + 1];
    } else if (arg === "--dry-run") options.dryRun = true;
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

function hubIdentity(sourceUrl) {
  if (!sourceUrl) return null;
  const url = new URL(sourceUrl);
  return HUB_HOSTS.has(url.hostname)
    ? canonicalGuidelinePath(url.pathname)
    : null;
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

  const incoming = files.map((file) => {
    const contents = readFileSync(file.source, "utf8");
    const { frontmatter } = parseDoc(contents);
    return {
      ...file,
      contents,
      identity: hubIdentity(frontmatter.source_url),
      target: join(options.to, file.category, file.name),
    };
  });
  const identities = new Map();
  for (const file of incoming) {
    if (!file.identity) continue;
    if (identities.has(file.identity)) {
      throw new Error(`Multiple fetched pages resolve to ${file.identity}.`);
    }
    identities.set(file.identity, file.target);
  }
  const incomingSlugs = new Set(
    incoming.map((file) => basename(file.name, ".md")),
  );
  const superseded = collect(options.to)
    .map((file) => {
      const { frontmatter } = parseDoc(readFileSync(file.source, "utf8"));
      return { ...file, identity: hubIdentity(frontmatter.source_url) };
    })
    .filter((file) => {
      const target = identities.get(file.identity);
      return target && target !== file.source;
    });
  const obsoleteJson = new Set();
  if (options.guidelinesDir && existsSync(options.guidelinesDir)) {
    for (const name of readdirSync(options.guidelinesDir)) {
      if (!name.endsWith(".json") || name === "manifest.json") continue;
      const slug = basename(name, ".json");
      if (incomingSlugs.has(slug)) continue;
      const jsonPath = join(options.guidelinesDir, name);
      const doc = JSON.parse(readFileSync(jsonPath, "utf8"));
      const identity = hubIdentity(doc.sourceUrl);
      const file = superseded.find(
        (candidate) => basename(candidate.name, ".md") === slug,
      );
      if (file && identity !== file.identity) {
        throw new Error(`Cannot reconcile unrelated guideline ${jsonPath}.`);
      }
      if (identities.has(identity)) obsoleteJson.add(jsonPath);
    }
  }

  for (const file of incoming) {
    const targetDir = join(options.to, file.category);
    const target = join(targetDir, file.name);
    const contents = file.contents;

    if (!existsSync(target)) added += 1;
    else if (readFileSync(target, "utf8") === contents) unchanged += 1;
    else updated += 1;

    if (!options.dryRun) {
      mkdirSync(targetDir, { recursive: true });
      writeFileSync(target, contents);
    }
  }

  if (!options.dryRun) {
    for (const file of superseded) unlinkSync(file.source);
    for (const jsonPath of obsoleteJson) unlinkSync(jsonPath);
  }
  if (process.env.GITHUB_OUTPUT) {
    const removed = options.dryRun ? 0 : obsoleteJson.size;
    appendFileSync(
      process.env.GITHUB_OUTPUT,
      `guideline_json_removed=${removed}\nguideline_count_decrease_allowed=${removed > 0}\n`,
    );
  }

  const prefix = options.dryRun ? "[dry-run] " : "";
  console.log(`${prefix}${files.length} hub page(s) -> ${options.to}`);
  console.log(
    `${prefix}added ${added}, updated ${updated}, unchanged ${unchanged}, removed ${superseded.length} superseded Markdown and ${obsoleteJson.size} guideline JSON file(s)`,
  );
  for (const file of superseded) {
    console.log(`${prefix}superseded: ${file.source}`);
  }
}

main();
