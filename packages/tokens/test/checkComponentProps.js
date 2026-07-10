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

import { readFileSync } from "node:fs";
import test from "ava";
import { getFileTokens } from "../index.js";

// Anatomy sub-part tokens (e.g. tab-item-*) keep their legacy key (the
// sub-part name) but carry their real parent component (e.g. "tabs"), so the
// key no longer starts with the component value. Recognize the sub-part
// prefix via the anatomy registry rather than failing.
const anatomyIds = JSON.parse(
  readFileSync(
    new URL("../../design-data/registry/anatomy-terms.json", import.meta.url),
  ),
).values.map((v) => v.id);

test("ensure all component tokens are have component data", async (t) => {
  const tokenData = {
    ...(await getFileTokens("color-component.json")),
    ...(await getFileTokens("layout-component.json")),
    ...(await getFileTokens("icons.json")),
  };
  const result = Object.keys(tokenData).filter((tokenName) => {
    const { component } = tokenData[tokenName];
    if (!component) return true;
    if (tokenName.indexOf(component) === 0) return false;
    return !anatomyIds.some(
      (id) => tokenName === id || tokenName.startsWith(`${id}-`),
    );
  });
  t.deepEqual(result, []);
});
