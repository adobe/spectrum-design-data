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
import test from "ava";
import { readFile } from "fs/promises";
import { resolve } from "path";
import { glob } from "glob";
import { createRequire } from "module";
import Ajv from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import * as url from "url";

const __dirname = url.fileURLToPath(new URL(".", import.meta.url));

const specPkgPath = createRequire(import.meta.url).resolve(
  "@adobe/design-data-spec/package.json",
);
const specPkgDir = resolve(specPkgPath, "..");
const componentsDir = resolve(specPkgDir, "components");

const readJSON = async (filePath) =>
  JSON.parse(await readFile(filePath, "utf8"));

let ajv;
let componentSchema;

test.before(async () => {
  componentSchema = await readJSON(
    resolve(specPkgDir, "schemas/component.schema.json"),
  );

  ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  ajv.addSchema(
    await readJSON(resolve(specPkgDir, "schemas/anatomy-part.schema.json")),
  );
  ajv.addSchema(
    await readJSON(
      resolve(specPkgDir, "schemas/state-declaration.schema.json"),
    ),
  );
});

test("all component files should validate against component.schema.json", async (t) => {
  const componentFiles = (await glob(`${componentsDir}/*.json`)).sort();
  const validate = ajv.compile(componentSchema);
  const failures = [];

  for (const filePath of componentFiles) {
    const data = await readJSON(filePath);
    const valid = validate(data);
    if (!valid) {
      failures.push({ file: filePath, errors: validate.errors });
    }
  }

  t.is(
    failures.length,
    0,
    `Schema validation failed:\n${failures
      .map((f) => `${f.file}:\n${JSON.stringify(f.errors, null, 2)}`)
      .join("\n\n")}`,
  );
});

test("all component files should have required metadata", async (t) => {
  const componentFiles = (await glob(`${componentsDir}/*.json`)).sort();
  const missing = [];

  for (const filePath of componentFiles) {
    const data = await readJSON(filePath);

    if (!data.name) missing.push(`${filePath}: missing name`);
    if (!data.displayName) missing.push(`${filePath}: missing displayName`);
    if (!data.meta?.category)
      missing.push(`${filePath}: missing meta.category`);
    if (!data.meta?.documentationUrl)
      missing.push(`${filePath}: missing meta.documentationUrl`);
  }

  t.is(missing.length, 0, `Missing required metadata:\n${missing.join("\n")}`);
});
