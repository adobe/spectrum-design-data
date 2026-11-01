// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const script = fileURLToPath(
  new URL("./validate-platform-recipes.mjs", import.meta.url),
);
const fixture = (name) =>
  fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url));
const run = (name) =>
  spawnSync("node", [script, "--report", fixture(name)], { encoding: "utf8" });

test("exits non-zero on a SPEC-079 warning", () => {
  const result = run("platform-recipes-spec079.json");
  assert.equal(result.status, 1);
  assert.match(result.stderr, /1 recipe binding gap/);
});

test("exits zero when only SPEC-080, SPEC-081 and unrelated rules report", () => {
  assert.equal(run("platform-recipes-clean.json").status, 0);
});

test("--repo-root without a directory is a usage error", () => {
  const result = spawnSync("node", [script, "--repo-root"], {
    encoding: "utf8",
  });
  assert.equal(result.status, 2);
  assert.match(result.stderr, /--repo-root needs a directory/);
});
