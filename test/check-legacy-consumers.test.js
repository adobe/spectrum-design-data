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
import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  findViolations,
  globToRegExp,
  loadAllowlist,
} from "../scripts/check-legacy-consumers.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const allow = (...paths) =>
  paths.map((path) => ({ path, regex: globToRegExp(path) }));

test("globToRegExp handles ** and *", (t) => {
  t.true(
    globToRegExp("tools/diff-generator/**").test(
      "tools/diff-generator/src/a.js",
    ),
  );
  t.true(globToRegExp("sdk/*.yml").test("sdk/moon.yml"));
  t.false(globToRegExp("sdk/*.yml").test("sdk/core/moon.yml"));
});

test("flags unallowlisted legacy imports and package.json deps", (t) => {
  const files = {
    "tools/new/src/a.js": 'import x from "@adobe/spectrum-tokens";',
    "tools/new/package.json":
      '{ "dependencies": { "@adobe/spectrum-tokens": "workspace:*" } }',
    "tools/new/src/b.js": 'readFile("../../packages/tokens/src/a.json");',
  };
  const v = findViolations(Object.keys(files), (f) => files[f], []);
  t.deepEqual(
    v.map((x) => x.file),
    ["tools/new/src/a.js", "tools/new/package.json", "tools/new/src/b.js"],
  );
});

test("allowlisted files and non-code files are ignored", (t) => {
  const files = {
    "tools/diff-generator/src/a.js": 'import x from "@adobe/spectrum-tokens";',
    "tools/new/README.md": "Uses @adobe/spectrum-tokens",
    "packages/tokens/index.js": 'import "@adobe/spectrum-tokens";',
  };
  const v = findViolations(
    Object.keys(files),
    (f) => files[f],
    allow("tools/diff-generator/**"),
  );
  t.deepEqual(v, []);
});

test("canonical paths do not trip the guardrail", (t) => {
  const v = findViolations(
    ["tools/new/src/a.js"],
    () => 'readFile("../../packages/design-data/tokens/a.tokens.json");',
    [],
  );
  t.deepEqual(v, []);
});

test("repository has no unallowlisted legacy consumers and no stale entries", (t) => {
  const out = execFileSync("node", ["scripts/check-legacy-consumers.mjs"], {
    cwd: ROOT,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  t.regex(out, /No unallowlisted legacy token consumers/);
  t.true(
    loadAllowlist().every((e) => typeof e.reason === "string" && e.reason),
  );
});
