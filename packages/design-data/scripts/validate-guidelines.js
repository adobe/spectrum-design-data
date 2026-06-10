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
import addFormats from "ajv-formats";

const __dirname = dirname(fileURLToPath(import.meta.url));
const guidelinesDir = join(__dirname, "..", "guidelines");

const require = createRequire(import.meta.url);
const specPkgPath = require.resolve("@adobe/design-data-spec/package.json");
const specSchemasDir = join(dirname(specPkgPath), "schemas");
const schemaPath = join(specSchemasDir, "guideline.schema.json");
const docBlockSchemaPath = join(specSchemasDir, "document-block.schema.json");

const ajv = new Ajv2020({ strict: false, allErrors: true });
addFormats(ajv);

// Add the document-block schema so the $ref resolves
const docBlockSchema = JSON.parse(readFileSync(docBlockSchemaPath, "utf-8"));
ajv.addSchema(docBlockSchema);

const schema = JSON.parse(readFileSync(schemaPath, "utf-8"));
const validate = ajv.compile(schema);

let hasErrors = false;

console.log("🔍 Validating spectrum-design-data guidelines...\n");

const files = readdirSync(guidelinesDir)
  .filter((f) => f.endsWith(".json") && f !== "manifest.json")
  .sort();

for (const file of files) {
  const filePath = join(guidelinesDir, file);
  const guideline = JSON.parse(readFileSync(filePath, "utf-8"));

  console.log(`📄 Validating ${file}...`);

  const valid = validate(guideline);
  if (!valid) {
    console.error(`  ❌ Schema validation failed:`);
    for (const err of validate.errors) {
      console.error(`     ${err.instancePath || "root"}: ${err.message}`);
    }
    hasErrors = true;
  } else {
    console.log(`  ✅ Valid (${guideline.documentBlocks?.length ?? 0} blocks)`);
  }
}

if (files.length === 0) {
  console.log(
    "  ⚠️  No guideline files found — run: node src/cli.js guideline",
  );
}

if (hasErrors) {
  console.error("\n❌ Validation failed with errors\n");
  process.exit(1);
} else {
  console.log(
    `\n✅ All ${files.length} guideline file(s) validated successfully\n`,
  );
}
