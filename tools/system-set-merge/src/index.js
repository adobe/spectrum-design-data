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

import { JSONPath } from "jsonpath-plus";
import { glob } from "glob";
import { readFile, writeFile } from "fs/promises";
import { resolve } from "path";
import { format } from "prettier";

import * as url from "url";
const __dirname = url.fileURLToPath(new URL(".", import.meta.url));

const readJson = async (fileName) =>
  JSON.parse(await readFile(fileName, "utf8"));

const tokenFiles = await glob(
  `${resolve(__dirname, "../../../packages/tokens/src")}/**/*.json`,
);
const editedTokenNames = {};
tokenFiles.forEach(async (fileName) => {
  editedTokenNames[fileName] = [];
  const jsonData = await readJson(fileName);
  const result = JSONPath({
    path: '$..[?(@property === "express" && @parentProperty === "sets")]^^^',
    json: jsonData,
    callback: (payload, type, obj) => {
      const tokenName = obj.parentProperty;
      jsonData[tokenName] = {
        value: jsonData[tokenName].sets.spectrum.value,
        uuid: jsonData[tokenName].sets.spectrum.uuid,
      };
      delete jsonData[tokenName].sets;
      editedTokenNames[fileName].push(tokenName);
      return payload;
    },
  });
  if (editedTokenNames[fileName].length > 0) {
    console.log(
      `File: ${fileName} updated ${editedTokenNames[fileName].length} tokens`,
    );
    await writeFile(
      fileName,
      await format(JSON.stringify(jsonData), { parser: "json-stringify" }),
    );
  } else {
    console.log(`File: ${fileName} not updated`);
  }
});
