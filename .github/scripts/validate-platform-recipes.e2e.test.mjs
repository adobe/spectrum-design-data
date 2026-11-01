// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

// End to end: the guard runs the real CLI over a copy of the repo's `platforms/ios` manifest
// and data. Needs `moon run sdk:build` first (the `sdk:build` dep of the moon task).

import assert from "node:assert/strict";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const repo = fileURLToPath(new URL("../..", import.meta.url));
const script = join(repo, ".github/scripts/validate-platform-recipes.mjs");
const cli = join(repo, "sdk/target/debug/design-data");

// A copy of the data the guard reads, so a test can add a recipe to ios.
function copyTree() {
  const root = mkdtempSync(join(tmpdir(), "platform-recipes-e2e-"));
  cpSync(join(repo, ".design-data.toml"), join(root, ".design-data.toml"));
  cpSync(join(repo, "platforms"), join(root, "platforms"), { recursive: true });
  cpSync(
    join(repo, "packages/design-data"),
    join(root, "packages/design-data"),
    { recursive: true },
  );
  cpSync(
    join(repo, "packages/design-data-spec/schemas"),
    join(root, "packages/design-data-spec/schemas"),
    { recursive: true },
  );
  return root;
}

const guard = (root) =>
  spawnSync("node", [script, "--repo-root", root], {
    encoding: "utf8",
    maxBuffer: 1 << 28,
  });

// Adds the foundation button recipe to ios, with `edit` applied to the parsed recipe.
function addIosRecipe(root, edit = () => {}) {
  const recipe = JSON.parse(
    readFileSync(
      join(root, "packages/design-data/visuals/button.json"),
      "utf8",
    ),
  );
  edit(recipe);
  const dir = join(root, "platforms/ios/extensions/visuals");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "button.json"), JSON.stringify(recipe));
}

// Points the first relationship a recipe binds at a context no relationship has.
function breakFirstBinding(node) {
  if (node && typeof node === "object") {
    if (node.relationship?.context) {
      node.relationship.context = "Missing context";
      return true;
    }
    return Object.values(node).some(breakFirstBinding);
  }
  return false;
}

function withTree(body) {
  const root = copyTree();
  try {
    body(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test("ios as shipped passes with no platform recipe", () => {
  withTree((root) => {
    const result = guard(root);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /ios: every recipe binding resolves/);
  });
});

test("a resolving ios recipe that replaces the foundation recipe passes and is noticed", () => {
  withTree((root) => {
    addIosRecipe(root);
    const result = guard(root);
    assert.equal(result.status, 0, result.stderr);
    const report = spawnSync(
      cli,
      [
        "validate",
        "./tokens",
        "--platform",
        "ios",
        "--components-path",
        "./components",
        "--relationships-path",
        "./relationships",
        "--visuals-path",
        "./visuals",
        "--mode-sets-path",
        "./mode-sets",
        "--components-report-only",
        "--exceptions-path",
        "./naming-exceptions.json",
        "--format",
        "json",
      ],
      {
        cwd: join(root, "packages/design-data"),
        encoding: "utf8",
        maxBuffer: 1 << 28,
      },
    );
    const rules = JSON.parse(report.stdout).warnings.map((d) => d.rule_id);
    assert.ok(rules.includes("SPEC-080"), "SPEC-080 reports the replacement");
    assert.ok(!rules.includes("SPEC-079"), "the recipe resolves");
  });
});

test("an ios recipe whose binding does not resolve fails the guard", () => {
  withTree((root) => {
    addIosRecipe(root, breakFirstBinding);
    const result = guard(root);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /ios: \d+ recipe binding gap/);
    assert.match(result.stderr, /Missing context/);
  });
});
