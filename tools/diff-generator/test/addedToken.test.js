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
import detectRenamedTokens from "../src/lib/renamed-token-detection.js";
import detectNewTokens from "../src/lib/added-token-detection.js";
import detectDeprecatedTokens from "../src/lib/deprecated-token-detection.js";
import { detailedDiff } from "deep-object-diff";
import original from "./test-schemas/basic-original-token.json" with { type: "json" };
import updated from "./test-schemas/new-token.json" with { type: "json" };
import originalSeveral from "./test-schemas/several-original-tokens.json" with { type: "json" };
import updatedSeveral from "./test-schemas/several-added-tokens.json" with { type: "json" };
import originalEntireSchema from "./test-schemas/entire-schema.json" with { type: "json" };
import addedRenamedTokens from "./test-schemas/added-renamed-tokens.json" with { type: "json" };
import basicSetToken from "./test-schemas/basic-set-token.json" with { type: "json" };
import addedSetToken from "./test-schemas/added-set-token.json" with { type: "json" };
import addedSeveralSetTokens from "./test-schemas/added-set-tokens-out-of-order.json" with { type: "json" };

const expectedOneToken = {
  "swatch-border-opacity": {
    component: "swatch",
    $schema:
      "https://opensource.adobe.com/spectrum-tokens/schemas/token-types/alias.json",
    value: "{gray-900}",
    uuid: "0e397a80-cf33-44ed-8b7d-1abaf4426bf5",
  },
};

const expectedSeveral = {
  "focus-indicator-color": {
    $schema:
      "https://opensource.adobe.com/spectrum-tokens/schemas/token-types/alias.json",
    value: "{blue-800}",
    uuid: "fe914904-a368-414b-a4ac-21c0b0340d05",
  },
  "static-white-focus-indicator-color": {
    $schema:
      "https://opensource.adobe.com/spectrum-tokens/schemas/token-types/alias.json",
    value: "{white}",
    uuid: "1dd6dc5b-47a2-41eb-80fc-f06293ae8e13",
  },
  "static-black-focus-indicator-color": {
    $schema:
      "https://opensource.adobe.com/spectrum-tokens/schemas/token-types/alias.json",
    value: "{black}",
    uuid: "c6b8275b-f44e-43b4-b763-82dda94d963c",
  },
  "overlay-color": {
    $schema:
      "https://opensource.adobe.com/spectrum-tokens/schemas/token-types/alias.json",
    value: "{black}",
    uuid: "af66daa6-9e52-4e68-a605-86d1de4ee971",
  },
};

const expectedNotRenamed = {
  "i-like-pizza": {
    component: "table",
    $schema:
      "https://opensource.adobe.com/spectrum-tokens/schemas/token-types/opacity.json",
    value: "0.07",
    uuid: "1234",
  },
  "hi-how-are-you": {
    component: "color-handle",
    $schema:
      "https://opensource.adobe.com/spectrum-tokens/schemas/token-types/opacity.json",
    value: "0.42",
    uuid: "234",
  },
};

const expectedAddedSetToken = {
  "help-text-top-to-workflow-icon-medium": {
    component: "help-text",
    $schema:
      "https://opensource.adobe.com/spectrum-tokens/schemas/token-types/token-set.json",
    sets: {
      desktop: {
        $schema:
          "https://opensource.adobe.com/spectrum-tokens/schemas/token-types/changing-two-schemas.json",
        value: "3px",
        uuid: "d159b313-4def-493a-adcf-398e2d1fce9f",
      },
      mobile: {
        $schema:
          "https://opensource.adobe.com/spectrum-tokens/schemas/token-types/dimension.json",
        value: "9px",
        uuid: "b690bd12-855e-444d-8b76-a7ae948e3f52",
      },
    },
    uuid: "86ac0bd3-7ea6-4f80-9c73-c0c77616f246",
  },
};

