// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

/**
 * Bundle-contents regression tests.
 *
 * Asserts that the staged MCPB bundle (dist/design-data-mcp-bundle) contains
 * exactly what is needed to run offline and nothing more. Two categories:
 *
 * PRESENT — runtime payload that must survive any change to generate-mcpb.mjs:
 *   • zod with a working ./v4 subpath export (guards reviewer issue 1 structurally)
 *   • @adobe/design-data-wasm pkg/node wasm binary
 *   • @adobe/spectrum-design-data component + guideline JSON
 *   • src/cli.js (the manifest entry_point)
 *
 * ABSENT — dev-only or unused content that must never be bundled:
 *   • ava (devDependency — not a runtime dep)
 *   • nested @adobe/* /node_modules trees (devDep subtrees of workspace packages)
 *   • @adobe/design-data-wasm/pkg/web (browser wasm target, Node never loads it)
 *   • @adobe/design-data-wasm/src (Rust sources, incl. large embedded_cache.redb)
 *
 * The test.before hook auto-generates the staging dir when absent so these
 * tests never silently skip (unlike the old skip-if-absent pattern).
 */

import test from "ava";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { stagingDir, ensureBundle } from "./helpers/ensure-bundle.js";

test.before(ensureBundle);

const nm = join(stagingDir, "node_modules");

// ── zod / v4 regression guard (reviewer issue 1) ─────────────────────────────

test("zod is vendored in the bundle", (t) => {
  t.true(
    existsSync(join(nm, "zod", "package.json")),
    "node_modules/zod/package.json must exist",
  );
});

test("zod exports the ./v4 subpath (MCP SDK import target)", (t) => {
  const zodPkg = JSON.parse(
    readFileSync(join(nm, "zod", "package.json"), "utf8"),
  );
  t.truthy(
    zodPkg.exports?.["./v4"],
    `zod package.json must have exports['./v4']; got: ${JSON.stringify(zodPkg.exports)}`,
  );
});

test("zod/v4 directory exists in the bundle", (t) => {
  t.true(
    existsSync(join(nm, "zod", "v4")),
    "node_modules/zod/v4/ directory must exist for the ./v4 subpath to resolve",
  );
});

// ── runtime payload present ───────────────────────────────────────────────────

test("wasm binary for Node is present", (t) => {
  t.true(
    existsSync(
      join(
        nm,
        "@adobe",
        "design-data-wasm",
        "pkg",
        "node",
        "design_data_wasm_bg.wasm",
      ),
    ),
    "node_modules/@adobe/design-data-wasm/pkg/node/design_data_wasm_bg.wasm must exist",
  );
});

test("spectrum-design-data component JSON files are present", (t) => {
  const componentsDir = join(
    nm,
    "@adobe",
    "spectrum-design-data",
    "components",
  );
  t.true(existsSync(componentsDir), "components/ directory must exist");
  const jsonFiles = readdirSync(componentsDir).filter((f) =>
    f.endsWith(".json"),
  );
  t.true(jsonFiles.length > 0, "at least one component .json file must exist");
});

test("spectrum-design-data guidelines manifest is present", (t) => {
  t.true(
    existsSync(
      join(nm, "@adobe", "spectrum-design-data", "guidelines", "manifest.json"),
    ),
    "node_modules/@adobe/spectrum-design-data/guidelines/manifest.json must exist",
  );
});

test("src/cli.js (manifest entry_point) is present", (t) => {
  t.true(
    existsSync(join(stagingDir, "src", "cli.js")),
    "src/cli.js must exist in the staging bundle",
  );
});

// ── manifest sanity ───────────────────────────────────────────────────────────

test("manifest.json is valid and declares 7 tools", (t) => {
  const manifestPath = join(stagingDir, "manifest.json");
  t.true(existsSync(manifestPath), "manifest.json must exist");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  t.is(manifest.manifest_version, "0.3", "manifest_version must be 0.3");
  t.is(
    manifest.server?.entry_point,
    "src/cli.js",
    "server.entry_point must be src/cli.js",
  );
  t.is(
    manifest.tools?.length,
    7,
    `manifest must declare 7 tools, got ${manifest.tools?.length}`,
  );
});

// ── dev-only content ABSENT ───────────────────────────────────────────────────

test("ava is not bundled (it is a devDependency)", (t) => {
  // Check the two workspace packages whose devDeps were accidentally included before.
  const avaUnderWasm = join(
    nm,
    "@adobe",
    "design-data-wasm",
    "node_modules",
    "ava",
  );
  const avaUnderData = join(
    nm,
    "@adobe",
    "spectrum-design-data",
    "node_modules",
    "ava",
  );
  const avaAtRoot = join(nm, "ava");
  t.false(
    existsSync(avaUnderWasm),
    "@adobe/design-data-wasm/node_modules/ava must not exist",
  );
  t.false(
    existsSync(avaUnderData),
    "@adobe/spectrum-design-data/node_modules/ava must not exist",
  );
  t.false(
    existsSync(avaAtRoot),
    "node_modules/ava must not exist at staging root",
  );
});

test("no nested node_modules under @adobe workspace packages", (t) => {
  const adobeDir = join(nm, "@adobe");
  if (!existsSync(adobeDir)) {
    t.pass("no @adobe dir to check");
    return;
  }
  const pkgs = readdirSync(adobeDir);
  for (const pkg of pkgs) {
    const nested = join(adobeDir, pkg, "node_modules");
    t.false(
      existsSync(nested),
      `@adobe/${pkg}/node_modules must not exist (devDep subtree)`,
    );
  }
});

test("design-data-wasm pkg/web is not bundled (browser target, Node never loads it)", (t) => {
  t.false(
    existsSync(join(nm, "@adobe", "design-data-wasm", "pkg", "web")),
    "node_modules/@adobe/design-data-wasm/pkg/web must not exist",
  );
});

test("design-data-wasm src/ is not bundled (Rust sources)", (t) => {
  t.false(
    existsSync(join(nm, "@adobe", "design-data-wasm", "src")),
    "node_modules/@adobe/design-data-wasm/src must not exist (contains large Rust sources)",
  );
});
