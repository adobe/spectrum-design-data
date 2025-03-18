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
import { getAllTokens, isDeprecated } from "../index.js";

test("Single set properties shouldn't be deprecated", async (t) => {
  const tokens = await getAllTokens();
  for (const [tokenName, token] of Object.entries(tokens)) {
    if (
      Object.hasOwn(token, "sets") &&
      !isDeprecated(token) &&
      JSON.stringify(token.sets).indexOf("deprecated") > -1
    ) {
      t.truthy(
        Object.values(token.sets).every((setValue) =>
          Object.hasOwn(setValue, "deprecated"),
        ),
      );
    }
  }
  t.pass();
});

test("Sets should have unique values", async (t) => {
  const tokens = await getAllTokens();
  const result = Object.keys(tokens).filter((tokenName) => {
    const token = tokens[tokenName];
    if (Object.hasOwn(token, "sets") && !isDeprecated(token)) {
      const setValues = Object.keys(token.sets).reduce(
        (accumulator, currentValue) =>
          currentValue != "wireframe"
            ? [...accumulator, token.sets[currentValue].value]
            : accumulator,
        [],
      );
      if (setValues.length != new Set(setValues).size) {
        return true;
      }
    } else {
      return false;
    }
  });
  t.deepEqual(result, [], `${result.length} Duplicate sets found`);
});
