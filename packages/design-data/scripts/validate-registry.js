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

import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import Ajv from "ajv";
import addFormats from "ajv-formats";

const __dirname = dirname(fileURLToPath(import.meta.url));
const registryDir = join(__dirname, "..", "registry");

// Resolve registry-value.json from @adobe/design-data-spec
const require = createRequire(import.meta.url);
const specPkgPath = require.resolve("@adobe/design-data-spec/package.json");
const schemaPath = join(dirname(specPkgPath), "schemas", "registry-value.json");

const ajv = new Ajv({ strict: false, allErrors: true });
addFormats(ajv);

const schema = JSON.parse(readFileSync(schemaPath, "utf-8"));
const validate = ajv.compile(schema);

let hasErrors = false;

console.log("🔍 Validating spectrum-design-data registry...\n");

const registryFiles = readdirSync(registryDir)
  .filter((f) => f.endsWith(".json"))
  .sort();

for (const file of registryFiles) {
  const filePath = join(registryDir, file);
  const registry = JSON.parse(readFileSync(filePath, "utf-8"));

  console.log(`📄 Validating ${file}...`);

  const valid = validate(registry);
  if (!valid) {
    console.error(`  ❌ Schema validation failed:`);
    validate.errors.forEach((err) => {
      console.error(`     ${err.instancePath}: ${err.message}`);
    });
    hasErrors = true;
    continue;
  }

  const ids = new Set();
  const duplicateIds = [];
  for (const value of registry.values) {
    if (ids.has(value.id)) duplicateIds.push(value.id);
    ids.add(value.id);
  }
  if (duplicateIds.length > 0) {
    console.error(`  ❌ Duplicate IDs found: ${duplicateIds.join(", ")}`);
    hasErrors = true;
  }

  const aliases = new Map();
  for (const value of registry.values) {
    if (value.aliases) {
      for (const alias of value.aliases) {
        if (aliases.has(alias)) {
          console.error(
            `  ❌ Duplicate alias "${alias}" in ${value.id} (also used by ${aliases.get(alias)})`,
          );
          hasErrors = true;
        }
        aliases.set(alias, value.id);
      }
    }
  }

  const defaults = registry.values.filter((v) => v.default === true);
  if (defaults.length > 1) {
    console.error(
      `  ❌ Multiple default values: ${defaults.map((d) => d.id).join(", ")}`,
    );
    hasErrors = true;
  }

  for (const value of registry.values) {
    if (value.relatedTerms) {
      for (const relatedId of value.relatedTerms) {
        if (!ids.has(relatedId)) {
          console.error(
            `  ❌ Invalid relatedTerm "${relatedId}" in ${value.id}`,
          );
          hasErrors = true;
        }
      }
    }
    if (value.governance?.replacedBy && !ids.has(value.governance.replacedBy)) {
      console.error(
        `  ❌ Invalid governance.replacedBy "${value.governance.replacedBy}" in ${value.id}`,
      );
      hasErrors = true;
    }
  }

  if (!hasErrors) {
    console.log(`  ✅ Valid (${registry.values.length} values)`);
  }
  console.log("");
}

if (hasErrors) {
  console.error("❌ Validation failed with errors\n");
  process.exit(1);
} else {
  console.log("✅ All registry files validated successfully\n");
}
