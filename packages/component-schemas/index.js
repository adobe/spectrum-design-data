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

import { glob } from "glob";
import { resolve } from "path";
import { readFile } from "fs/promises";
import * as url from "url";

export const readJson = async (fileName) =>
  JSON.parse(await readFile(fileName, "utf8"));

const __dirname = url.fileURLToPath(new URL(".", import.meta.url));

export const schemaFileNames = await glob(
  `${resolve(__dirname, "./schemas")}/**/*.json`,
);

export const getSchemaFile = async (schemaFileName) =>
  await readJson(resolve(__dirname, "src", schemaFileName));

export const getAllSchemas = async () => {
  return await Promise.all(schemaFileNames.map(getSchemaFile));
};
