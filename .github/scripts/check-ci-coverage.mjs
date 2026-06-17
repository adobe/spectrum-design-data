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
 * CI coverage guard: verifies that every moon task with runInCI enabled is
 * either listed in .github/ci-targets.json (node or rust entry targets) or
 * explicitly excluded (excludedFromCI). Fails loudly if any task is missing
 * so coverage gaps surface in CI rather than silently skipping.
 *
 * Usage: node .github/scripts/check-ci-coverage.mjs
 */

import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '../..');

// ── Load target lists ────────────────────────────────────────────────────────

const targetsPath = resolve(__dirname, '../ci-targets.json');
const { node: nodeTargets, rust: rustTargets, excludedFromCI } = JSON.parse(
  readFileSync(targetsPath, 'utf8'),
);

const entryTargets = new Set([...nodeTargets, ...rustTargets]);
const excluded = new Set(excludedFromCI);

// ── Query moon task graph ────────────────────────────────────────────────────

let moonOutput;
try {
  moonOutput = execSync('moon query tasks', { cwd: root, encoding: 'utf8' });
} catch (err) {
  console.error('Failed to run `moon query tasks`:', err.message);
  process.exit(1);
}

const parsed = JSON.parse(moonOutput);
if (!parsed || typeof parsed.tasks !== 'object' || parsed.tasks === null) {
  console.error(
    'Unexpected `moon query tasks --json` output: missing or non-object `tasks` field.\n' +
      'This likely means moon changed its JSON schema — check the query output manually.',
  );
  process.exit(1);
}
const { tasks: taskMap } = parsed;

// Build: runInCI set and dependency graph
const runInCI = new Set();
const deps = {};

for (const [proj, taskList] of Object.entries(taskMap)) {
  for (const [tid, task] of Object.entries(taskList)) {
    const target = `${proj}:${tid}`;
    const ric = task?.options?.runInCI;
    if (ric !== false) {
      runInCI.add(target);
    }
    deps[target] = (task.deps ?? []).map((d) => d.target).filter(Boolean);
  }
}

// ── Transitive closure of entry targets ────────────────────────────────────

function closure(seeds) {
  const seen = new Set();
  const stack = [...seeds];
  while (stack.length > 0) {
    const tgt = stack.pop();
    if (seen.has(tgt)) continue;
    seen.add(tgt);
    for (const dep of deps[tgt] ?? []) stack.push(dep);
  }
  return seen;
}

const covered = closure(entryTargets);

// ── Validation ───────────────────────────────────────────────────────────────

const errors = [];
const warnings = [];

// 1. runInCI tasks that are neither covered nor excluded
const uncovered = [...runInCI].filter((t) => !covered.has(t) && !excluded.has(t)).sort();
if (uncovered.length > 0) {
  errors.push(
    'The following runInCI tasks are not covered by either job list or excludedFromCI.\n' +
      'Add each to .node[], .rust[], or .excludedFromCI[] in .github/ci-targets.json:\n' +
      uncovered.map((t) => `  - ${t}`).join('\n'),
  );
}

// 2. Listed/excluded targets that do not exist in the moon workspace
const allTargets = new Set(Object.keys(deps));
const invalidListed = [...entryTargets].filter((t) => !allTargets.has(t)).sort();
if (invalidListed.length > 0) {
  errors.push(
    'The following targets in .node[] or .rust[] do not exist in the moon workspace\n' +
      '(possible typo or renamed task):\n' +
      invalidListed.map((t) => `  - ${t}`).join('\n'),
  );
}

const invalidExcluded = [...excluded].filter((t) => !allTargets.has(t)).sort();
if (invalidExcluded.length > 0) {
  warnings.push(
    'The following targets in .excludedFromCI[] do not exist in the moon workspace\n' +
      '(stale exclusion — remove from .github/ci-targets.json):\n' +
      invalidExcluded.map((t) => `  - ${t}`).join('\n'),
  );
}

// 3. excludedFromCI entries that are not runInCI (stale)
const staleExcluded = [...excluded].filter((t) => allTargets.has(t) && !runInCI.has(t)).sort();
if (staleExcluded.length > 0) {
  warnings.push(
    'The following targets in .excludedFromCI[] are not runInCI tasks\n' +
      '(they would never run in CI anyway — remove to keep the list tidy):\n' +
      staleExcluded.map((t) => `  - ${t}`).join('\n'),
  );
}

// 4. Node job-assignment correctness: no .node[] target may transitively depend
//    on an sdk:* or sdk-wasm:* task. The `node` job runs without a Rust toolchain;
//    a misclassified target would fail at runtime with "cargo: command not found".
//    This is derived from the live moon graph, not the hand-maintained rust list,
//    so it stays accurate even if the lists drift.
const rustToolchainTasks = new Set(
  [...allTargets].filter((t) => {
    const proj = t.split(':')[0];
    return proj === 'sdk' || proj === 'sdk-wasm';
  }),
);

const badNodeAssignments = [];
for (const nt of nodeTargets) {
  if (!allTargets.has(nt)) continue; // already caught by check 2
  const ntClosure = closure([nt]);
  const rustDeps = [...ntClosure].filter((t) => rustToolchainTasks.has(t)).sort();
  if (rustDeps.length > 0) {
    badNodeAssignments.push({ target: nt, rustDeps });
  }
}

if (badNodeAssignments.length > 0) {
  errors.push(
    'The following .node[] targets transitively depend on Rust-toolchain (sdk:*/sdk-wasm:*) tasks.\n' +
      'The node job runs without a Rust toolchain — move these to .rust[] in .github/ci-targets.json:\n' +
      badNodeAssignments
        .map(({ target, rustDeps }) => `  - ${target}  (via: ${rustDeps.join(', ')})`)
        .join('\n'),
  );
}

// ── Report ────────────────────────────────────────────────────────────────────

console.log('CI coverage check');
console.log(`  moon runInCI tasks : ${runInCI.size}`);
console.log(`  entry targets      : ${entryTargets.size}  (node: ${nodeTargets.length}, rust: ${rustTargets.length})`);
console.log(`  covered (w/ deps)  : ${covered.size}`);
console.log(`  excluded from CI   : ${excluded.size}`);
console.log(`  uncovered          : ${uncovered.length}`);

if (warnings.length > 0) {
  for (const w of warnings) console.warn('\n⚠️  ' + w);
}

if (errors.length > 0) {
  for (const e of errors) console.error('\n❌  ' + e);
  process.exit(1);
}

console.log('\n✅  All runInCI tasks are accounted for.');
