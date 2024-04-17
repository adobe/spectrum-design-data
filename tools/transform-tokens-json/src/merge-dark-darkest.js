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

import { JSONPath } from "jsonpath-plus";
import { readJson, writeJson, tokenFileNames } from "./lib/shared.js";

const editedTokenNames = {};
tokenFileNames.forEach(async (fileName) => {
  editedTokenNames[fileName] = [];
  const jsonData = await readJson(fileName);
  const result = JSONPath({
    path: '$..[?(@property === "darkest" && @parentProperty === "sets")]^^^',
    json: jsonData,
    callback: (payload, type, obj) => {
      const tokenName = obj.parentProperty;
      jsonData[tokenName].sets.dark = {
        value: jsonData[tokenName].sets.darkest.value,
        uuid: jsonData[tokenName].sets.darkest.uuid,
      };
      delete jsonData[tokenName].sets.darkest;
      editedTokenNames[fileName].push(tokenName);
      return payload;
    },
  });
  if (editedTokenNames[fileName].length > 0) {
    await writeJson(fileName, jsonData);
    console.log(
      `File: ${fileName} updated ${editedTokenNames[fileName].length} tokens`,
    );
  } else {
    console.log(`File: ${fileName} not updated`);
  }
});
