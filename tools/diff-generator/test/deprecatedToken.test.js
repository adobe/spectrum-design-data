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
import detectDeprecatedTokens from "../src/lib/deprecated-token-detection.js";
import detectRenamedTokens from "../src/lib/renamed-token-detection.js";
import { detailedDiff } from "deep-object-diff";
import original from "./test-schemas/basic-original-token.json" with { type: "json" };
import deprecatedToken from "./test-schemas/deprecated-token.json" with { type: "json" };
import severalOriginalTokens from "./test-schemas/several-original-tokens.json" with { type: "json" };
import severalDeprecatedTokens from "./test-schemas/several-deprecated-tokens.json" with { type: "json" };
import severalRenamedDeprecatedTokens from "./test-schemas/several-renamed-deprecated-tokens.json" with { type: "json" };
import severalAddedDeprecatedTokens from "./test-schemas/added-deprecated-token.json" with { type: "json" };

const expected = {
  deprecated: {
    "swatch-border-color": {
      deprecated: true,
      deprecated_comment: "insert random deprecated comment",
    },
  },
  reverted: {},
};

const expectedSeveralDeprecated = {
  deprecated: {
    "swatch-border-opacity": {
      deprecated: true,
      deprecated_comment: "insert random deprecated comment",
    },
    "focus-indicator-color": {
      deprecated: true,
      deprecated_comment: "insert random deprecated comment",
      $schema:
        "https://opensource.adobe.com/spectrum-tokens/schemas/token-types/alias.json",
      value: "{blue-800}",
      uuid: "fe914904-a368-414b-a4ac-21c0b0340d05",
    },
  },
  reverted: {},
};

const expectedRenamedDeprecated = {
  deprecated: {},
  reverted: {},
}; // no new deprecated tokens

const expectedAddedDeprecated = {
  deprecated: {
    "i-like-mochi": {
      deprecated: true,
      deprecated_comment: "insert random deprecated comment",
      $schema:
        "https://opensource.adobe.com/spectrum-tokens/schemas/token-types/alias.json",
      value: "{blue-800}",
      uuid: "4567",
    },
    "i-like-burgers": {
      deprecated: true,
      deprecated_comment: "insert random deprecated comment",
      $schema:
        "https://opensource.adobe.com/spectrum-tokens/schemas/token-types/alias.json",
      value: "{blue-800}",
      uuid: "1234",
    },
  },
  reverted: {},
};

const expectedReverted = {
  deprecated: {},
  reverted: {
    "swatch-border-color": {
      deprecated: undefined,
      deprecated_comment: undefined,
    },
  },
};

test("basic test to see deprecated token", (t) => {
  t.deepEqual(
    detectDeprecatedTokens(
      detectRenamedTokens(original, deprecatedToken),
      detailedDiff(original, deprecatedToken),
    ),
    expected,
  );
});

test("several tokens to see if deprecated token is found", (t) => {
  t.deepEqual(
    detectDeprecatedTokens(
      detectRenamedTokens(severalOriginalTokens, severalDeprecatedTokens),
      detailedDiff(severalOriginalTokens, severalDeprecatedTokens),
    ),
    expectedSeveralDeprecated,
  );
});

test("several tokens with some renamed to see if new deprecated tokens are found", (t) => {
  t.deepEqual(
    detectDeprecatedTokens(
      detectRenamedTokens(
        severalDeprecatedTokens,
        severalRenamedDeprecatedTokens,
      ),
      detailedDiff(severalDeprecatedTokens, severalRenamedDeprecatedTokens),
    ),
    expectedRenamedDeprecated,
  );
});

test("added a token to see if new deprecated tokens are found", (t) => {
  t.deepEqual(
    detectDeprecatedTokens(
      detectRenamedTokens(
        severalDeprecatedTokens,
        severalAddedDeprecatedTokens,
      ),
      detailedDiff(severalDeprecatedTokens, severalAddedDeprecatedTokens),
    ),
    expectedAddedDeprecated,
  );
});

test("reverted a token to not deprecated", (t) => {
  t.deepEqual(
    detectDeprecatedTokens(
      detectRenamedTokens(deprecatedToken, original),
      detailedDiff(deprecatedToken, original),
    ),
    expectedReverted,
  );
});
