// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

import { spawn } from "child_process";
import { config } from "./config.js";

export function runCli(args, { timeout = 10_000 } = {}) {
  return new Promise((resolve, reject) => {
    const proc = spawn(config.bin, args, {
      // isolates CLI stdout from the MCP JSON-RPC stream on the parent's stdout
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    proc.stdout.on("data", (d) => {
      stdout += d;
    });
    proc.stderr.on("data", (d) => {
      stderr += d;
    });

    const timer = setTimeout(() => {
      proc.kill();
      reject(new Error(`design-data timed out after ${timeout}ms`));
    }, timeout);

    proc.on("close", (code) => {
      clearTimeout(timer);
      resolve({ exitCode: code, stdout: stdout.trim(), stderr: stderr.trim() });
    });
    proc.on("error", reject);
  });
}
