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
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
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
    cascadeDataPath: null,
    cascadeActive: false,
    componentsDir: null,
    relationshipsDir: null,
    guidelinesDir: null,
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

test("materializes resolved tokens into cascadeDataPath on success, without touching dataPath/dataRoot", async (t) => {
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
      if (args[0] !== "query") return { exitCode: 0, stdout: "", stderr: "" };
      seenArgs = args;
      seenCwd = opts.cwd;
      return { exitCode: 0, stdout: JSON.stringify(tokens), stderr: "" };
    },
  });

  t.deepEqual(seenArgs, ["query", "--filter", "", "--format", "json"]);
  t.is(seenCwd, dir);
  t.true(config.cascadeActive);
  // dataPath/dataRoot are the fallback anchors for unrelated write/authoring/data
  // tools (write.js, data.js, authoring.js) — cascade resolution must not leak
  // into them, or those tools would silently redirect to the cascade's temp dir.
  t.is(config.dataPath, "/original/data/path");
  t.is(config.dataRoot, "/original/data/root");
  t.not(config.cascadeDataPath, null);
  t.true(existsSync(join(config.cascadeDataPath, "resolved.tokens.json")));
  t.deepEqual(
    JSON.parse(
      readFileSync(join(config.cascadeDataPath, "resolved.tokens.json")),
    ),
    tokens,
  );
});

test("materializes catalogs via `catalog export` with the active platform, without merging in JS", async (t) => {
  const dir = mkdtempSync(join(tmpdir(), "cascade-test-"));
  t.teardown(() => rmSync(dir, { recursive: true, force: true }));
  writeFileSync(
    join(dir, ".design-data.toml"),
    '[platforms]\nios = "platforms/ios/manifest.json"\n',
  );
  // Files sitting in the fallback dirs must not be copied or merged by JS.
  const fallbackComponents = join(dir, "fallback", "components");
  mkdirSync(fallbackComponents, { recursive: true });
  writeFileSync(join(fallbackComponents, "stray.json"), "{}");

  const config = freshConfig({
    designDataConfig: dir,
    platformId: "ios",
    componentsDir: fallbackComponents,
  });
  let exportCall;
  await bootstrapCascade(config, {
    run: async (args, opts) => {
      if (args[0] === "catalog") {
        exportCall = { args, opts };
        mkdirSync(join(args[3], "components"), { recursive: true });
        writeFileSync(
          join(args[3], "components", "from-cli.json"),
          JSON.stringify({ name: "from-cli" }),
        );
      }
      return { exitCode: 0, stdout: "[]", stderr: "" };
    },
  });

  t.true(config.cascadeActive);
  t.deepEqual(exportCall.args, [
    "catalog",
    "export",
    "--out",
    config.cascadeDataPath,
    "--platform",
    "ios",
  ]);
  t.is(exportCall.opts.cwd, dir);
  t.true(
    existsSync(join(config.cascadeDataPath, "components", "from-cli.json")),
  );
  t.false(existsSync(join(config.cascadeDataPath, "components", "stray.json")));
});

test("falls back explicitly when `catalog export` fails", async (t) => {
  const dir = mkdtempSync(join(tmpdir(), "cascade-test-"));
  t.teardown(() => rmSync(dir, { recursive: true, force: true }));
  writeFileSync(join(dir, ".design-data.toml"), "");
  const config = freshConfig({ designDataConfig: dir, platformId: "nope" });

  await bootstrapCascade(config, {
    run: async (args) =>
      args[0] === "catalog"
        ? { exitCode: 1, stdout: "", stderr: "no platform nope configured" }
        : { exitCode: 0, stdout: "[]", stderr: "" },
  });

  t.false(config.cascadeActive);
  t.is(config.cascadeDataPath, null);
});

// Real-CLI regression: needs a built `design-data` that has `catalog export`
// (moon run sdk:build). Skipped when the debug binary is absent.
const root = fileURLToPath(new URL("../../../", import.meta.url));
const realBin =
  process.env.DESIGN_DATA_BIN_REAL ??
  join(root, "sdk", "target", "debug", "design-data");
const realTest = existsSync(realBin) ? test : test.skip;

