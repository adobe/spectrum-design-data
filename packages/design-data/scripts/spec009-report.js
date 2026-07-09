/*
Copyright 2026 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

// SPEC-009 (name-field-enum-sync) fires once per token per unregistered
// name.* value, so a flat warning count buries the real signal: how many
// *distinct* values are actually missing from each registry, per field.
// This groups the `design-data validate --format json` output by
// name.<field> and reports unique-value counts so the backlog (tracked in
// beads epic spectrum-design-data-dm2) is a metric, not a wall of lines.

import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkgRoot = join(__dirname, "..");
const binary = join(
  pkgRoot,
  "..",
  "..",
  "sdk",
  "target",
  "debug",
  "design-data",
);

const raw = execFileSync(
  binary,
  [
    "validate",
    "./tokens",
    "--exceptions-path",
    "../tokens/naming-exceptions.json",
    "--format",
    "json",
  ],
  { cwd: pkgRoot, encoding: "utf8", maxBuffer: 1024 * 1024 * 64 },
);

const { warnings } = JSON.parse(raw);
const spec009 = warnings.filter((w) => w.rule_id === "SPEC-009");

// field ("property", "component", ...) -> value -> occurrence count
const byField = new Map();
const valueRe = /value "([^"]*)"/;

for (const w of spec009) {
  const field = w.instance_path?.replace(/^\/name\//, "") ?? "unknown";
  const value = w.message.match(valueRe)?.[1] ?? "unknown";
  if (!byField.has(field)) byField.set(field, new Map());
  const values = byField.get(field);
  values.set(value, (values.get(value) ?? 0) + 1);
}

console.log(`SPEC-009 (name-field-enum-sync): ${spec009.length} warnings\n`);

for (const [field, values] of [...byField].sort(
  (a, b) => b[1].size - a[1].size,
)) {
  const total = [...values.values()].reduce((a, b) => a + b, 0);
  console.log(`name.${field}: ${total} warnings, ${values.size} unique values`);
}

console.log("");

const detailField = process.argv[2];
if (detailField) {
  const values = byField.get(detailField);
  if (!values) {
    console.error(`No SPEC-009 warnings for field "${detailField}".`);
    process.exit(1);
  }
  console.log(`name.${detailField} — unique missing values by frequency:\n`);
  for (const [value, count] of [...values].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(count).padStart(4)}  ${value}`);
  }
} else {
  console.log(
    "Pass a field name (e.g. `component`) as an argument for a per-value breakdown.",
  );
}
