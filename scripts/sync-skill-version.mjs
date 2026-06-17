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
 * Syncs a SKILL.md metadata.version (and optional metadata.designDataVersion) from
 * the calling project's package.json after `changeset version`.
 *
 * Usage (run from the package root, or via moon with cwd = project root):
 *   node <workspaceRoot>/scripts/sync-skill-version.mjs <relative-skill-path>
 *
 * Arguments:
 *   argv[2] — path to SKILL.md, relative to process.cwd() (e.g. skills/design-data/SKILL.md)
 *
 * Behaviour:
 *  - Reads version from <cwd>/package.json and writes it into the SKILL.md frontmatter
 *    metadata.version field.
 *  - If the frontmatter also contains a designDataVersion field, syncs it from
 *    packages/design-data/package.json (resolved from the workspace root, one level above
 *    the tool packages).
 *  - Rewrites only the matched line(s) inside the YAML frontmatter block; all other
 *    content is preserved verbatim.
 *  - Idempotent: if a version is already correct, prints a no-op message and exits 0.
 *
 * Run after `changeset version` via `moon run :version`.
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
// workspace root is one level above this scripts/ directory
const workspaceRoot = resolve(scriptDir, '..');

const skillRelPath = process.argv[2];
if (!skillRelPath) {
  console.error('Usage: sync-skill-version.mjs <relative-skill-path>');
  process.exit(1);
}

const cwd = process.cwd();
const pkgPath = resolve(cwd, 'package.json');
const skillPath = resolve(cwd, skillRelPath);

const { version: pkgVersion } = JSON.parse(readFileSync(pkgPath, 'utf8'));
let content = readFileSync(skillPath, 'utf8');

// Extract the YAML frontmatter block (between the first two --- delimiters)
const fmMatch = content.match(/^(---\r?\n)([\s\S]*?)(\r?\n---)/);
if (!fmMatch) {
  console.error(`No YAML frontmatter found in ${skillPath}`);
  process.exit(1);
}

const [fullMatch, openFence, frontmatter, closeFence] = fmMatch;
let updatedFm = frontmatter;
let changed = false;

// --- Sync metadata.version ---
const versionRe = /^(\s*version:\s*)["']([^"'\r\n]+)["']/m;
const versionMatch = updatedFm.match(versionRe);
if (!versionMatch) {
  console.error(`metadata.version field not found in frontmatter of ${skillPath}`);
  process.exit(1);
}
const currentVersion = versionMatch[2];
if (currentVersion === pkgVersion) {
  console.log(`${skillRelPath}: metadata.version already at ${pkgVersion} (no-op)`);
} else {
  updatedFm = updatedFm.replace(versionRe, `$1"${pkgVersion}"`);
  console.log(`${skillRelPath}: metadata.version ${currentVersion} → ${pkgVersion}`);
  changed = true;
}

// --- Sync metadata.designDataVersion (optional field) ---
const ddvRe = /^(\s*designDataVersion:\s*)["']([^"'\r\n]+)["']/m;
const ddvMatch = updatedFm.match(ddvRe);
if (ddvMatch) {
  const designDataPkgPath = resolve(workspaceRoot, 'packages', 'design-data', 'package.json');
  const { version: designDataVersion } = JSON.parse(readFileSync(designDataPkgPath, 'utf8'));
  const currentDdv = ddvMatch[2];
  if (currentDdv === designDataVersion) {
    console.log(`${skillRelPath}: metadata.designDataVersion already at ${designDataVersion} (no-op)`);
  } else {
    updatedFm = updatedFm.replace(ddvRe, `$1"${designDataVersion}"`);
    console.log(`${skillRelPath}: metadata.designDataVersion ${currentDdv} → ${designDataVersion}`);
    changed = true;
  }
}

if (changed) {
  const newContent = content.replace(fullMatch, `${openFence}${updatedFm}${closeFence}`);
  writeFileSync(skillPath, newContent, 'utf8');
}
