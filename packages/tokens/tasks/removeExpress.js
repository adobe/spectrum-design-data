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
  tokenFileNames,
  getFileTokens,
  writeJson,
  __dirname,
} from "../index.js";
import { resolve } from "path";

await Promise.all(
  tokenFileNames.map(async (tokenFileName) => {
    const tokenData = await getFileTokens(tokenFileName);
    for (const tokenName of Object.keys(tokenData)) {
      if (tokenData[tokenName]["$schema"].includes("system-set")) {
        const newTokenData = tokenData[tokenName].sets.spectrum;
        delete tokenData[tokenName].sets;
        tokenData[tokenName] = { ...tokenData[tokenName], ...newTokenData };
        console.log(`Updated ${tokenName}.`);
      }
    }
    writeJson(resolve(__dirname, "./src", tokenFileName), tokenData);
    console.log(`Updated ${tokenFileName}.`);
    return tokenData;
  }),
);
