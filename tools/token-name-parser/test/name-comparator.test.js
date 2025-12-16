/*
Copyright 2025 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

import test from "ava";
import { compareTokenNames } from "../src/name-comparator.js";

test("compareTokenNames - all matches", async (t) => {
  const anonymousTokens = [
    {
      id: "abc-123",
      name: {
        original: "text-to-visual-50",
        structure: {
          category: "spacing",
          property: "spacing",
          spaceBetween: { from: "text", to: "visual" },
          index: "50",
        },
        semanticComplexity: 2,
      },
      validation: { isValid: true, errors: [] },
    },
    {
      id: "def-456",
      name: {
        original: "spacing-100",
        structure: {
          category: "generic-property",
          property: "spacing",
          index: "100",
        },
        semanticComplexity: 1,
      },
      validation: { isValid: true, errors: [] },
    },
  ];

  const result = await compareTokenNames(anonymousTokens);

  t.is(result.summary.total, 2);
  t.is(result.summary.matches, 2);
  t.is(result.summary.mismatches, 0);
  t.is(result.summary.matchRate, "100.00%");
});

test("compareTokenNames - with mismatches", async (t) => {
  const anonymousTokens = [
    {
      id: "abc-123",
      name: {
        original: "text-to-visual-50",
        structure: {
          category: "spacing",
          property: "spacing",
          spaceBetween: { from: "text", to: "control" }, // Intentional mismatch
          index: "50",
        },
        semanticComplexity: 2,
      },
      validation: { isValid: true, errors: [] },
    },
  ];

  const result = await compareTokenNames(anonymousTokens);

  t.is(result.summary.total, 1);
  t.is(result.summary.matches, 0);
  t.is(result.summary.mismatches, 1);
  t.is(result.mismatches[0].originalName, "text-to-visual-50");
  t.is(result.mismatches[0].regeneratedName, "text-to-control-50");
});
