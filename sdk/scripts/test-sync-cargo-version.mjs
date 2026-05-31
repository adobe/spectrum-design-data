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
 * Smoke tests for sdk/scripts/sync-cargo-version.mjs and sdk/cli/bin/design-data.js.
 *
 * Run: node sdk/scripts/test-sync-cargo-version.mjs
 */

import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const sdkRoot = resolve(__dirname, '..');
const repoRoot = resolve(sdkRoot, '..');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
    failed++;
  }
}

// ── Version sync invariants ───────────────────────────────────────────────────

console.log('sync-cargo-version invariants:');

const cliPkg = JSON.parse(readFileSync(resolve(sdkRoot, 'cli/package.json'), 'utf8'));
const cliVersion = cliPkg.version;

test('cli package.json has a valid semver version', () => {
  assert.match(cliVersion, /^\d+\.\d+\.\d+/, 'version must be semver');
});

test('optionalDependencies all point to the same version', () => {
  const deps = cliPkg.optionalDependencies ?? {};
  for (const [dep, ver] of Object.entries(deps)) {
    // Version 0.0.0 is the placeholder before first sync-cargo-version run —
    // skip the version equality check in that case so the test passes in CI
    // before the first changeset version bump.
    if (ver === '0.0.0') continue;
    // `workspace:*` (and `workspace:^`/`workspace:~`) is the intended source
    // form — pnpm rewrites it to the resolved version at publish time, so the
    // raw package.json never carries a literal version here. Treat as valid.
    if (ver.startsWith('workspace:')) continue;
    assert.equal(ver, cliVersion, `${dep} should be pinned to ${cliVersion}, got ${ver}`);
  }
});

const platforms = ['darwin-arm64', 'darwin-x64', 'linux-x64', 'win32-x64'];
for (const platform of platforms) {
  test(`sdk/npm/${platform}/package.json has same version as cli (or 0.0.0 placeholder)`, () => {
    const pkgPath = resolve(sdkRoot, `npm/${platform}/package.json`);
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
    if (pkg.version === '0.0.0') return; // placeholder — skip until first sync
    assert.equal(pkg.version, cliVersion, `platform package version mismatch`);
  });
}

// ── Launcher PLATFORM_MAP coverage ───────────────────────────────────────────

console.log('\nlauncher platform resolution:');

const launcherSrc = readFileSync(resolve(sdkRoot, 'cli/bin/design-data.js'), 'utf8');

const mapMatch = launcherSrc.match(/const PLATFORM_PACKAGES\s*=\s*\{([^}]+)\}/s);
test('PLATFORM_PACKAGES map exists in launcher', () => {
  assert.ok(mapMatch, 'PLATFORM_PACKAGES not found in launcher source');
});

if (mapMatch) {
  const mapEntries = [...mapMatch[1].matchAll(/"([^"]+)":\s*"([^"]+)"/g)];
  test('launcher covers all 4 platform keys', () => {
    const keys = mapEntries.map(([, k]) => k);
    assert.ok(keys.includes('darwin-arm64'), 'missing darwin-arm64');
    assert.ok(keys.includes('darwin-x64'), 'missing darwin-x64');
    assert.ok(keys.includes('linux-x64'), 'missing linux-x64');
    assert.ok(keys.includes('win32-x64'), 'missing win32-x64');
  });

  test('all platform values match @adobe/design-data-{platform} pattern', () => {
    for (const [, key, pkg] of mapEntries) {
      assert.equal(
        pkg,
        `@adobe/design-data-${key}`,
        `${key} maps to wrong package: ${pkg}`,
      );
    }
  });
}

// ── Summary ───────────────────────────────────────────────────────────────────

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
