// Copyright 2026 Adobe. All rights reserved.
import test from "ava";
import { spawnSync } from "node:child_process";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

test("the pinned build tool runs without a global wasm-pack installation", (t) => {
  const executable = fileURLToPath(import.meta.resolve("wasm-pack/run.js"));
  const result = spawnSync(process.execPath, [executable, "--version"], {
    env: { ...process.env, PATH: dirname(process.execPath) },
    encoding: "utf8",
    timeout: 10000,
  });
  t.is(result.status, 0, result.error?.message ?? result.stderr);
  t.is(result.stdout.trim(), "wasm-pack 0.13.1");
});
