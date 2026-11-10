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
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { writeFileSync } from "node:fs";
import { execFile } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, test } from "node:test";
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

// Async so the tests below run concurrently; each validate is single-threaded and slow in debug.
const run = (file, args, options = {}) =>
  new Promise((resolve) => {
    execFile(
      file,
      args,
      { encoding: "utf8", maxBuffer: 1 << 28, ...options },
      (error, stdout, stderr) =>
        resolve({ status: error ? error.code : 0, stdout, stderr }),
    );
  });

// Every case edits ios, so the guard checks only ios; `validate-platform-recipes` covers the rest.
const guard = (root) =>
  run("node", [script, "--repo-root", root, "--platform", "ios"]);

// Adds the foundation badge recipe to ios, with `edit` applied to the parsed recipe. Badge, not
// button: ios aliases `button` to its own `button-ios` recipe, so a copy of the foundation button
// is no longer what ios renders.
function addIosRecipe(root, edit = () => {}) {
  const recipe = JSON.parse(
    readFileSync(join(root, "packages/design-data/visuals/badge.json"), "utf8"),
  );
  edit(recipe);
  const dir = join(root, "platforms/ios/extensions/visuals");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "badge.json"), JSON.stringify(recipe));
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

async function withTree(body) {
  const root = copyTree();
  try {
    await body(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

describe("platform recipe guard on ios", { concurrency: true }, () => {
  test("ios as shipped passes with its button-ios recipe", async () => {
    await withTree(async (root) => {
      assert.ok(
        existsSync(
          join(root, "platforms/ios/extensions/visuals/button-ios.json"),
        ),
      );
      const result = await guard(root);
      assert.equal(result.status, 0, result.stderr);
      assert.match(result.stdout, /ios: every recipe binding resolves/);
    });
  });

  test("a resolving ios recipe that replaces the foundation recipe passes and is noticed", async () => {
    await withTree(async (root) => {
      addIosRecipe(root);
      const result = await guard(root);
      assert.equal(result.status, 0, result.stderr);
      const report = await run(
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
        },
      );
      const rules = JSON.parse(report.stdout).warnings.map((d) => d.rule_id);
      assert.ok(rules.includes("SPEC-080"), "SPEC-080 reports the replacement");
      assert.ok(!rules.includes("SPEC-079"), "the recipe resolves");
    });
  });

  test("an ios recipe whose binding does not resolve fails the guard", async () => {
    await withTree(async (root) => {
      addIosRecipe(root, breakFirstBinding);
      const result = await guard(root);
      assert.equal(result.status, 1);
      assert.match(result.stderr, /ios: \d+ recipe binding gap/);
      assert.match(result.stderr, /Missing context/);
    });
  });

  test("an ios manifest that cannot apply fails the guard with SPEC-082", async () => {
    await withTree(async (root) => {
      const file = join(
        root,
        "platforms/ios/extensions/platform-extensions/ios-contrast.json",
      );
      const ext = JSON.parse(readFileSync(file, "utf8"));
      ext.extends = "no-such-mode-set";
      writeFileSync(file, JSON.stringify(ext));
      const result = await guard(root);
      assert.equal(result.status, 1);
      assert.match(result.stderr, /ios: \d+ recipe binding gap/);
      assert.match(result.stderr, /failed to apply/);
    });
  });

  test("an ios recipe icon that is not in the icons catalog fails the guard with SPEC-085", async () => {
    await withTree(async (root) => {
      const file = join(
        root,
        "platforms/ios/extensions/visuals/button-ios.json",
      );
      const recipe = JSON.parse(readFileSync(file, "utf8"));
      recipe.parts.icon.icon.name = "no-such-icon";
      writeFileSync(file, JSON.stringify(recipe));
      const result = await guard(root);
      assert.equal(result.status, 1);
      assert.match(result.stderr, /workflow:no-such-icon/);
    });
  });
});
