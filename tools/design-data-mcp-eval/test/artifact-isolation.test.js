// Copyright 2026 Adobe. All rights reserved.
// Licensed under the Apache License, Version 2.0.

import test from "ava";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  createFreshBundle,
  packageDir,
} from "../../design-data-mcp/test/helpers/ensure-bundle.js";
import { callJson, connectMcp } from "../src/mcp.js";

const exec = promisify(execFile);

test("external guards still reject ESM and CommonJS resolution outside the artifact", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "hub-eval-guards-"));
  t.teardown(() => rm(root, { recursive: true, force: true }));
  const artifact = join(root, "artifact");
  await mkdir(artifact);
  const outside = join(root, "outside.cjs");
  await writeFile(outside, "module.exports = 'workspace fallback';\n");
  const probes = [
    [
      `await import(${JSON.stringify(pathToFileURL(outside).href)})`,
      /Import escaped isolated artifact/,
    ],
    [
      `import { createRequire } from 'node:module'; createRequire(import.meta.url)(${JSON.stringify(outside)})`,
      /Require escaped isolated artifact/,
    ],
  ];
  for (const [probe, diagnostic] of probes) {
    const error = await t.throwsAsync(() =>
      exec(
        process.execPath,
        [
          "--require",
          fileURLToPath(
            new URL(
              "../../design-data-mcp/test/helpers/isolation-require.cjs",
              import.meta.url,
            ),
          ),
          "--experimental-loader",
          fileURLToPath(
            new URL(
              "../../design-data-mcp/test/helpers/isolation-loader.js",
              import.meta.url,
            ),
          ),
          "--input-type=module",
          "-e",
          probe,
        ],
        { cwd: artifact },
      ),
    );
    t.regex(error.stderr, diagnostic);
  }
});

async function snapshot(directory, prefix = "") {
  const result = {};
  for (const entry of await readdir(join(directory, prefix), {
    withFileTypes: true,
  })) {
    const path = join(prefix, entry.name);
    if (entry.isDirectory()) {
      Object.assign(result, await snapshot(directory, path));
    } else {
      result[path] = createHash("sha256")
        .update(await readFile(join(directory, path)))
        .digest("hex");
    }
  }
  return result;
}

test("evaluation leaves staging unchanged and subsequent MCPB packing excludes test guards", async (t) => {
  t.timeout(120_000);
  const directory = await createFreshBundle();
  t.teardown(() => rm(directory, { recursive: true, force: true }));
  const output = await mkdtemp(join(tmpdir(), "hub-eval-archive-"));
  t.teardown(() => rm(output, { recursive: true, force: true }));
  const before = await snapshot(directory);
  const client = await connectMcp(directory);
  try {
    const catalog = await callJson(client, "design-data-guideline-list");
    t.true(catalog.total > 0);
  } finally {
    await client.close();
  }
  t.deepEqual(await snapshot(directory), before);

  const archive = join(output, "design-data.mcpb");
  await exec("pnpm", ["exec", "mcpb", "pack", directory, archive], {
    cwd: packageDir,
    timeout: 60_000,
    maxBuffer: 4 * 1024 * 1024,
  });
  const { stdout } = await exec("unzip", ["-Z1", archive]);
  const entries = stdout.trim().split("\n");
  t.true(entries.includes("manifest.json"));
  t.true(entries.includes("src/cli.js"));
  for (const name of ["isolation-loader.js", "isolation-require.cjs"]) {
    t.false(
      entries.some((entry) => entry === name || entry.endsWith(`/${name}`)),
    );
  }
});