function runReal(args, { cwd }) {
  const result = spawnSync(realBin, args, {
    cwd,
    encoding: "utf-8",
    maxBuffer: 256 * 1024 * 1024,
  });
  return {
    exitCode: result.status ?? 1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

realTest(
  "real ios profile surfaces catalogs via the CLI cascade and stays isolated from other profiles",
  async (t) => {
    const iosExtensions = join(root, "platforms", "ios", "extensions");
    const readJson = (path) => JSON.parse(readFileSync(path, "utf-8"));

    for (const platformId of ["ios", "web-components", null]) {
      const config = freshConfig({
        designDataConfig: join(root, ".design-data.toml"),
        platformId,
      });
      await bootstrapCascade(config, { run: async (a, o) => runReal(a, o) });
      t.true(config.cascadeActive, `${platformId} bootstraps`);
      t.teardown(() =>
        rmSync(config.cascadeDataPath, { recursive: true, force: true }),
      );
      t.is(config.dataPath, "/original/data/path");
      t.is(config.dataRoot, "/original/data/root");

      for (const category of ["components", "guidelines", "relationships"]) {
        const catalog = join(
          config.cascadeDataPath,
          category,
          "tab-bar-ios.json",
        );
        if (platformId === "ios") {
          t.deepEqual(
            readJson(catalog),
            readJson(join(iosExtensions, category, "tab-bar-ios.json")),
          );
        } else {
          t.false(
            existsSync(catalog),
            `${platformId} must not load iOS ${category}`,
          );
        }
      }
      const manifest = readJson(
        join(config.cascadeDataPath, "guidelines", "manifest.json"),
      );
      t.is(
        manifest.guidelines.some(({ slug }) => slug === "tab-bar-ios"),
        platformId === "ios",
      );
    }
  },
);

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

test("passes --platform to the CLI query shell-out when platformId is set", async (t) => {
  const dir = mkdtempSync(join(tmpdir(), "cascade-test-"));
  t.teardown(() => rmSync(dir, { recursive: true, force: true }));
  const config = freshConfig({
    designDataConfig: dir,
    platformId: "web-components",
  });

  let seenArgs;
  await bootstrapCascade(config, {
    run: async (args) => {
      if (args[0] === "query") seenArgs = args;
      return { exitCode: 0, stdout: "[]", stderr: "" };
    },
  });

  t.deepEqual(seenArgs, [
    "query",
    "--filter",
    "",
    "--format",
    "json",
    "--platform",
    "web-components",
  ]);
});

test("resolves default_platform from the CLI when platformId is unset, keeping tokens and catalogs in agreement", async (t) => {
  const dir = mkdtempSync(join(tmpdir(), "cascade-test-"));
  t.teardown(() => rmSync(dir, { recursive: true, force: true }));

  // Legacy manifest — must be ignored once `default_platform` selects a
  // named entry, exactly as it would be if `platformId` were set explicitly.
  const legacyExtensionsDir = join(dir, "legacy-extensions");
  mkdirSync(join(legacyExtensionsDir, "components"), { recursive: true });
  writeFileSync(
    join(legacyExtensionsDir, "components", "button.json"),
    JSON.stringify({ id: "button", name: "Legacy Button" }),
  );
  writeFileSync(
    join(dir, "manifest.json"),
    JSON.stringify({ extensionsDir: "legacy-extensions" }),
  );

  const platformDir = join(dir, "platforms", "web-components");
  const platformExtensionsDir = join(platformDir, "extensions");
  mkdirSync(join(platformExtensionsDir, "components"), { recursive: true });
  writeFileSync(
    join(platformExtensionsDir, "components", "button.json"),
    JSON.stringify({ id: "button", name: "Platform Button" }),
  );
  writeFileSync(join(platformDir, "manifest.json"), JSON.stringify({}));

  writeFileSync(
    join(dir, ".design-data.toml"),
    'manifest = "manifest.json"\n' +
      'default_platform = "web-components"\n\n' +
      "[platforms]\n" +
      'web-components = "platforms/web-components/manifest.json"\n',
  );

  // No platformId set — only `default_platform` in the config selects it.
  const config = freshConfig({ designDataConfig: dir });

  const seenArgs = [];
  await bootstrapCascade(config, {
    run: async (args) => {
      seenArgs.push(args);
      if (args[0] === "platform" && args[1] === "list") {
        return {
          exitCode: 0,
          stdout: JSON.stringify([
            {
              id: "web-components",
              location: "local",
              detail: "platforms/web-components/manifest.json",
              default: true,
            },
          ]),
          stderr: "",
        };
      }
      return { exitCode: 0, stdout: "[]", stderr: "" };
    },
  });

  t.deepEqual(
    seenArgs.find((args) => args[0] === "query"),
    [
      "query",
      "--filter",
      "",
      "--format",
      "json",
      "--platform",
      "web-components",
    ],
  );
  t.deepEqual(
    seenArgs.find((args) => args[0] === "catalog").slice(-2),
    ["--platform", "web-components"],
    "catalogs must come from the same platform the token query resolved",
  );
});
