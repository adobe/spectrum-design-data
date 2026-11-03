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
 * Decides whether the Hub component sync changed any component's content.
 *
 * A component counts as changed only when its parsed JSON differs from HEAD after sorting
 * keys and collapsing whitespace in strings. Formatting-only rewrites (key order, indent,
 * line wrapping, e.g. #1561) are reverted so they never reach a PR. Staged Markdown under
 * docs/s2-docs/web counts only through the component JSON it changes.
 *
 * Usage: node .github/scripts/component-content-changes.mjs [--out changed-components.json]
 * Writes has_changes / changed_count to GITHUB_OUTPUT when set.
 */

import { execFileSync } from 'node:child_process';
import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';
import { basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const COMPONENTS_DIR = 'packages/design-data/components';

export function normalize(value) {
  if (typeof value === 'string') return value.replace(/\s+/g, ' ').trim();
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, normalize(value[key])]),
    );
  }
  return value;
}

export const semanticallyEqual = (a, b) =>
  JSON.stringify(normalize(JSON.parse(a))) === JSON.stringify(normalize(JSON.parse(b)));

const git = (...args) => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });

function headContent(path) {
  try {
    return git('show', `HEAD:${path}`);
  } catch {
    return null;
  }
}

export function classifyComponentChanges() {
  const status = git('status', '--porcelain', '--untracked-files=all', '--', COMPONENTS_DIR);
  const changed = [];
  const formattingOnly = [];
  for (const line of status.split('\n').filter(Boolean)) {
    const path = line.slice(3);
    if (!path.endsWith('.json')) continue;
    const slug = basename(path, '.json');
    let current = null;
    try {
      current = readFileSync(path, 'utf8');
    } catch {
      /* deleted */
    }
    const head = headContent(path);
    if (current !== null && head !== null && semanticallyEqual(current, head)) {
      formattingOnly.push({ slug, path });
    } else {
      changed.push({ slug, path });
    }
  }
  return { changed, formattingOnly };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const outIndex = process.argv.indexOf('--out');
  const outPath = outIndex > -1 ? process.argv[outIndex + 1] : 'changed-components.json';
  const { changed, formattingOnly } = classifyComponentChanges();
  for (const { path } of formattingOnly) git('checkout', 'HEAD', '--', path);
  writeFileSync(outPath, JSON.stringify({ changed: changed.map((c) => c.slug), formattingOnly: formattingOnly.map((c) => c.slug) }, null, 2) + '\n');
  console.log(`${changed.length} component(s) changed; ${formattingOnly.length} formatting-only rewrite(s) reverted.`);
  for (const { slug } of changed) console.log(`  changed: ${slug}`);
  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, `has_changes=${changed.length > 0}\nchanged_count=${changed.length}\n`);
  }
}
