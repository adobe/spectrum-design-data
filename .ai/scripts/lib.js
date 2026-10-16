// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const REPO_ROOT = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../..",
);

export const GITHUB_BLOB =
  "https://github.com/adobe/spectrum-design-data/blob/main";
export const NPM_PACKAGE_BASE = "https://www.npmjs.com/package";

/** Tracked files plus untracked files that are not ignored. */
export function listFiles(root = REPO_ROOT) {
  const out = execFileSync(
    "git",
    ["ls-files", "-z", "--cached", "--others", "--exclude-standard"],
    { cwd: root, maxBuffer: 64 * 1024 * 1024 },
  ).toString();
  return out
    .split("\0")
    .filter(Boolean)
    .filter((f) => existsSync(join(root, f)));
}

export function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

/**
 * Parses the small frontmatter subset used by .ai sources:
 * flat `key: value` pairs, optionally quoted. Returns `{ data, body }`.
 */
export function parseFrontmatter(text) {
  const match = text.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) return { data: null, body: text };
  const data = {};
  for (const line of match[1].split("\n")) {
    const kv = line.match(/^([A-Za-z][\w-]*):\s*(.*)$/);
    if (!kv) continue;
    data[kv[1]] = kv[2].replace(/^(["'])(.*)\1$/, "$2");
  }
  return { data, body: match[2] };
}

/** Writes a file only if the content changed; returns true when it differs. */
export function writeIfChanged(path, content) {
  if (existsSync(path) && readFileSync(path, "utf8") === content) return false;
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
  return true;
}

/**
 * Applies generated outputs. In check mode nothing is written and stale paths
 * are returned so the caller can report them.
 */
export function applyOutputs(outputs, { check }) {
  const stale = [];
  for (const [rel, content] of outputs) {
    const abs = join(REPO_ROOT, rel);
    const current = existsSync(abs) ? readFileSync(abs, "utf8") : null;
    if (current === content) continue;
    stale.push(rel);
    if (!check) writeIfChanged(abs, content);
  }
  return stale;
}

export function isMain(metaUrl) {
  return process.argv[1] && fileURLToPath(metaUrl) === resolve(process.argv[1]);
}
