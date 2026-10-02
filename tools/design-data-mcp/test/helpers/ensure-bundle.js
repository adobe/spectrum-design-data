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
 * Shared helper for bundle tests.
 *
 * `ensureBundle()` runs `node scripts/generate-mcpb.mjs` when the staging
 * directory does not yet exist, so tests never silently skip. Use it in a
 * `test.before` hook:
 *
 *   import { packageDir, stagingDir, ensureBundle } from './helpers/ensure-bundle.js';
 *   test.before(ensureBundle);
 */

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { existsSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

export const packageDir = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../..",
);
export const stagingDir = join(packageDir, "dist", "design-data-mcp-bundle");
export const entryPoint = join(stagingDir, "src", "cli.js");
const execFileAsync = promisify(execFile);

export async function generateBundle(directory = stagingDir) {
  await execFileAsync(
    process.execPath,
    ["scripts/generate-mcpb.mjs", directory],
    {
      cwd: packageDir,
      timeout: 120_000,
      maxBuffer: 4 * 1024 * 1024,
    },
  );
}

/** Each content-contract suite owns a fresh tree; never trust a previous manifest. */
export async function createFreshBundle() {
  const dist = join(packageDir, "dist");
  mkdirSync(dist, { recursive: true });
  const directory = mkdtempSync(join(dist, "content-contract-"));
  try {
    await generateBundle(directory);
    return directory;
  } catch (error) {
    rmSync(directory, { recursive: true, force: true });
    throw error;
  }
}

/**
 * Generate the staging bundle if `dist/design-data-mcp-bundle/manifest.json`
 * is missing. Throws if generation fails so the test suite surfaces the error
 * rather than silently passing.
 */
export async function ensureBundle() {
  if (existsSync(join(stagingDir, "manifest.json"))) return;

  await generateBundle();
}
