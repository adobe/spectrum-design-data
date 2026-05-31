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
import {
  buildTokenMap,
  buildTokenFileMap,
  getTokenPageForName,
  getTokenDisplayInfo,
} from "../src/token-resolver.js";

test("buildTokenMap creates a map of token names to token data", async (t) => {
  const tokenMap = await buildTokenMap();
  t.true(tokenMap instanceof Map, "Should return a Map");
  t.true(tokenMap.size > 0, "Should contain tokens");
});

test("buildTokenFileMap creates a map of token names to file keys", async (t) => {
  const fileMap = await buildTokenFileMap();
  t.true(fileMap instanceof Map, "Should return a Map");
  t.true(fileMap.size > 0, "Should contain token file mappings");
});

test("getTokenPageForName returns correct path for existing token", async (t) => {
  const fileMap = await buildTokenFileMap();
  // Get a token name from the map
  const tokenName = fileMap.keys().next().value;
  if (tokenName) {
    const path = getTokenPageForName(fileMap, tokenName);
    t.true(
      typeof path === "string",
      "Should return a string path for existing token",
    );
    t.true(path.startsWith("/tokens/"), "Path should start with /tokens/");
    t.true(path.includes("#"), "Path should include anchor");
  } else {
    t.pass("No tokens to test");
  }
});

test("getTokenPageForName returns null for non-existent token", async (t) => {
  const fileMap = await buildTokenFileMap();
  const path = getTokenPageForName(fileMap, "non-existent-token-12345");
  t.is(path, null, "Should return null for non-existent token");
});

test("getTokenDisplayInfo handles alias references", async (t) => {
  const tokenMap = await buildTokenMap();
  const fileMap = await buildTokenFileMap();

  // Find a token with an alias value
  let tokenWithAlias = null;
  let tokenName = null;
  for (const [name, token] of tokenMap.entries()) {
    if (
      token &&
      typeof token.value === "string" &&
      token.value.startsWith("{") &&
      token.value.endsWith("}")
    ) {
      tokenWithAlias = token;
      tokenName = name;
      break;
    }
  }

  if (tokenWithAlias && tokenName) {
    const info = getTokenDisplayInfo(
      tokenMap,
      fileMap,
      tokenName,
      tokenWithAlias,
    );
    t.true(typeof info === "object", "Should return an object");
    t.true("value" in info, "Should include value");
    t.true("resolved" in info, "Should include resolved");
    t.true("valueLink" in info, "Should include valueLink");
    t.true("renamedLink" in info, "Should include renamedLink");
  } else {
    t.pass("No alias tokens found to test");
  }
});

test("getTokenDisplayInfo handles renamed tokens", async (t) => {
  const tokenMap = await buildTokenMap();
  const fileMap = await buildTokenFileMap();

  // Find a token with a renamed property
  let tokenWithRenamed = null;
  let tokenName = null;
  for (const [name, token] of tokenMap.entries()) {
    if (token && token.renamed) {
      tokenWithRenamed = token;
      tokenName = name;
      break;
    }
  }

  if (tokenWithRenamed && tokenName) {
    const info = getTokenDisplayInfo(
      tokenMap,
      fileMap,
      tokenName,
      tokenWithRenamed,
    );
    t.true(typeof info === "object", "Should return an object");
    t.true(
      info.renamedLink !== undefined,
      "Should include renamedLink for renamed tokens",
    );
  } else {
    t.pass("No renamed tokens found to test");
  }
});

test("getTokenDisplayInfo handles tokens without aliases", async (t) => {
  const tokenMap = await buildTokenMap();
  const fileMap = await buildTokenFileMap();

  // Find a token without an alias
  let tokenWithoutAlias = null;
  let tokenName = null;
  for (const [name, token] of tokenMap.entries()) {
    if (
      token &&
      token.value &&
      typeof token.value === "string" &&
      !token.value.startsWith("{")
    ) {
      tokenWithoutAlias = token;
      tokenName = name;
      break;
    }
  }

  if (tokenWithoutAlias && tokenName) {
    const info = getTokenDisplayInfo(
      tokenMap,
      fileMap,
      tokenName,
      tokenWithoutAlias,
    );
    t.true(typeof info === "object", "Should return an object");
    t.true("value" in info, "Should include value");
    t.true("resolved" in info, "Should include resolved");
    // valueLink should be null for non-alias values
    t.true(
      info.valueLink === null || typeof info.valueLink === "string",
      "valueLink should be null or string",
    );
  } else {
    t.pass("No non-alias tokens found to test");
  }
});

test("getTokenDisplayInfo handles missing token references gracefully", async (t) => {
  const tokenMap = await buildTokenMap();
  const fileMap = await buildTokenFileMap();

  // Create a fake token with a non-existent alias
  const fakeToken = {
    value: "{non-existent-token-12345}",
  };
  const info = getTokenDisplayInfo(tokenMap, fileMap, "fake-token", fakeToken);
  t.true(
    typeof info === "object",
    "Should return an object even for missing references",
  );
  t.true("value" in info, "Should include value");
  t.true("resolved" in info, "Should include resolved");
});

test("getTokenDisplayInfo resolves nested sets to scalar values per set", async (t) => {
  const tokenMap = await buildTokenMap();
  const fileMap = await buildTokenFileMap();

  const tokenName = "accent-background-color-default";
  const token = tokenMap.get(tokenName);
  t.true(!!token, "accent-background-color-default should exist in token map");
  t.true(
    !!token.sets,
    "Token should have sets (alias chain through nested sets)",
  );

  const info = getTokenDisplayInfo(tokenMap, fileMap, tokenName, token);
  t.true(typeof info.resolved === "object", "Resolved should be an object");
  t.false(Array.isArray(info.resolved), "Resolved should not be an array");

  for (const [setName, setValue] of Object.entries(info.resolved)) {
    const resolved =
      setValue && typeof setValue === "object" && "resolved" in setValue
        ? setValue.resolved
        : setValue;
    t.true(
      typeof resolved === "string",
      `Set "${setName}" should resolve to a string (e.g. rgb(...)), got ${typeof resolved}`,
    );
    t.false(
      resolved === "[object Object]" || resolved.includes("[object Object]"),
      `Set "${setName}" must not be [object Object]`,
    );
  }
});
