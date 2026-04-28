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
  parsePRUrl,
  extractMotivation,
  extractBranchName,
} from "../src/pr-parser.js";

test("parsePRUrl should parse valid GitHub PR URLs", (t) => {
  const url = "https://github.com/adobe/spectrum-tokens-studio-data/pull/275";
  const result = parsePRUrl(url);

  t.is(result.owner, "adobe");
  t.is(result.repo, "spectrum-tokens-studio-data");
  t.is(result.prNumber, 275);
});

test("parsePRUrl should throw error for invalid URLs", (t) => {
  const invalidUrls = [
    "https://github.com/adobe/repo",
    "https://example.com/pull/123",
    "not-a-url",
    "https://github.com/adobe/repo/issues/123",
  ];

  for (const url of invalidUrls) {
    t.throws(() => parsePRUrl(url), {
      message: /Invalid GitHub PR URL format/,
    });
  }
});

test("extractMotivation should extract motivation section", (t) => {
  const description = `## Summary
This is a summary

## Motivation and context

This is the design motivation for the changes.
It explains why these changes are needed.

## Other section
More content here`;

  const result = extractMotivation(description);
  t.is(
    result,
    "This is the design motivation for the changes.\nIt explains why these changes are needed.",
  );
});

test("extractMotivation should handle missing motivation section", (t) => {
  const description = `## Summary
This is a summary without motivation section`;

  const result = extractMotivation(description);
  t.is(result, "");
});

test("extractMotivation should handle empty description", (t) => {
  const result = extractMotivation("");
  t.is(result, "");
});

test("extractMotivation should handle fallback motivation patterns", (t) => {
  const description = `## Summary
This is a summary

## Design Motivation

This is the fallback motivation pattern.

## Other section
More content here`;

  const result = extractMotivation(description);
  t.is(result, "This is the fallback motivation pattern.");
});

test("extractBranchName should extract branch name from PR data", (t) => {
  const prData = {
    head: {
      ref: "feature/new-tokens",
    },
  };

  const result = extractBranchName(prData);
  t.is(result, "feature/new-tokens");
});

test("extractBranchName should handle missing head data", (t) => {
  const prData = {};
  const result = extractBranchName(prData);
  t.is(result, "");
});

test("extractMotivation should handle HTML tags and single newlines", (t) => {
  const description = `## Description

Added:

select-box-horizontal-minimum-width:  
188px (desktop)  
220px (mobile)

Updated:

select-box-edge-to-checkbox:  
8px (desktop)  
8px (mobile)

## Motivation and context

<task-lists>A new visual treatment for select box.</task-lists>

## Related issue

SDS-14307`;

  const result = extractMotivation(description);
  t.is(result, "A new visual treatment for select box.");
});
