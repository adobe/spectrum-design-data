// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

import test from "ava";
import { filterDiffByName } from "../src/tools/diff.js";

const SAMPLE_DIFF = {
  renamed: [
    {
      oldName: "accent-color-default",
      newName: "accent-background-color-default",
    },
    { oldName: "border-width", newName: "border-width-thin" },
  ],
  deprecated: [{ name: "old-deprecated-token" }, { name: "accent-deprecated" }],
  reverted: [{ name: "accent-reverted" }],
  added: [{ name: "new-accent-color" }, { name: "new-spacing-token" }],
  deleted: [
    { name: "deleted-accent-token" },
    { name: "deleted-spacing-token" },
  ],
  updated: [{ name: "accent-background-updated" }, { name: "spacing-updated" }],
};

test("filterDiffByName filters renamed by oldName and newName", (t) => {
  const result = filterDiffByName(SAMPLE_DIFF, "accent");
  // Only the first renamed entry has 'accent' (oldName 'accent-color-default');
  // 'border-width' / 'border-width-thin' do not match.
  t.is(result.renamed.length, 1);
  t.true(
    (result.renamed[0].oldName ?? "").includes("accent") ||
      (result.renamed[0].newName ?? "").includes("accent"),
  );
});

test("filterDiffByName filters added/deleted/updated by name", (t) => {
  const result = filterDiffByName(SAMPLE_DIFF, "accent");
  t.is(result.added.length, 1);
  t.is(result.added[0].name, "new-accent-color");
  t.is(result.deleted.length, 1);
  t.is(result.deleted[0].name, "deleted-accent-token");
  t.is(result.updated.length, 1);
  t.is(result.updated[0].name, "accent-background-updated");
});

test("filterDiffByName is case-insensitive", (t) => {
  const result = filterDiffByName(SAMPLE_DIFF, "ACCENT");
  t.is(result.added.length, 1);
  t.is(result.added[0].name, "new-accent-color");
});

test("filterDiffByName returns all entries when filter matches everything", (t) => {
  const result = filterDiffByName(SAMPLE_DIFF, "");
  // empty string matches everything
  t.is(result.renamed.length, SAMPLE_DIFF.renamed.length);
  t.is(result.added.length, SAMPLE_DIFF.added.length);
});

test("filterDiffByName returns empty arrays when nothing matches", (t) => {
  const result = filterDiffByName(SAMPLE_DIFF, "zzz-no-match");
  t.is(result.renamed.length, 0);
  t.is(result.added.length, 0);
  t.is(result.deleted.length, 0);
  t.is(result.updated.length, 0);
});

test("filterDiffByName preserves all diff keys", (t) => {
  const result = filterDiffByName(SAMPLE_DIFF, "spacing");
  t.true(Object.hasOwn(result, "renamed"));
  t.true(Object.hasOwn(result, "deprecated"));
  t.true(Object.hasOwn(result, "reverted"));
  t.true(Object.hasOwn(result, "added"));
  t.true(Object.hasOwn(result, "deleted"));
  t.true(Object.hasOwn(result, "updated"));
});

test("createDiffTools returns a single diff_datasets tool", async (t) => {
  const { createDiffTools } = await import("../src/tools/diff.js");
  const tools = createDiffTools();
  t.is(tools.length, 1);
  t.is(tools[0].name, "diff_datasets");
  t.is(typeof tools[0].handler, "function");
});
