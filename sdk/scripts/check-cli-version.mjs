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
 * Compares the local @adobe/design-data version (sdk/cli/package.json) against the
 * version currently published on npm. Writes the local version to stdout if it is
 * ahead of npm (i.e. a release is needed), or writes nothing if they match.
 *
 * Used by the release workflow to gate the binary build matrix: only build and publish
 * when the version actually changed (i.e. a "Version Packages" PR was just merged).
 *
 * Usage: node sdk/scripts/check-cli-version.mjs
 * Output: version string (e.g. "0.1.3") or empty string
 */

import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const local = JSON.parse(
  readFileSync(resolve(root, 'cli/package.json'), 'utf8'),
).version;

let published = '0.0.0';
try {
  published = execSync('npm view @adobe/design-data version --silent', {
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
  }).trim();
} catch {
  // Package not yet published or network unavailable — treat as unpublished.
  published = '0.0.0';
}

// Write the local version only if it differs from what's on npm.
// Empty output signals "nothing to release" to the GitHub Actions job gate.
if (local !== published) {
  process.stdout.write(local);
}
