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
 * Offline bundle smoke test — reproduces the Anthropic directory reviewer's
 * "offline initialize + tools-list check" against the staged MCPB bundle.
 *
 * Spawns `node src/cli.js` from dist/design-data-mcp-bundle with a clean env
 * (no NODE_PATH / pnpm workspace visible) and sends JSON-RPC initialize +
 * tools/list over stdio. Asserts that:
 *   - The server starts without 'Cannot find module' errors.
 *   - initialize succeeds (serverInfo present).
 *   - tools/list returns exactly 7 tools.
 *
 * This test is automatically skipped when the staging bundle does not exist
 * (i.e. when `moon run tools/design-data-mcp:bundle` has not been run yet),
 * so it never breaks a plain `pnpm --filter @adobe/design-data-mcp test` run.
 */

import test from "ava";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const packageDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const stagingDir = join(packageDir, "dist", "design-data-mcp-bundle");
const entryPoint = join(stagingDir, "src", "cli.js");

const EXPECTED_TOOLS = [
  "design-data-primer",
  "design-data-query",
  "design-data-suggest",
  "design-data-component",
  "design-data-resolve",
  "design-data-guideline-list",
  "design-data-guideline",
];

/** Send two JSON-RPC frames to the server and collect the first two responses. */
function runBundleSmoke() {
  return new Promise((resolve, reject) => {
    const child = spawn("node", ["src/cli.js"], {
      cwd: stagingDir,
      // Deliberately minimal env: no NODE_PATH or pnpm store — bundle must be self-contained.
      env: { PATH: process.env.PATH },
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stderrAccum = "";
    child.stderr.on("data", (d) => {
      stderrAccum += d.toString();
    });

    const initMsg =
      JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2024-11-05",
          capabilities: {},
          clientInfo: { name: "smoke-test", version: "0" },
        },
      }) + "\n";

    const toolsListMsg =
      JSON.stringify({
        jsonrpc: "2.0",
        id: 2,
        method: "tools/list",
        params: {},
      }) + "\n";

    child.stdin.write(initMsg);

    let buf = "";
    let initResult = null;
    let toolsResult = null;

    child.stdout.on("data", (chunk) => {
      buf += chunk.toString();
      const lines = buf.split("\n");
      buf = lines.pop(); // keep incomplete trailing line

      for (const line of lines) {
        if (!line.trim()) continue;
        let msg;
        try {
          msg = JSON.parse(line);
        } catch {
          continue;
        }
        if (msg.id === 1 && !initResult) {
          initResult = msg;
          child.stdin.write(toolsListMsg);
        } else if (msg.id === 2 && !toolsResult) {
          toolsResult = msg;
          child.kill();
        }
      }
    });

    const timeout = setTimeout(() => {
      child.kill();
      reject(new Error(`Bundle smoke test timed out. stderr: ${stderrAccum}`));
    }, 20000);

    child.on("exit", () => {
      clearTimeout(timeout);
      if (stderrAccum.includes("Cannot find module")) {
        reject(
          new Error(
            `Bundle failed to start — 'Cannot find module' in stderr:\n${stderrAccum}`,
          ),
        );
        return;
      }
      if (!initResult || !toolsResult) {
        reject(
          new Error(
            `Did not receive expected responses. stderr: ${stderrAccum}`,
          ),
        );
        return;
      }
      resolve({ initResult, toolsResult, stderr: stderrAccum });
    });
  });
}

// Skip the entire test suite when the bundle has not been generated.
const bundleExists = existsSync(entryPoint);

test.serial(
  "bundle starts offline and returns correct serverInfo",
  bundleExists
    ? async (t) => {
        const { initResult } = await runBundleSmoke();
        t.truthy(initResult.result, "initialize result should be present");
        t.is(initResult.result.serverInfo?.name, "design-data");
        t.truthy(
          initResult.result.serverInfo?.version,
          "serverInfo.version should be set",
        );
      }
    : (t) => {
        t.log(
          "SKIPPED — run `moon run tools/design-data-mcp:bundle` first to generate the staging bundle.",
        );
        t.pass();
      },
);

test.serial(
  "bundle tools/list returns all 7 expected tools",
  bundleExists
    ? async (t) => {
        const { toolsResult } = await runBundleSmoke();
        const tools = toolsResult.result?.tools ?? [];
        const names = tools.map((tool) => tool.name);
        t.is(
          names.length,
          7,
          `Expected 7 tools, got ${names.length}: ${names.join(", ")}`,
        );
        for (const expected of EXPECTED_TOOLS) {
          t.true(names.includes(expected), `Missing tool: ${expected}`);
        }
      }
    : (t) => {
        t.log(
          "SKIPPED — run `moon run tools/design-data-mcp:bundle` first to generate the staging bundle.",
        );
        t.pass();
      },
);

test.serial(
  "bundle starts with no Cannot-find-module errors",
  bundleExists
    ? async (t) => {
        const { stderr } = await runBundleSmoke();
        t.false(
          stderr.includes("Cannot find module"),
          `Unexpected 'Cannot find module' in stderr:\n${stderr}`,
        );
      }
    : (t) => {
        t.log(
          "SKIPPED — run `moon run tools/design-data-mcp:bundle` first to generate the staging bundle.",
        );
        t.pass();
      },
);
