#!/usr/bin/env node
/**
 * Copyright 2024 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */
import { access } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));

const requiredPaths = [
  'spec/index.md',
  'spec/token-format.md',
  'spec/cascade.md',
  'spec/dimensions.md',
  'spec/manifest.md',
  'schemas/token.schema.json',
  'schemas/dimension.schema.json',
  'schemas/manifest.schema.json',
  'schemas/value-types',
  'rules/rules.yaml',
  'conformance/valid',
  'conformance/invalid/SPEC-001',
  'conformance/invalid/SPEC-002',
];

for (const rel of requiredPaths) {
  await access(join(root, rel));
}

console.log('@adobe/design-data-spec layout OK');
