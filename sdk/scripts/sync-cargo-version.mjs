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
 * Syncs versions across all SDK crates and npm packages after `changeset version`.
 *
 * - For `cli` and `tui`: reads version from package.json and writes it into Cargo.toml.
 * - For platform packages (`npm/{platform}`): writes the CLI version into each package.json.
 * - For the launcher (`cli`): keeps all `optionalDependencies` pinned to the same version.
 *
 * Run after `changeset version` via `moon run sdk:version`.
 * Smoke-tested by sdk/scripts/test-sync-cargo-version.mjs.
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { resolve, dirname } from 'path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// ── 1. Sync cli + tui: package.json → Cargo.toml ─────────────────────────────

// Read the CLI package.json once; its version drives everything below.
const cliPkg = JSON.parse(readFileSync(resolve(root, 'cli/package.json'), 'utf8'));
const cliVersion = cliPkg.version;

for (const crate of ['cli', 'tui']) {
  const version = crate === 'cli'
    ? cliVersion
    : JSON.parse(readFileSync(resolve(root, `${crate}/package.json`), 'utf8')).version;

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

// ── 2. Propagate CLI version to platform packages and optionalDependencies ───

const platforms = ['darwin-arm64', 'darwin-x64', 'linux-x64', 'win32-x64'];

for (const platform of platforms) {
  const pkgPath = resolve(root, `npm/${platform}/package.json`);
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));

  if (pkg.version === cliVersion) {
    console.log(`sdk/npm/${platform}/package.json already at ${cliVersion}`);
    continue;
  }

  pkg.version = cliVersion;
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
  console.log(`Updated sdk/npm/${platform}/package.json to ${cliVersion}`);
}

// Note: optionalDependencies in sdk/cli/package.json use "workspace:*" —
// pnpm converts these to the actual resolved version at publish time via
// `pnpm publish`. No manual update needed here.
