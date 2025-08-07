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
import { determineBumpType } from "../src/tdiff-runner.js";

test("determineBumpType should return major for deleted tokens", (t) => {
  const diffOutput = `
## Tokens Changed (2)
**Deleted (1)**
- token-name
**Updated (1)**
- other-token
`;

  const result = determineBumpType(diffOutput);
  t.is(result, "major");
});

test("determineBumpType should return minor for added tokens", (t) => {
  const diffOutput = `
## Tokens Changed (2)
**Added (1)**
- new-token
**Updated (1)**
- other-token
`;

  const result = determineBumpType(diffOutput);
  t.is(result, "minor");
});

test("determineBumpType should return patch for updated tokens only", (t) => {
  const diffOutput = `
## Tokens Changed (1)
**Updated (1)**
- updated-token
`;

  const result = determineBumpType(diffOutput);
  t.is(result, "patch");
});

test("determineBumpType should return patch when no changes detected", (t) => {
  const diffOutput = `
## Tokens Changed (0)
**Added (0)**
**Deleted (0)**
**Updated (0)**
`;

  const result = determineBumpType(diffOutput);
  t.is(result, "patch");
});

test("determineBumpType should prioritize major over minor", (t) => {
  const diffOutput = `
## Tokens Changed (3)
**Added (1)**
- new-token
**Deleted (1)**
- old-token
**Updated (1)**
- updated-token
`;

  const result = determineBumpType(diffOutput);
  t.is(result, "major");
});
