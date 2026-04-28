/*
Copyright {{ now() | date(format="%Y") }} Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

import test from "ava";
import { detailedDiff } from "../src/lib/diff.js";
import detectRenamedTokens from "../src/lib/renamed-token-detection.js";
import { loadTestSchema } from "./utils/json-loader.js";

const original = loadTestSchema("basic-original-token.json");
const updated = loadTestSchema("basic-renamed-token.json");
const originalTwoOrMore = loadTestSchema("several-original-tokens.json");
const updatedTwoOrMore = loadTestSchema("several-renamed-tokens.json");
const originalEntireSchema = loadTestSchema("entire-schema.json");
const updatedEntireSchema = loadTestSchema("entire-schema-renamed.json");
const basicSetToken = loadTestSchema("basic-set-token.json");
const renamedSetToken = loadTestSchema("basic-renamed-set-token.json");
const severalSetTokens = loadTestSchema("several-set-tokens.json");
const severalRenamedSetTokens = loadTestSchema(
  "several-renamed-set-tokens.json",
);

const expectedSingleRenamed = {
  "hello-world": {
    "old-name": "swatch-border-color",
  },
};

const expectedTwoRenamed = {
  "swatch-color": {
    "old-name": "swatch-border-color",
  },
  "swatch-opacity": {
    "old-name": "swatch-border-opacity",
  },
};

const expectedSeveralRenamed = {
  "swatch-opacity": {
    "old-name": "swatch-border-opacity",
  },
  "swatch-disabled-border-color": {
    "old-name": "swatch-disabled-icon-border-color",
  },
  "table-col-hover-color": {
    "old-name": "table-row-hover-color",
  },
  "table-col-hover-opacity": {
    "old-name": "table-row-hover-opacity",
  },
  "table-selected-row-background-opacity-definitely-emphasized": {
    "old-name": "table-selected-row-background-opacity-non-emphasized",
  },
  "table-selected-row-background-opacity-ultra-emphasized-hover": {
    "old-name": "table-selected-row-background-opacity-non-emphasized-hover",
  },
};

const expectedSetTokenRenamed = {
  "i-like-lavendar-latte": {
    "old-name": "overlay-opacity",
  },
};

const expectedSeveralSetTokensRenamed = {
  "i-like-fish-tacos": {
    "old-name": "status-light-dot-size-extra-large",
  },
  "i-like-scrambled-eggs": {
    "old-name": "status-light-top-to-dot-large",
  },
};

test("basic test to see if diff catches rename", (t) => {
  t.deepEqual(
    detectRenamedTokens(original, detailedDiff(original, updated).added),
    expectedSingleRenamed,
  );
});

test("several tokens in each schema test to see if diff catches rename", (t) => {
  t.deepEqual(
    detectRenamedTokens(
      originalTwoOrMore,
      detailedDiff(originalTwoOrMore, updatedTwoOrMore).added,
    ),
    expectedTwoRenamed,
  );
});

test("existing test to see if diff catches rename", (t) => {
  t.deepEqual(
    detectRenamedTokens(
      originalEntireSchema,
      detailedDiff(originalEntireSchema, updatedEntireSchema).added,
    ),
    expectedSeveralRenamed,
  );
});

test("renamed set token", (t) => {
  t.deepEqual(
    detectRenamedTokens(
      basicSetToken,
      detailedDiff(basicSetToken, renamedSetToken).added,
    ),
    expectedSetTokenRenamed,
  );
});

test("renamed several set tokens", (t) => {
  t.deepEqual(
    detectRenamedTokens(
      severalSetTokens,
      detailedDiff(severalSetTokens, severalRenamedSetTokens).added,
    ),
    expectedSeveralSetTokensRenamed,
  );
});
