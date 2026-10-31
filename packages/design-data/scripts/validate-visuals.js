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
import Ajv2020 from "ajv/dist/2020.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const visualsDir = join(__dirname, "..", "visuals");

const require = createRequire(import.meta.url);
const specPkgPath = require.resolve("@adobe/design-data-spec/package.json");
const schema = JSON.parse(
  readFileSync(
    join(dirname(specPkgPath), "schemas", "component-visual.schema.json"),
    "utf-8",
  ),
);
const validate = new Ajv2020({ strict: false, allErrors: true }).compile(
  schema,
);

const files = readdirSync(visualsDir)
  .filter((f) => f.endsWith(".json"))
  .sort();

let hasErrors = false;
for (const file of files) {
  const recipe = JSON.parse(readFileSync(join(visualsDir, file), "utf-8"));
  if (validate(recipe)) {
    console.log(`✅ ${file}`);
    continue;
  }
  hasErrors = true;
  console.error(`❌ ${file}`);
  for (const err of validate.errors) {
    console.error(`   ${err.instancePath || "root"}: ${err.message}`);
  }
}

if (hasErrors) process.exit(1);
console.log(`\n✅ ${files.length} visual recipe(s) match the schema\n`);
