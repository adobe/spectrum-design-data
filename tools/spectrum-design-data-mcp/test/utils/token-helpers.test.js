/*
Copyright 2026 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

import test from "ava";
import {
  findComponentTokens,
  findSemanticColorsByIntent,
  findSemanticColorsByVariant,
  findTokensByUseCase,
  groupTokensByCategory,
  tokenNameMatchesIntent,
  tokenNameMatchesVariant,
} from "../../src/utils/token-helpers.js";

test("findComponentTokens returns tokens matching component name", (t) => {
  const tokenData = {
    "color-component.json": {
      "action-button-background": { value: "#fff", description: "Bg" },
      "other-token": { value: "#000" },
    },
  };
  const result = findComponentTokens(tokenData, "action-button");
  t.is(result.length, 1);
  t.is(result[0].name, "action-button-background");
});

test("findComponentTokens excludes private when option set", (t) => {
  const tokenData = {
    "color.json": {
      "button-secret": { value: "#fff", private: true },
      "button-public": { value: "#000" },
    },
  };
  const result = findComponentTokens(tokenData, "button", {
    excludePrivate: true,
  });
  t.is(result.length, 1);
  t.is(result[0].name, "button-public");
});

test("findComponentTokens skips invalid token data", (t) => {
  const tokenData = {
    "a.json": null,
    "b.json": { x: { value: 1 } },
  };
  const result = findComponentTokens(tokenData, "x");
  t.is(result.length, 1);
});

test("tokenNameMatchesIntent uses direct match", (t) => {
  t.true(tokenNameMatchesIntent("primary-background", "primary"));
});

test("tokenNameMatchesIntent uses semantic mapping for error->negative", (t) => {
  t.true(tokenNameMatchesIntent("negative-color", "error"));
});

test("findSemanticColorsByIntent returns limited results", (t) => {
  const semantic = {
    "primary-100": { value: "#111" },
    "primary-200": { value: "#222" },
    "primary-300": { value: "#333" },
    "primary-400": { value: "#444" },
    "primary-500": { value: "#555" },
  };
  const result = findSemanticColorsByIntent(semantic, "primary", 2);
  t.is(result.length, 2);
});

test("findSemanticColorsByVariant uses variant mappings", (t) => {
  const semantic = {
    "accent-fill": { value: "#blue" },
  };
  const result = findSemanticColorsByVariant(semantic, "accent", 5);
  t.is(result.length, 1);
  t.is(result[0].name, "accent-fill");
});

test("tokenNameMatchesVariant uses mapping", (t) => {
  t.true(tokenNameMatchesVariant("accent-fill", "accent"));
});

test("findTokensByUseCase matches name and description", (t) => {
  const tokenData = {
    "color.json": {
      "button-bg": { value: "#fff", description: "Button background color" },
    },
  };
  const result = findTokensByUseCase(tokenData, "button", 10);
  t.is(result.length, 1);
});

test("groupTokensByCategory groups by category", (t) => {
  const tokens = [
    { category: "a", name: "1" },
    { category: "a", name: "2" },
    { category: "b", name: "3" },
  ];
  const grouped = groupTokensByCategory(tokens);
  t.deepEqual(Object.keys(grouped).sort(), ["a", "b"]);
  t.is(grouped.a.length, 2);
  t.is(grouped.b.length, 1);
});

test("groupTokensByCategory returns empty object for non-array", (t) => {
  t.deepEqual(groupTokensByCategory(null), {});
});
