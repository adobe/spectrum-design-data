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
import detectDeletedTokens from "../src/lib/deleted-token-detection.js";
import detectRenamedTokens from "../src/lib/renamed-token-detection.js";
import { loadTestSchema } from "./utils/json-loader.js";

const updated = loadTestSchema("basic-original-token.json");
const original = loadTestSchema("new-token.json");
const renamedBasic = loadTestSchema("basic-renamed-token.json");
const severalSetTokens = loadTestSchema("several-set-tokens.json");
const deletedSetTokens = loadTestSchema("deleted-set-token.json");
const deletedSeveralSetTokens = loadTestSchema("deleted-set-tokens.json");

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

test("deleted token detection with empty renamed object", (t) => {
  const deleted = {
    "test-token": undefined,
    "another-token": undefined,
  };
  const renamed = {}; // Empty renamed object

  const result = detectDeletedTokens(renamed, deleted);
  t.deepEqual(result, deleted); // Should return all tokens as deleted when no renames
});

test("deleted token detection with deprecated token", (t) => {
  const deleted = {
    "deprecated-token": { deprecated: "This token is deprecated" },
    "regular-token": undefined,
  };
  const renamed = {};

  const result = detectDeletedTokens(renamed, deleted);
  // Both tokens should remain: deprecated-token stays because it has deprecated property,
  // regular-token stays because it's undefined (doesn't pass first condition)
  t.deepEqual(result, {
    "deprecated-token": { deprecated: "This token is deprecated" },
    "regular-token": undefined,
  });
});

test("deleted token detection - OR condition first branch", (t) => {
  const deleted = {
    "test-token": { value: "something" }, // exists and no deprecated property
  };
  const renamed = {
    "some-other-token": { "old-name": "different-token" },
  };

  const result = detectDeletedTokens(renamed, deleted);
  t.deepEqual(result, {}); // Should be removed by first branch of OR condition
});

test("deleted token detection - OR condition second branch", (t) => {
  const deleted = {
    "old-token-name": { deprecated: "deprecated" }, // Has deprecated (first branch false)
  };
  const renamed = {
    "new-token": { "old-name": "old-token-name" }, // Second branch of OR should trigger
  };

  const result = detectDeletedTokens(renamed, deleted);
  t.deepEqual(result, {}); // Should be removed by second branch of OR condition
});
