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
 * Rewrites the EXPECTED_GUIDELINE_COUNT constant in
 * sdk/core/src/data_source/embedded.rs's materialize_guidelines_count() regression test to
 * match the real number of guideline JSON documents (excluding manifest.json) currently in
 * packages/design-data/guidelines/.
 *
 * Refuses to silently lower the count: a decrease usually means the transform step dropped
 * files it shouldn't have, and a human should confirm that before the guard is relaxed. Set
 * ALLOW_GUIDELINE_COUNT_DECREASE=true to bypass (e.g. for an intentional guideline removal).
 *
 * Usage: node .github/scripts/bump-embedded-counts.mjs
 */

import { appendFileSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '../..');
const guidelinesDir = resolve(root, 'packages/design-data/guidelines');
const embeddedPath = resolve(root, 'sdk/core/src/data_source/embedded.rs');

const countFiles = () =>
  readdirSync(guidelinesDir, { withFileTypes: true }).filter(
    (entry) => entry.isFile() && entry.name.endsWith('.json') && entry.name !== 'manifest.json',
  ).length;

// A single, narrow anchor: the constant declaration line. Unlike matching the whole test
// function body, this is immune to reordering/refactoring of sibling tests in the same file.
const COUNT_PATTERN = /(const EXPECTED_GUIDELINE_COUNT: usize = )(\d+)(;)/;

const currentCount = countFiles();
const source = readFileSync(embeddedPath, 'utf8');
const match = source.match(COUNT_PATTERN);

if (!match) {
  throw new Error(
    'Could not find `const EXPECTED_GUIDELINE_COUNT: usize = <N>;` in ' +
      'sdk/core/src/data_source/embedded.rs. Has materialize_guidelines_count() been renamed ' +
      'or restructured?',
  );
}

const prevCount = Number(match[2]);

if (currentCount < prevCount && process.env.ALLOW_GUIDELINE_COUNT_DECREASE !== 'true') {
  throw new Error(
    `Refusing to lower the guideline count guard from ${prevCount} to ${currentCount}. ` +
      'This usually means the transform step silently dropped files rather than an ' +
      'intentional guideline removal. If this decrease is expected, re-run with ' +
      'ALLOW_GUIDELINE_COUNT_DECREASE=true.',
  );
}

const nextSource = source.replace(COUNT_PATTERN, `$1${currentCount}$3`);
const changed = nextSource !== source;

if (changed) {
  writeFileSync(embeddedPath, nextSource, 'utf8');
  console.log(`Updated guideline count guard from ${prevCount} to ${currentCount}.`);
} else {
  console.log(`Guideline count guard already matches ${currentCount}.`);
}

if (process.env.GITHUB_OUTPUT) {
  appendFileSync(
    process.env.GITHUB_OUTPUT,
    `guideline_count_previous=${prevCount}\n` +
      `guideline_count_new=${currentCount}\n` +
      `guideline_count_changed=${changed}\n`,
    'utf8',
  );
}
