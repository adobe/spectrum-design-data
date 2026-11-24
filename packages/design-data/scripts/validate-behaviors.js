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

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import Ajv2020 from "ajv/dist/2020.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const behaviorsDir = join(__dirname, "..", "behaviors");

const require = createRequire(import.meta.url);
const specDir = dirname(
  require.resolve("@adobe/design-data-spec/package.json"),
);
const schema = JSON.parse(
  readFileSync(join(specDir, "schemas", "behavior.schema.json"), "utf-8"),
);
const ajv = new Ajv2020({ strict: false, allErrors: true });
const validate = ajv.compile(schema);
const validatePattern = ajv.compile(
  JSON.parse(
    readFileSync(
      join(specDir, "schemas", "behavior-pattern.schema.json"),
      "utf-8",
    ),
  ),
);

// No component has a contract yet, so behaviors/ may not exist. The conformance baseline holds
// the worked example, which keeps the schema honest until real contracts land.
const contracts = [];
if (existsSync(behaviorsDir)) {
  for (const file of readdirSync(behaviorsDir)
    .filter((f) => f.endsWith(".json"))
    .sort()) {
    contracts.push([
      `behaviors/${file}`,
      JSON.parse(readFileSync(join(behaviorsDir, file), "utf-8")),
    ]);
  }
}
// Patterns (behaviors/patterns/) and conformance suites ({ component, vectors }) have their own shapes.
const patterns = [];
const patternsDir = join(behaviorsDir, "patterns");
if (existsSync(patternsDir)) {
  for (const file of readdirSync(patternsDir)
    .filter((f) => f.endsWith(".json"))
    .sort()) {
    patterns.push([
      `behaviors/patterns/${file}`,
      JSON.parse(readFileSync(join(patternsDir, file), "utf-8")),
    ]);
  }
}
const suitesDir = join(specDir, "conformance", "behavior");
if (existsSync(suitesDir)) {
  for (const file of readdirSync(suitesDir)
    .filter((f) => f.endsWith(".json"))
    .sort()) {
    contracts.push([
      `conformance/behavior/${file}`,
      JSON.parse(readFileSync(join(suitesDir, file), "utf-8")),
    ]);
  }
}
const baseline = JSON.parse(
  readFileSync(
    join(specDir, "conformance", "valid", "behavior-contract", "dataset.json"),
    "utf-8",
  ),
);
for (const [i, b] of baseline.behaviors.entries()) {
  contracts.push([`conformance/valid/behavior-contract#${i}`, b]);
}

let hasErrors = false;
for (const [name, contract] of [...contracts, ...patterns]) {
  const check = patterns.some(([n]) => n === name) ? validatePattern : validate;
  if (check(contract)) {
    console.log(`✅ ${name}`);
    continue;
  }
  hasErrors = true;
  console.error(`❌ ${name}`);
  for (const err of check.errors) {
    console.error(`   ${err.instancePath || "root"}: ${err.message}`);
  }
}

// The exemptions registry (SPEC-123) must name real components, with registered reasons, that
// have no contract. Checked here because the rule only sees the components of one dataset.
const registryDir = join(__dirname, "..", "registry");
const readJson = (p) => JSON.parse(readFileSync(p, "utf-8"));
const reasons = new Set(
  readJson(join(registryDir, "exemption-reasons.json")).values.map((v) => v.id),
);
for (const { id, reason } of readJson(
  join(registryDir, "behavior-exemptions.json"),
).values) {
  const problem = !existsSync(join(__dirname, "..", "components", `${id}.json`))
    ? "is not a component"
    : !reasons.has(reason)
      ? `has unregistered reason '${reason}'`
      : existsSync(join(behaviorsDir, `${id}.json`))
        ? "is exempt but has a contract"
        : null;
  if (problem) {
    hasErrors = true;
    console.error(`❌ behavior-exemptions.json: '${id}' ${problem}`);
  }
}

if (hasErrors) process.exit(1);
console.log(
  `\n✅ ${contracts.length + patterns.length} behavior file(s) match their schemas\n`,
);
