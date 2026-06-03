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
import { readFile } from "fs/promises";

const readJSON = async (filePath) =>
  JSON.parse(await readFile(filePath, "utf8"));

const ajv = new Ajv();
addFormats(ajv);

ajv.addSchema(await readJSON("schemas/token-types/token.json"));
const validate = await ajv.compile(
  await readJSON("schemas/token-types/alias.json"),
);

const ALIAS_SCHEMA =
  "https://opensource.adobe.com/spectrum-design-data/schemas/token-types/alias.json";

test("cascade $ref-only alias validates (oneOf cascade branch)", (t) => {
  const alias = {
    $schema: ALIAS_SCHEMA,
    $ref: "87a2c8f0-54fd-4939-8f42-3124fde1e49e",
    uuid: "f24eb871-6419-4cef-88a2-cca8548ae31e",
  };
  const valid = validate(alias);
  if (!valid) {
    t.log("Validation errors:", validate.errors);
  }
  t.true(valid, "cascade alias with $ref and uuid must validate");
});

test("legacy value-form alias validates (oneOf legacy branch)", (t) => {
  const alias = {
    component: "swatch",
    $schema: ALIAS_SCHEMA,
    value: "{gray-900}",
    uuid: "7da5157d-7f25-405b-8de0-f3669565fb48",
  };
  const valid = validate(alias);
  if (!valid) {
    t.log("Validation errors:", validate.errors);
  }
  t.true(valid, "legacy alias with value:'{name}' and uuid must validate");
});

test("alias with both $ref and value is rejected by oneOf", (t) => {
  const alias = {
    $schema: ALIAS_SCHEMA,
    $ref: "87a2c8f0-54fd-4939-8f42-3124fde1e49e",
    value: "{gray-900}",
    uuid: "f24eb871-6419-4cef-88a2-cca8548ae31e",
  };
  t.false(
    validate(alias),
    "alias carrying both $ref and value must be rejected (oneOf not both)",
  );
});

test("legacy value with illegal characters in braces is rejected", (t) => {
  const alias = {
    $schema: ALIAS_SCHEMA,
    // Dots and slashes are not allowed inside {…} by the legacy pattern.
    value: "{a.b}",
    uuid: "7da5157d-7f25-405b-8de0-f3669565fb48",
  };
  t.false(
    validate(alias),
    "value:'{a.b}' violates the \\{(\\w|-)*\\} pattern and must be rejected",
  );
});
