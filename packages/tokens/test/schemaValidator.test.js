/*
Copyright 2024 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

import test from "ava";
import Ajv from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { glob } from "glob";
import { readFile } from "fs/promises";

const readJSON = async (filePath) =>
  JSON.parse(await readFile(filePath, "utf8"));
const componentSchema = await readJSON("schemas/component.json");

const fileNames = await glob("schemas/components/*.json");
const files = await Promise.all(
  fileNames.map(async (fileName) => {
    return { fileName, json: await readJSON(fileName) };
  }),
);

const ajv = new Ajv();
addFormats(ajv);
ajv.addMetaSchema(componentSchema);
const schemaFiles = await glob("schemas/types/*.json");
for (const schemaFile of schemaFiles) {
  const schema = await readJSON(schemaFile);
  ajv.addSchema(schema);
}

for (const keyword of Object.keys(componentSchema.properties)) {
  ajv.addKeyword({ keyword, metaSchema: componentSchema.properties[keyword] });
}

test("component schema should be valid", async (t) => {
  const valid = ajv.validateSchema(componentSchema);
  t.true(valid);
});

test("Every component schema should validate against the definition", (t) => {
  let valid = true;
  for (const file of files) {
    if (!ajv.validateSchema(file.json)) {
      valid = false;
      console.log(`${file.fileName} failed validation`);
      console.log(ajv.errors);
    }
  }
  t.true(valid);
});

test("component examples should validate against the definition", (t) => {
  let valid = true;
  for (const file of files) {
    const validate = ajv.compile(file.json);
    if (!Object.hasOwn(file.json, "examples")) file.json.examples = [];
    for (const example of file.json.examples) {
      if (!validate(example)) {
        valid = false;
        console.log(`${file.fileName} failed validation`);
        console.log(validate.errors);
      }
    }
  }
  t.true(valid);
});