const expectedSeveralAddedSetTokens = {
  "background-layer-2-color": {
    $schema:
      "https://opensource.adobe.com/spectrum-tokens/schemas/token-types/color-set.json",
    sets: {
      light: {
        $schema:
          "https://opensource.adobe.com/spectrum-tokens/schemas/token-types/alias.json",
        value: "{gray-50}",
        uuid: "b7b2bf98-b96a-40ca-b51e-5876d3418085",
      },
      dark: {
        $schema:
          "https://opensource.adobe.com/spectrum-tokens/schemas/token-types/alias.json",
        value: "{gray-100}",
        uuid: "dd462fc7-bd79-4b52-9411-adf317832989",
      },
      darkest: {
        $schema:
          "https://opensource.adobe.com/spectrum-tokens/schemas/token-types/alias.json",
        value: "{gray-100}",
        uuid: "e30b7936-6ae7-4ada-8892-94a1f67d55c9",
      },
      wireframe: {
        $schema:
          "https://opensource.adobe.com/spectrum-tokens/schemas/token-types/alias.json",
        value: "{gray-50}",
        uuid: "6556a64d-5944-4d65-a6cc-9c6121044ac7",
      },
    },
  },
  "help-text-top-to-workflow-icon-medium": {
    component: "help-text",
    $schema:
      "https://opensource.adobe.com/spectrum-tokens/schemas/token-types/token-set.json",
    sets: {
      desktop: {
        $schema:
          "https://opensource.adobe.com/spectrum-tokens/schemas/token-types/changing-two-schemas.json",
        value: "3px",
        uuid: "d159b313-4def-493a-adcf-398e2d1fce9f",
      },
      mobile: {
        $schema:
          "https://opensource.adobe.com/spectrum-tokens/schemas/token-types/dimension.json",
        value: "9px",
        uuid: "b690bd12-855e-444d-8b76-a7ae948e3f52",
      },
    },
    uuid: "86ac0bd3-7ea6-4f80-9c73-c0c77616f246",
  },
  "neutral-background-color-selected-default": {
    $schema:
      "https://opensource.adobe.com/spectrum-tokens/schemas/token-types/system-set.json",
    sets: {
      spectrum: {
        $schema:
          "https://opensource.adobe.com/spectrum-tokens/schemas/token-types/alias.json",
        value: "{gray-700}",
        uuid: "fd1c9f2b-8358-4bd3-a5cc-d211673428bc",
      },
      express: {
        $schema:
          "https://opensource.adobe.com/spectrum-tokens/schemas/token-types/alias.json",
        value: "{gray-800}",
        deprecated: true,
        deprecated_comment:
          "Express will merge with Spectrum with the release of Spectrum 2.",
        uuid: "60caae29-d389-421e-a574-b26bcaeed3bf",
      },
    },
  },
};

test("basic test to see if new token was added", (t) => {
  const diff = detailedDiff(original, updated);
  const renamed = detectRenamedTokens(original, diff.added);
  t.deepEqual(
    detectNewTokens(
      renamed,
      detectDeprecatedTokens(renamed, diff),
      diff.added,
      original,
    ),
    expectedOneToken,
  );
});

test("several tokens in each schema test to see if new token was added", (t) => {
  const diff = detailedDiff(originalSeveral, updatedSeveral);
  const renamed = detectRenamedTokens(originalSeveral, diff.added);
  t.deepEqual(
    detectNewTokens(
      renamed,
      detectDeprecatedTokens(renamed, diff),
      diff.added,
      originalSeveral,
    ),
    expectedSeveral,
  );
});

test("adding several new and renamed tokens test", (t) => {
  const diff = detailedDiff(originalEntireSchema, addedRenamedTokens);
  const renamed = detectRenamedTokens(originalEntireSchema, diff.added);
  t.deepEqual(
    detectNewTokens(
      renamed,
      detectDeprecatedTokens(renamed, diff),
      diff.added,
      originalEntireSchema,
    ),
    expectedNotRenamed,
  );
});

test("adding a set token test", (t) => {
  const diff = detailedDiff(basicSetToken, addedSetToken);
  const renamed = detectRenamedTokens(basicSetToken, diff.added);
  t.deepEqual(
    detectNewTokens(
      renamed,
      detectDeprecatedTokens(renamed, diff),
      diff.added,
      basicSetToken,
    ),
    expectedAddedSetToken,
  );
});

test("adding several set tokens out of order", (t) => {
  const diff = detailedDiff(basicSetToken, addedSeveralSetTokens);
  const renamed = detectRenamedTokens(basicSetToken, diff.added);
  t.deepEqual(
    detectNewTokens(
      renamed,
      detectDeprecatedTokens(renamed, diff),
      diff.added,
      basicSetToken,
    ),
    expectedSeveralAddedSetTokens,
  );
});
