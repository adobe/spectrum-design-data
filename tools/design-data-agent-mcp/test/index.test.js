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
import { spawn } from "child_process";
import { mkdtempSync, rmSync, symlinkSync } from "fs";
import { tmpdir } from "os";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";
import { createMCPServer, createAllTools } from "../src/index.js";

const entryPath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../src/index.js",
);

// Spawn the given entry script and resolve once it logs the startup marker to
// stderr (or reject after a timeout). The server then waits on stdin, so we
// kill it as soon as the marker appears.
function startupStderr(scriptPath) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(process.execPath, [scriptPath], {
      stdio: ["pipe", "ignore", "pipe"],
    });
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error(`timed out; stderr so far: ${stderr}`));
    }, 10000);
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
      if (stderr.includes("design-data-agent-mcp started")) {
        clearTimeout(timer);
        child.kill();
        resolvePromise(stderr);
      }
    });
    child.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

test("server initializes", (t) => {
  const server = createMCPServer();
  t.truthy(server);
});

test("server exposes 25 tools", (t) => {
  const tools = createAllTools();
  t.is(tools.length, 25);
});

test("starts when launched via the real file path", async (t) => {
  const stderr = await startupStderr(entryPath);
  t.true(stderr.includes("design-data-agent-mcp started"));
});

test("starts when launched via a symlink (npx/.bin shim)", async (t) => {
  const dir = mkdtempSync(join(tmpdir(), "dd-mcp-symlink-"));
  const link = join(dir, "index.js");
  try {
    symlinkSync(entryPath, link);
    const stderr = await startupStderr(link);
    t.true(stderr.includes("design-data-agent-mcp started"));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
