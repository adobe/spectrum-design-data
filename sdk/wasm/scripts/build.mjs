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
 * Build the wasm package for both Node.js and browser targets.
 *
 * - `pkg/node/` — nodejs target (synchronous, CommonJS-style require; no init()
 *   needed). Used by Node consumers: MCP servers, CI scripts, AVA tests.
 * - `pkg/web/` — web target (browser ESM; requires `await init(wasmUrl)` before
 *   use). Used by browser/docs tooling.
 *
 * Run via `moon run sdk-wasm:build` or directly with `node scripts/build.mjs`
 * from the sdk/wasm directory.
 */

import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const cwd = dirname(fileURLToPath(import.meta.url + '/..'));

function build(target, outDir) {
  console.log(`\n→ wasm-pack build --target ${target} --out-dir ${outDir} -- --features embedded`);
  execFileSync(
    'wasm-pack',
    ['build', '--target', target, '--out-dir', outDir, '--', '--features', 'embedded'],
    { cwd, stdio: 'inherit' },
  );
}

build('nodejs', 'pkg/node');
build('web', 'pkg/web');

console.log('\n✓ wasm build complete: pkg/node (nodejs) and pkg/web (web)');
