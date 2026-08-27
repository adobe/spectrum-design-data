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
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { bootstrapCascade } from "../src/cascade-bootstrap.js";

// The actual CLI invocation (config discovery, github fetch/cache, manifest
// cascade) is already covered by sdk/cli/tests/cli_source.rs and
// cli_manifest.rs — these tests only cover the wiring this package owns:
// deciding when to shell out, and what happens to `config` on success/failure.
// `run` (injected in place of runCli) stands in for that CLI call.

function freshConfig(overrides = {}) {
  return {
    dataPath: "/original/data/path",
    dataRoot: "/original/data/root",
    designDataConfig: null,
    cascadeActive: false,
    ...overrides,
  };
}

test("no-op when designDataConfig is unset", async (t) => {
  const config = freshConfig();
  let called = false;
  await bootstrapCascade(config, {
    run: async () => {
      called = true;
      return { exitCode: 0, stdout: "[]", stderr: "" };
    },
  });
  t.false(called, "run should not be invoked");
  t.is(config.dataPath, "/original/data/path");
  t.false(config.cascadeActive);
});

test("falls back when designDataConfig path does not exist", async (t) => {
  const config = freshConfig({
    designDataConfig: "/does/not/exist/.design-data.toml",
  });
  let called = false;
  await bootstrapCascade(config, {
    run: async () => {
      called = true;
      return { exitCode: 0, stdout: "[]", stderr: "" };
    },
  });
  t.false(called, "run should not be invoked for a missing config path");
  t.is(config.dataPath, "/original/data/path");
  t.false(config.cascadeActive);
});

test("falls back when the CLI exits non-zero", async (t) => {
  const dir = mkdtempSync(join(tmpdir(), "cascade-test-"));
  t.teardown(() => rmSync(dir, { recursive: true, force: true }));
  const config = freshConfig({ designDataConfig: dir });

  await bootstrapCascade(config, {
    run: async () => ({ exitCode: 1, stdout: "", stderr: "boom" }),
  });
  t.is(config.dataPath, "/original/data/path");
  t.false(config.cascadeActive);
});

test("falls back when the CLI emits unparseable JSON", async (t) => {
  const dir = mkdtempSync(join(tmpdir(), "cascade-test-"));
  t.teardown(() => rmSync(dir, { recursive: true, force: true }));
  const config = freshConfig({ designDataConfig: dir });

  await bootstrapCascade(config, {
    run: async () => ({ exitCode: 0, stdout: "not json", stderr: "" }),
  });
  t.is(config.dataPath, "/original/data/path");
  t.false(config.cascadeActive);
});

test("materializes resolved tokens and repoints dataPath/dataRoot on success", async (t) => {
  const dir = mkdtempSync(join(tmpdir(), "cascade-test-"));
  t.teardown(() => rmSync(dir, { recursive: true, force: true }));
  const config = freshConfig({ designDataConfig: dir });
  const tokens = [
    {
      name: { property: "test-cascade" },
      $schema:
        "https://opensource.adobe.com/spectrum-design-data/schemas/token-types/color.json",
      value: "#ff00ff",
      uuid: "11111111-1111-1111-1111-111111111111",
    },
  ];

  let seenArgs;
  let seenCwd;
  await bootstrapCascade(config, {
    run: async (args, opts) => {
      seenArgs = args;
      seenCwd = opts.cwd;
      return { exitCode: 0, stdout: JSON.stringify(tokens), stderr: "" };
    },
  });

  t.deepEqual(seenArgs, ["query", "--filter", "", "--format", "json"]);
  t.is(seenCwd, dir);
  t.true(config.cascadeActive);
  t.is(config.dataRoot, dir);
  t.not(config.dataPath, "/original/data/path");
  t.true(existsSync(join(config.dataPath, "resolved.tokens.json")));
  t.deepEqual(
    JSON.parse(readFileSync(join(config.dataPath, "resolved.tokens.json"))),
    tokens,
  );
});

test("accepts a path to the .design-data.toml file itself, not just its directory", async (t) => {
  const dir = mkdtempSync(join(tmpdir(), "cascade-test-"));
  t.teardown(() => rmSync(dir, { recursive: true, force: true }));
  const tomlPath = join(dir, ".design-data.toml");
  await import("node:fs").then((fs) =>
    fs.writeFileSync(tomlPath, '[source]\ntype = "path"\nroot = "."\n'),
  );
  const config = freshConfig({ designDataConfig: tomlPath });

  let seenCwd;
  await bootstrapCascade(config, {
    run: async (args, opts) => {
      seenCwd = opts.cwd;
      return { exitCode: 0, stdout: "[]", stderr: "" };
    },
  });

  t.is(seenCwd, dir, "cwd should be the directory containing the toml file");
  t.true(config.cascadeActive);
});
