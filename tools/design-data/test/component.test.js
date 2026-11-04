// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "ava";
import { searchComponents } from "../src/component.js";

// Runs against the real corpus so the tests don't encode guessed queries.
const DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../../packages/design-data/components",
);

test("name match ranks first", (t) => {
  const [first] = searchComponents(DIR, "button");
  t.is(first.id, "button");
  t.is(first.displayName, "Button");
  t.truthy(first.snippet);
});

test("matches description text", (t) => {
  const results = searchComponents(DIR, "perform an action or to navigate");
  t.true(results.some((r) => r.id === "button"));
});

test("category filter and limit", (t) => {
  const results = searchComponents(DIR, "button", {
    category: "actions",
    limit: 2,
  });
  t.true(results.length > 0 && results.length <= 2);
  t.true(results.every((r) => r.category === "actions"));
});

test("no match, empty query and missing dir return []", (t) => {
  t.deepEqual(searchComponents(DIR, "zzzqqqxxx"), []);
  t.deepEqual(searchComponents(DIR, "  "), []);
  t.deepEqual(searchComponents(join(DIR, "nope"), "button"), []);
});

test("stopwords and short words don't drive matches", (t) => {
  const results = searchComponents(DIR, "select from a list");
  t.true(results.length < 20, `got ${results.length}`);
  t.deepEqual(searchComponents(DIR, "a to or"), []);
});

test("falls back to any-word matches when no component has all words", (t) => {
  const results = searchComponents(DIR, "button zzzqqqxxx");
  t.is(results[0].id, "button");
});

test("exact displayName beats partial name matches", (t) => {
  const ids = searchComponents(DIR, "action button").map((r) => r.id);
  t.is(ids[0], "action-button");
});

test("more matched words rank higher within a tier", (t) => {
  const results = searchComponents(DIR, "keyboard focus ring");
  t.true(results.length > 0);
  t.true(results.every((r) => r.snippet.length <= 205));
});

test("unknown category returns []", (t) => {
  t.deepEqual(searchComponents(DIR, "button", { category: "nope" }), []);
});

test("limit is clamped to a positive integer", (t) => {
  t.is(searchComponents(DIR, "button", { limit: -1 }).length, 1);
  t.is(searchComponents(DIR, "button", { limit: 0 }).length, 1);
  t.is(searchComponents(DIR, "button", { limit: Number.NaN }).length > 0, true);
});

test("malformed or odd component files are skipped, not fatal", (t) => {
  const dir = join(
    tmpdir(),
    "design-data-component-" + randomUUID().slice(0, 8),
  );
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "bad.json"), "{nope");
  writeFileSync(
    join(dir, "odd.json"),
    JSON.stringify({
      name: "odd",
      description: 5,
      documentBlocks: [{ content: 7 }, null, { content: "A tooltip popover" }],
    }),
  );
  try {
    const results = searchComponents(dir, "tooltip");
    t.deepEqual(
      results.map((r) => r.id),
      ["odd"],
    );
    t.true(results[0].snippet.includes("tooltip"));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
