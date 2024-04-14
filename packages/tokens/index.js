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
import { writeFile } from "fs/promises";
import { format } from "prettier";

export const __dirname = url.fileURLToPath(new URL(".", import.meta.url));

export const tokenFileNames = await glob(
  `${resolve(__dirname, "./src")}/**/*.json`,
);

export const readJson = async (fileName) =>
  JSON.parse(await readFile(fileName, "utf8"));

export const writeJson = async (fileName, jsonData) => {
  await writeFile(
    fileName,
    await format(JSON.stringify(jsonData), { parser: "json-stringify" }),
  );
};

export const getFileTokens = async (tokenFileName) =>
  await readJson(resolve(__dirname, "src", tokenFileName));

export const getAllTokens = async () => {
  return await Promise.all(tokenFileNames.map(getFileTokens)).then(
    (tokenFileDataAr) => {
      return tokenFileDataAr.reduce(
        (tokenDataAcc, tokenFileData) => ({
          ...tokenDataAcc,
          ...tokenFileData,
        }),
        {},
      );
    },
  );
};
