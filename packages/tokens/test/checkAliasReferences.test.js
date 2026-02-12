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

const ALIAS_PATTERN = /^\{([^}]+)\}$/;

function collectAliasRefs(obj, path = "") {
  const refs = [];
  if (typeof obj.value === "string") {
    const match = obj.value.match(ALIAS_PATTERN);
    if (match) {
      refs.push({ ref: match[1], path: path || "value" });
    }
  }
  if (obj.sets) {
    for (const [setName, setValue] of Object.entries(obj.sets)) {
      refs.push(...collectAliasRefs(setValue, `${path}sets.${setName}.`));
    }
  }
  return refs;
}

test("every alias reference should resolve to an existing token", async (t) => {
  const tokens = await getAllTokens();
  const allTokenNames = new Set(Object.keys(tokens));
  const invalid = [];

  for (const [tokenName, token] of Object.entries(tokens)) {
    const refs = collectAliasRefs(token);
    for (const { ref, path } of refs) {
      if (!allTokenNames.has(ref)) {
        invalid.push({ token: tokenName, ref, path });
      }
    }
  }

  t.deepEqual(
    invalid,
    [],
    `${invalid.length} alias references point to non-existent tokens`,
  );
});
