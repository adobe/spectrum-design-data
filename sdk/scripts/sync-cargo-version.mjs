// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

// Syncs the version from each crate's package.json into its Cargo.toml.
// Run after `changeset version` to keep Cargo.toml files in step with their npm stubs.

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { resolve, dirname } from 'path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

for (const crate of ['cli', 'tui']) {
  const pkg = JSON.parse(readFileSync(resolve(root, `${crate}/package.json`), 'utf8'));
  const { version } = pkg;

  const cargoPath = resolve(root, `${crate}/Cargo.toml`);
  const cargo = readFileSync(cargoPath, 'utf8');

  const updated = cargo.replace(/^version\s*=\s*"[^"]+"/m, `version = "${version}"`);

  if (updated === cargo) {
    console.log(`sdk/${crate}/Cargo.toml already at ${version}`);
  } else {
    writeFileSync(cargoPath, updated);
    console.log(`Updated sdk/${crate}/Cargo.toml to ${version}`);
  }
}
