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
 * Syncs the tui Cargo.toml version from tui/package.json after `changeset version`.
 *
 * - For `tui`: reads version from tui/package.json and writes it into tui/Cargo.toml.
 *
 * The `design-data-cli` Rust crate (sdk/cli/Cargo.toml) is versioned independently
 * and released via GitHub Releases — it no longer has a corresponding npm package.
 *
 * Run after `changeset version` via `moon run sdk:version`.
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { resolve, dirname } from 'path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// Sync tui: package.json → Cargo.toml

const tuiPkg = JSON.parse(readFileSync(resolve(root, 'tui/package.json'), 'utf8'));
const tuiVersion = tuiPkg.version;

const cargoPath = resolve(root, 'tui/Cargo.toml');
const cargo = readFileSync(cargoPath, 'utf8');

const updated = cargo.replace(/^version\s*=\s*"[^"]+"/m, `version = "${tuiVersion}"`);

if (updated === cargo) {
  console.log(`sdk/tui/Cargo.toml already at ${tuiVersion}`);
} else {
  writeFileSync(cargoPath, updated);
  console.log(`Updated sdk/tui/Cargo.toml to ${tuiVersion}`);
}
