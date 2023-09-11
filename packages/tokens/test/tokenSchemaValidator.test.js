/*
Copyright 2023 Adobe. All rights reserved.
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

const ajv = new Ajv();
addFormats(ajv);

test.before(async (t) => {
  const schemaFileNames = await glob("schemas/token-types/*.json");
  const schemaIds = await Promise.all(
    schemaFileNames.map(async (fileName) => {
      const json = await readJSON(fileName);
      try {
        ajv.addSchema(json, json["$id"]);
      } catch (error) {
        console.log(error);
        console.log(`${fileName} error with $id ${json["$id"]}`);
      }
      return json["$id"];
    }),
  );
  t.context.schemaIds = schemaIds;

  const tokenFilesNames = await glob("src/*.json");
  t.context.tokenFiles = await Promise.all(
    tokenFilesNames.map(async (tokenFile) => {
      return { fileName: tokenFile, data: await readJSON(tokenFile) };
    }),
  );
});

test("Schema should compile without errors", async (t) => {
  try {
    const validate = await ajv.compile({
      $schema: "https://json-schema.org/draft/2020-12/schema",
      type: "object",
      patternProperties: {
        "^(?:(?:[a-z]|\\d)+-?)*(?:[a-z]|\\d)+$": {
          anyOf: t.context.schemaIds.map((schemaId) => ({ $ref: schemaId })),
        },
      },
    });
  } catch (error) {
    console.log(error);
  }
  t.pass();
});

test("Every token should have a $schema property", (t) => {
  t.context.tokenFiles.forEach((tokenFileObj) => {
    Object.keys(tokenFileObj.data).forEach((tokenName) => {
      t.true(
        Object.hasOwn(tokenFileObj.data[tokenName], "$schema"),
        `${tokenName} in ${tokenFileObj.fileName} does not have a $schema property.`,
      );
    });
  });
});

test("Every token schema should validate against the definition", (t) => {
  const errors = [];
  t.context.tokenFiles.forEach((tokenFileObj) => {
    Object.keys(tokenFileObj.data).forEach((tokenName) => {
      if (
        !ajv.validate(
          tokenFileObj.data[tokenName]["$schema"],
          tokenFileObj.data[tokenName],
        )
      ) {
        t.log(`${tokenName} in ${tokenFileObj.fileName} failed validation.`);
        errors.push({
          tokenName,
          fileName: tokenFileObj.fileName,
          errors: ajv.errors,
        });
      }
    });
  });
  t.deepEqual(errors, []);
});
