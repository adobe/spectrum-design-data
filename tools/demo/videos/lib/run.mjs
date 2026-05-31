/*
 * Copyright 2026 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */

/** Small process + path helpers shared by the demo-video pipeline scripts. */

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));

/** Repo root: tools/demo/videos/lib -> up four levels. */
export const repoRoot = resolve(here, "..", "..", "..", "..");

/** Absolute path to the demo-video output directory. */
export const outDir = resolve(repoRoot, "tools/demo/videos/out");

const RESET = "\u001b[0m";
const colors = {
  bold: "\u001b[1m",
  green: "\u001b[0;32m",
  red: "\u001b[0;31m",
  yellow: "\u001b[0;33m",
  dim: "\u001b[2m",
};

/** Colorized stderr logging (kept off stdout so piped output stays clean). */
export const log = {
  step: (msg) => console.error(`\n${colors.bold}==> ${msg}${RESET}`),
  ok: (msg) =>
    console.error(`${colors.green}    ok${RESET}${msg ? ` ${msg}` : ""}`),
  warn: (msg) => console.error(`${colors.yellow}    warn: ${msg}${RESET}`),
  info: (msg) => console.error(`${colors.dim}    ${msg}${RESET}`),
};

/**
 * Run a command, inheriting stdio. Throws on a non-zero exit code.
 * @param {string} cmd
 * @param {string[]} args
 * @param {import("node:child_process").SpawnSyncOptions} [opts]
 */
export function runInherit(cmd, args, opts = {}) {
  const res = spawnSync(cmd, args, {
    stdio: "inherit",
    cwd: repoRoot,
    ...opts,
  });
  if (res.status !== 0) {
    throw new Error(`${cmd} ${args.join(" ")} exited with code ${res.status}`);
  }
  return res;
}

/**
 * Run a command and capture stdout/stderr as strings.
 * @param {string} cmd
 * @param {string[]} args
 * @param {import("node:child_process").SpawnSyncOptions} [opts]
 */
export function runCapture(cmd, args, opts = {}) {
  return spawnSync(cmd, args, {
    encoding: "utf8",
    cwd: repoRoot,
    ...opts,
  });
}

/** Throw a friendly error if a required executable is missing from PATH. */
export function requireBin(bin, installHint) {
  const res = spawnSync("command", ["-v", bin], {
    shell: true,
    encoding: "utf8",
  });
  if (res.status !== 0) {
    throw new Error(
      `Required tool '${bin}' not found on PATH.${installHint ? ` ${installHint}` : ""}`,
    );
  }
}

export { existsSync, colors };
