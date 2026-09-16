// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

import { appendFileSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '../..');
const guidelinesDir = resolve(root, 'packages/design-data/guidelines');
const embeddedPath = resolve(root, 'sdk/core/src/data_source/embedded.rs');

const countFiles = () =>
  readdirSync(guidelinesDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.json') && entry.name !== 'manifest.json').length;

const previousCount = () => {
  const source = readFileSync(embeddedPath, 'utf8');
  const start = source.indexOf('fn materialize_guidelines_count()');
  const end = source.indexOf('\n    #[test]\n    fn materialize_components_count()');

  if (start === -1 || end === -1 || end <= start) {
    throw new Error(
      'Could not locate materialize_guidelines_count() in sdk/core/src/data_source/embedded.rs.',
    );
  }

  const match = source.slice(start, end).match(/assert_eq!\(\s*guidelines\.len\(\),\s*(\d+),/m);
  if (!match) {
    throw new Error(
      'Could not find the guideline count literal in materialize_guidelines_count().',
    );
  }

  return Number(match[1]);
};

const currentCount = countFiles();
const prevCount = previousCount();
const template = `    #[test]
    fn materialize_guidelines_count() {
        // Regression guard: if a guideline is added to or removed from
        // packages/design-data/guidelines/, this test fails deliberately.
        // Update the expected count when you've intentionally changed the set.
        // manifest.json is excluded — it is not a guideline document.
        let (_tmp, root) = temp_root();
        let guidelines: Vec<_> = fs::read_dir(root.join("packages/design-data/guidelines"))
            .unwrap()
            .flatten()
            .filter(|e| {
                e.path().extension().is_some_and(|x| x == "json")
                    && e.file_name() != "manifest.json"
            })
            .collect();
        assert_eq!(
            guidelines.len(),
            ${currentCount},
            "expected ${currentCount} guideline documents — update this count if you've added/removed \\
             files from packages/design-data/guidelines/"
        );
    }
`;

const source = readFileSync(embeddedPath, 'utf8');
const attributeIndex = source.indexOf('    #[test]\n    fn materialize_guidelines_count()');
const start = attributeIndex === -1 ? source.indexOf('fn materialize_guidelines_count()') : attributeIndex;
const end = source.indexOf('\n    #[test]\n    fn materialize_components_count()');

if (start === -1 || end === -1 || end <= start) {
  throw new Error(
    'Could not locate the start and end boundaries for materialize_guidelines_count() in embedded.rs.',
  );
}

const nextSource = `${source.slice(0, start)}${template}${source.slice(end)}`;

if (source !== nextSource) {
  writeFileSync(embeddedPath, nextSource, 'utf8');
  console.log(`Updated guideline count guard from ${prevCount} to ${currentCount}.`);
} else {
  console.log(`Guideline count guard already matches ${currentCount}.`);
}

if (process.env.GITHUB_OUTPUT) {
  appendFileSync(
    process.env.GITHUB_OUTPUT,
    `guideline_count_previous=${prevCount}\nguideline_count_new=${currentCount}\n`,
    'utf8',
  );
}
