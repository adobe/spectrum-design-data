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
 * Rewrites the EXPECTED_GUIDELINE_COUNT and/or EXPECTED_COMPONENT_COUNT constants in
 * sdk/core/src/data_source/embedded.rs's materialize_guidelines_count() /
 * materialize_components_count() regression tests to match the real number of JSON documents
 * currently in packages/design-data/guidelines/ (excluding manifest.json) and
 * packages/design-data/components/ (no manifest.json there) respectively.
 *
 * Refuses to silently lower either count: a decrease usually means a fetch/transform step
 * dropped files it shouldn't have, and a human should confirm that before the guard is
 * relaxed. Set ALLOW_GUIDELINE_COUNT_DECREASE=true / ALLOW_COMPONENT_COUNT_DECREASE=true to
 * bypass (e.g. for an intentional removal).
 *
 * Usage: node .github/scripts/bump-embedded-counts.mjs
 */

import { appendFileSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '../..');
const embeddedPath = resolve(root, 'sdk/core/src/data_source/embedded.rs');

const countJsonFiles = (dir, { excludeManifest = false } = {}) =>
  readdirSync(dir, { withFileTypes: true }).filter(
    (entry) =>
      entry.isFile() &&
      entry.name.endsWith('.json') &&
      !(excludeManifest && entry.name === 'manifest.json'),
  ).length;

/**
 * Rewrite a single `const EXPECTED_..._COUNT: usize = <N>;` anchor line in embedded.rs and
 * report the before/after via GITHUB_OUTPUT (if set), reusing one narrow, single-anchor
 * regex-replace strategy for both guards rather than matching the whole test function body —
 * that stays immune to reordering/refactoring of sibling tests in the same file.
 *
 * @param {{
 *   constName: string,
 *   dir: string,
 *   excludeManifest?: boolean,
 *   allowDecreaseEnvVar: string,
 *   outputPrefix: string,
 *   label: string,
 * }} config
 * @returns {{ prevCount: number, currentCount: number, changed: boolean }}
 */
function bumpCount({ constName, dir, excludeManifest = false, allowDecreaseEnvVar, outputPrefix, label }) {
  const countPattern = new RegExp(`(const ${constName}: usize = )(\\d+)(;)`);

  const currentCount = countJsonFiles(dir, { excludeManifest });
  const source = readFileSync(embeddedPath, 'utf8');
  const match = source.match(countPattern);

  if (!match) {
    throw new Error(
      `Could not find const ${constName}: usize = <N>; in ` +
        'sdk/core/src/data_source/embedded.rs. Has the corresponding regression test been ' +
        'renamed or restructured?',
    );
  }

  const prevCount = Number(match[2]);

  if (currentCount < prevCount && process.env[allowDecreaseEnvVar] !== 'true') {
    throw new Error(
      `Refusing to lower the ${label} count guard from ${prevCount} to ${currentCount}. ` +
        'This usually means a fetch/transform step silently dropped files rather than an ' +
        `intentional removal. If this decrease is expected, re-run with ${allowDecreaseEnvVar}=true.`,
    );
  }

  const nextSource = source.replace(countPattern, `$1${currentCount}$3`);
  const changed = nextSource !== source;

  if (changed) {
    writeFileSync(embeddedPath, nextSource, 'utf8');
    console.log(`Updated ${label} count guard from ${prevCount} to ${currentCount}.`);
  } else {
    console.log(`${label[0].toUpperCase()}${label.slice(1)} count guard already matches ${currentCount}.`);
  }

  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(
      process.env.GITHUB_OUTPUT,
      `${outputPrefix}_previous=${prevCount}\n` +
        `${outputPrefix}_new=${currentCount}\n` +
        `${outputPrefix}_changed=${changed}\n`,
      'utf8',
    );
  }

  return { prevCount, currentCount, changed };
}

bumpCount({
  constName: 'EXPECTED_GUIDELINE_COUNT',
  dir: resolve(root, 'packages/design-data/guidelines'),
  excludeManifest: true,
  allowDecreaseEnvVar: 'ALLOW_GUIDELINE_COUNT_DECREASE',
  outputPrefix: 'guideline_count',
  label: 'guideline',
});

bumpCount({
  constName: 'EXPECTED_COMPONENT_COUNT',
  dir: resolve(root, 'packages/design-data/components'),
  allowDecreaseEnvVar: 'ALLOW_COMPONENT_COUNT_DECREASE',
  outputPrefix: 'component_count',
  label: 'component',
});
