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

import {
  getAllTokens,
  tokenFileNames,
  getFileTokens,
  writeJson,
  readJson,
} from "../index.js";
import { unlink } from "fs/promises";
import test from "ava";

test("the number of tokens in each file should match the number of tokens returned by getAllTokens", async (t) => {
  const allTokens = await getAllTokens();
  const countTotal = await Promise.all(tokenFileNames.map(getFileTokens)).then(
    (tokenFileDataAr) => {
      return tokenFileDataAr.reduce(
        (tokenCountAcc, tokenFileData) =>
          (tokenCountAcc += Object.keys(tokenFileData).length),
        0,
      );
    },
  );
  t.is(Object.keys(allTokens).length, countTotal);
});

test("writeJson should write a json file", async (t) => {
  const testJson = { test: "test" };
  const testTokenFileName = "test.json";
  await writeJson(testTokenFileName, testJson);
  const readTestJson = await readJson(testTokenFileName);
  await unlink(testTokenFileName);
  t.deepEqual(testJson, readTestJson);
});
