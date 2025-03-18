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
import { basename } from "path";
import { writeFile } from "fs/promises";
import { readJson, tokenFileNames } from "@adobe/spectrum-tokens";

const tokensData = [];
tokenFileNames.forEach(async (fileName) => {
  const jsonData = await readJson(fileName);
  JSONPath({
    path: "$.*",
    json: jsonData,
    callback: (payload, type, obj) => {
      const result = {
        tokenName: obj.parentProperty,
        fileName: basename(fileName, ".json"),
      };
      if (Object.hasOwn(payload, "uuid")) {
        result.uuid = payload.uuid;
      }
      if (Object.hasOwn(payload, "component")) {
        result.component = payload.component;
      }
      tokensData.push(result);
      return payload;
    },
  });
  if (tokensData.length > 0) {
    const csvData = tokensData.map((token) => {
      return `${token.tokenName},${token.fileName},${token.uuid || ""},${
        token.component || ""
      }`;
    });
    const csv = `tokenName,fileName,uuid,component\n${csvData.join("\n")}`;
    await writeFile("./tokenNames.csv", csv, "utf8");
    return csv;
  }
});
