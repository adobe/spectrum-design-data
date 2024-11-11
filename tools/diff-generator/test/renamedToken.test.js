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
import original from "./test-schemas/basic-original-token.json" with { type: "json" };
import updated from "./test-schemas/basic-renamed-token.json" with { type: "json" };
import originalTwoOrMore from "./test-schemas/several-original-tokens.json" with { type: "json" };
import updatedTwoOrMore from "./test-schemas/several-renamed-tokens.json" with { type: "json" };
import originalEntireSchema from "./test-schemas/entire-schema.json" with { type: "json" };
import updatedEntireSchema from "./test-schemas/entire-schema-renamed.json" with { type: "json" };
import basicSetToken from "./test-schemas/basic-set-token.json" with { type: "json" };
import renamedSetToken from "./test-schemas/basic-renamed-set-token.json" with { type: "json" };
import severalSetTokens from "./test-schemas/several-set-tokens.json" with { type: "json" };
import severalRenamedSetTokens from "./test-schemas/several-renamed-set-tokens.json" with { type: "json" };

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
