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
// key no longer starts with the component value. The cascade source of
// truth (packages/design-data/tokens/*.tokens.json) declares this explicitly
// via a pinned `legacyKey` alongside `anatomy`; read that exact set instead
// of loosely matching any anatomy-registry id prefix, since many ids (icon,
// label, field, item, ...) also legitimately prefix unrelated component keys.
const cascadeDecomposedKeys = new Set(
  ["color-component.tokens.json", "layout-component.tokens.json"].flatMap(
    (file) =>
      JSON.parse(
        readFileSync(
          new URL(`../../design-data/tokens/${file}`, import.meta.url),
        ),
      )
        .filter((t) => t.name?.anatomy && t.name?.legacyKey)
        .map((t) => t.name.legacyKey),
  ),
);

test("ensure all component tokens are have component data", async (t) => {
  const tokenData = {
    ...(await getFileTokens("color-component.json")),
    ...(await getFileTokens("layout-component.json")),
    ...(await getFileTokens("icons.json")),
  };
  const result = Object.keys(tokenData).filter((tokenName) => {
    if (cascadeDecomposedKeys.has(tokenName)) return false;
    const { component } = tokenData[tokenName];
    return !component || tokenName.indexOf(component) != 0;
  });
  t.deepEqual(result, []);
});
