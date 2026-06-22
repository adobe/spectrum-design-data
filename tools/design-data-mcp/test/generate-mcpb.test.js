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
 * Smoke tests for scripts/generate-mcpb.mjs.
 *
 * Runs the generator as a subprocess and asserts that the staging directory
 * is populated with the expected structure and a well-formed manifest.json.
 * Does NOT invoke `mcpb validate/pack` — those require a network install; the
 * generator itself is what we test here.
 *
 * Marked serial to avoid contention on dist/design-data-mcp-bundle.
 */

import test from "ava";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);
const __dirname = dirname(fileURLToPath(import.meta.url));
const packageDir = join(__dirname, "..");
const stagingDir = join(packageDir, "dist", "design-data-mcp-bundle");
const generatorScript = join(packageDir, "scripts", "generate-mcpb.mjs");
const packageJson = JSON.parse(
  readFileSync(join(packageDir, "package.json"), "utf-8"),
);

test.serial("generate-mcpb.mjs stages the bundle successfully", async (t) => {
  const { stderr } = await execFileAsync("node", [generatorScript], {
    cwd: packageDir,
  });
  // generator writes to stderr on fatal errors — any output there is a warning
  if (stderr) t.log("generator stderr:", stderr);
  t.pass("generator exited without error");
});

test.serial("staging dir contains required files", (t) => {
  const required = [
    "manifest.json",
    "icon.png",
    "package.json",
    join("src", "cli.js"),
  ];
  for (const rel of required) {
    t.true(
      existsSync(join(stagingDir, rel)),
      `staging dir should contain ${rel}`,
    );
  }
});

test.serial("node_modules is vendored and non-empty", (t) => {
  const nodeModules = join(stagingDir, "node_modules");
  t.true(existsSync(nodeModules), "node_modules should exist");
  const entries = readdirSync(nodeModules);
  t.true(entries.length > 0, "node_modules should be non-empty");
});

test.serial("manifest.json is well-formed and in sync", (t) => {
  const manifestPath = join(stagingDir, "manifest.json");
  t.true(existsSync(manifestPath), "manifest.json should exist");

  const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));

  t.is(
    manifest.version,
    packageJson.version,
    "manifest.version should match package.json version",
  );
  t.is(manifest.manifest_version, "0.3", "manifest_version should be '0.3'");
  t.is(typeof manifest.name, "string", "manifest.name should be a string");
  t.true(Array.isArray(manifest.tools), "manifest.tools should be an array");
  t.is(manifest.tools.length, 7, "manifest should list 7 tools");
  for (const entry of manifest.tools) {
    t.is(typeof entry.name, "string", "tool entry name should be a string");
    t.is(
      typeof entry.description,
      "string",
      "tool entry description should be a string",
    );
  }
  t.truthy(
    manifest.server?.entry_point,
    "manifest should have server.entry_point",
  );
});
