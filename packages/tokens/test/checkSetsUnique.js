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
import { getAllTokens } from "../index.js";

test("getAllTokens", async (t) => {
  const tokens = await getAllTokens();
  console.log(tokens);
  for (const [tokenName, token] of Object.entries(tokens)) {
    if (
      Object.hasOwn(token, "sets") &&
      !Object.hasOwn(token, "deprecated") &&
      JSON.stringify(token.sets).indexOf("deprecated") > -1
    ) {
      console.log(tokenName);
    }
  }
  t.fail();
});
