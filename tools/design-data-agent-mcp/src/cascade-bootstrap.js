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
 * Resolves a `.design-data.toml` platform source + manifest cascade once at
 * startup, so the MCP's in-process read/validate tools (which only know how
 * to read a local directory — see config.dataPath) see the platform-resolved
 * dataset instead of the embedded Spectrum snapshot or a raw local dir.
 *
 * The CLI already does config discovery, github fetch/cache, and manifest-cascade
 * application on every data-touching subcommand — this just shells out to it once
 * (`design-data query --filter "" --format json`, cwd = the config's directory)
 * and materializes the result as a single `*.tokens.json` cascade-array file in a
 * temp dir, which loadDataset()/validateDataset() already know how to read.
 */

import { existsSync, mkdtempSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { runCli } from "./cli.js";

/** Directory containing `.design-data.toml`, given either path. */
function resolveConfigDir(configPath) {
  if (!existsSync(configPath)) return null;
  return statSync(configPath).isDirectory() ? configPath : dirname(configPath);
}

/**
 * Resolve `config.designDataConfig`'s cascade and repoint `config.dataPath` /
 * `config.dataRoot` / `config.cascadeActive` at the result. No-ops if
 * `designDataConfig` is unset. Never throws — a failed resolve (e.g. no
 * network for a github source) logs to stderr and leaves config untouched,
 * so the server still starts against the embedded/local fallback.
 *
 * @param {object} config - The mutable config object from ./config.js.
 * @param {{ run?: typeof runCli }} [opts] - `run` is injectable for tests.
 */
export async function bootstrapCascade(config, { run = runCli } = {}) {
  if (!config.designDataConfig) return;

  const configDir = resolveConfigDir(config.designDataConfig);
  if (!configDir) {
    console.error(
      `[design-data-mcp] DESIGN_DATA_CONFIG "${config.designDataConfig}" not found; ` +
        "ignoring, falling back to embedded/local dataset.",
    );
    return;
  }

  try {
    const { exitCode, stdout, stderr } = await run(
      ["query", "--filter", "", "--format", "json"],
      { timeout: 60_000, cwd: configDir },
    );
    if (exitCode !== 0) {
      throw new Error(stderr || `design-data exited with code ${exitCode}`);
    }
    const tokens = JSON.parse(stdout);

    const dir = mkdtempSync(join(tmpdir(), "design-data-mcp-cascade-"));
    writeFileSync(
      join(dir, "resolved.tokens.json"),
      JSON.stringify(tokens),
      "utf-8",
    );

    config.dataPath = dir;
    config.dataRoot = configDir;
    config.cascadeActive = true;
    console.error(
      `[design-data-mcp] cascade resolved from ${configDir} ` +
        `(${tokens.length} tokens) -> ${dir}`,
    );
  } catch (err) {
    console.error(
      `[design-data-mcp] cascade bootstrap failed, falling back to embedded/local ` +
        `dataset: ${err.message}`,
    );
  }
}
