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
// behavior.schema.json refers to the key names in the bindings schema, so add that one first.
const bindingsSchema = JSON.parse(
  readFileSync(
    join(specDir, "schemas", "behavior-bindings.schema.json"),
    "utf-8",
  ),
);
ajv.addSchema(bindingsSchema);
const validate = ajv.compile(schema);
const validateBindings = ajv.compile(bindingsSchema);
const validateBindingsSuite = ajv.compile({
  $ref: `${bindingsSchema.$id}#/$defs/suite`,
});
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
// Key bindings (behaviors/bindings/<platform>.json) and their per platform and role suites
// (conformance/behavior/bindings/<platform>/<role>.json); the file path must match its fields.
const bindings = [];
const bindingSuites = [];
const bindingsDir = join(behaviorsDir, "bindings");
if (existsSync(bindingsDir)) {
  for (const file of readdirSync(bindingsDir)
    .filter((f) => f.endsWith(".json"))
    .sort()) {
    bindings.push([
      `behaviors/bindings/${file}`,
      JSON.parse(readFileSync(join(bindingsDir, file), "utf-8")),
      file.replace(/\.json$/, ""),
    ]);
  }
}
const suiteBindingsDir = join(suitesDir, "bindings");
if (existsSync(suiteBindingsDir)) {
  for (const platform of readdirSync(suiteBindingsDir).sort()) {
    for (const file of readdirSync(join(suiteBindingsDir, platform))
      .filter((f) => f.endsWith(".json"))
      .sort()) {
      bindingSuites.push([
        `conformance/behavior/bindings/${platform}/${file}`,
        JSON.parse(
          readFileSync(join(suiteBindingsDir, platform, file), "utf-8"),
        ),
        `${platform}/${file.replace(/\.json$/, "")}`,
      ]);
    }
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

for (const [name, file, expected, check, got] of [
  ...bindings.map(([n, f, id]) => [n, f, id, validateBindings, f.platform]),
  ...bindingSuites.map(([n, f, id]) => [
    n,
    f,
    id,
    validateBindingsSuite,
    `${f.platform}/${f.role}${f.item ? ".item" : ""}`,
  ]),
]) {
  const problems = check(file)
    ? []
    : check.errors.map((e) => `${e.instancePath || "root"}: ${e.message}`);
  if (got !== expected)
    problems.push(`fields say '${got}', path says '${expected}'`);
  if (problems.length === 0) {
    console.log(`✅ ${name}`);
    continue;
  }
  hasErrors = true;
  console.error(`❌ ${name}`);
  for (const p of problems) console.error(`   ${p}`);
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

// A contract whose parts carry exactly one role agrees with the component's `accessibility.role`
// (the spec sheet reads the contract's, so a drifted component block would be a silent lie).
for (const [name, contract] of contracts.filter(([n]) =>
  n.startsWith("behaviors/"),
)) {
  const roles = Object.values(contract.parts ?? {})
    .map((p) => p.role)
    .filter(Boolean);
  const file = join(
    __dirname,
    "..",
    "components",
    `${contract.component}.json`,
  );
  if (roles.length !== 1 || !existsSync(file)) continue;
  const role = readJson(file).accessibility?.role;
  if (role !== undefined && role !== roles[0]) {
    hasErrors = true;
    console.error(
      `❌ ${name}: part role '${roles[0]}' differs from ${contract.component} accessibility.role '${role}'`,
    );
  }
}

if (hasErrors) process.exit(1);
console.log(
  `\n✅ ${contracts.length + patterns.length + bindings.length + bindingSuites.length} behavior file(s) match their schemas\n`,
);
