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
import detectDeletedTokens from "../src/lib/deleted-token-detection.js";
import updated from "./test-schemas/basic-original-token.json" with { type: "json" };
import original from "./test-schemas/new-token.json" with { type: "json" };
import renamedBasic from "./test-schemas/basic-renamed-token.json" with { type: "json" };
import { detailedDiff } from "deep-object-diff";
import detectRenamedTokens from "../src/lib/renamed-token-detection.js";
import severalSetTokens from "./test-schemas/several-set-tokens.json" with { type: "json" };
import deletedSetTokens from "./test-schemas/deleted-set-token.json" with { type: "json" };
import deletedSeveralSetTokens from "./test-schemas/deleted-set-tokens.json" with { type: "json" };

const expectedOneDeleted = {
  "swatch-border-opacity": undefined,
};

const expectedRenamedNotDeleted = {};

const expectedDeletedSetToken = {
  "status-light-dot-size-extra-large": undefined,
};

const expectedTwoDeletedSetTokens = {
  "help-text-top-to-workflow-icon-medium": undefined,
  "status-light-dot-size-extra-large": undefined,
};

test("basic test to see if token was deleted", (t) => {
  t.deepEqual(
    detectDeletedTokens(
      detectRenamedTokens(original, updated),
      detailedDiff(original, updated).deleted,
    ),
    expectedOneDeleted,
  );
});

test("checking if renamed tokens are mistakenly marked as deleted", (t) => {
  t.deepEqual(
    detectDeletedTokens(
      detectRenamedTokens(renamedBasic, updated),
      detailedDiff(renamedBasic, updated).deleted,
    ),
    expectedRenamedNotDeleted,
  );
});

test("checking if renamed tokens are mistakenly marked as deleted (same as above but swapped schema)", (t) => {
  t.deepEqual(
    detectDeletedTokens(
      detectRenamedTokens(updated, renamedBasic),
      detailedDiff(updated, renamedBasic).deleted,
    ),
    expectedRenamedNotDeleted,
  );
});

test("checking if set token is deleted", (t) => {
  t.deepEqual(
    detectDeletedTokens(
      detectRenamedTokens(severalSetTokens, deletedSetTokens),
      detailedDiff(severalSetTokens, deletedSetTokens).deleted,
    ),
    expectedDeletedSetToken,
  );
});

test("checking if multiple set tokens are deleted", (t) => {
  t.deepEqual(
    detectDeletedTokens(
      detectRenamedTokens(severalSetTokens, deletedSeveralSetTokens),
      detailedDiff(severalSetTokens, deletedSeveralSetTokens).deleted,
    ),
    expectedTwoDeletedSetTokens,
  );
});
