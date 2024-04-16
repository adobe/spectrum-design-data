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
import { glob } from "glob";
import { readFile } from "fs/promises";
const fileNames = await glob("src/**/*.json");
const files = await Promise.all(
  fileNames.map(async (fileName) =>
    JSON.parse(await readFile(fileName, "utf8")),
  ),
);

const findDuplicateUUIDs = (json) => {
  const uuids = [];
  const duplicateUUIDs = [];
  const gather = (json, name) => {
    if (json.uuid) {
      if (uuids.includes(json.uuid)) {
        duplicateUUIDs.push({ uuid: json.uuid, name });
      }
      uuids.push(json.uuid);
    }
    Object.keys(json).forEach((key) => {
      if (typeof json[key] === "object") {
        gather(json[key], key);
      }
    });
  };
  gather(json);
  return duplicateUUIDs;
};

test("ensure uuids are unique", async (t) => {
  let allTokens = {};
  for (const file of files) {
    allTokens = { ...allTokens, ...file };
  }
  const duplicateUUIDs = findDuplicateUUIDs(allTokens);
  t.deepEqual(duplicateUUIDs, [], "duplicate uuids found");
});
