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
import { readFile } from "fs/promises";

const readJSON = async (filePath) =>
  JSON.parse(await readFile(filePath, "utf8"));

const ajv = new Ajv();
addFormats(ajv);

ajv.addSchema(await readJSON("schemas/token-types/token.json"));
const validate = await ajv.compile(
  await readJSON("schemas/token-types/alias.json"),
);

test("Every token schema should validate against the definition", (t) => {
  const alias = {
    component: "swatch",
    $schema:
      "https://opensource.adobe.com/spectrum-tokens/schemas/token-types/alias.json",
    value: "{gray-900}",
    uuid: "7da5157d-7f25-405b-8de0-f3669565fb48",
  };
  if (!validate(alias)) {
    console.log(validate.errors);
  }
  t.pass();
});
