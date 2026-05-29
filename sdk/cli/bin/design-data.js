#!/usr/bin/env node
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
 * design-data launcher (esbuild/biome pattern).
 *
 * npm installs only the matching @adobe/design-data-{os}-{cpu} package via
 * optionalDependencies + os/cpu fields. This script resolves the right binary
 * path and execs it, forwarding all arguments and stdio transparently.
 */

import { execFileSync } from "child_process";
import { createRequire } from "module";

const require = createRequire(import.meta.url);

/** Map of `${process.platform}-${process.arch}` → platform package name. */
const PLATFORM_PACKAGES = {
  "darwin-arm64": "@adobe/design-data-darwin-arm64",
  "darwin-x64": "@adobe/design-data-darwin-x64",
  "linux-x64": "@adobe/design-data-linux-x64",
  "win32-x64": "@adobe/design-data-win32-x64",
};

const platformKey = `${process.platform}-${process.arch}`;
const platformPkg = PLATFORM_PACKAGES[platformKey];

if (!platformPkg) {
  process.stderr.write(
    `design-data: unsupported platform "${platformKey}".\n` +
      `Supported platforms: ${Object.keys(PLATFORM_PACKAGES).join(", ")}\n`,
  );
  process.exit(1);
}

const binaryName = `design-data${process.platform === "win32" ? ".exe" : ""}`;

let binaryPath;
try {
  binaryPath = require.resolve(`${platformPkg}/bin/${binaryName}`);
} catch {
  process.stderr.write(
    `design-data: platform package "${platformPkg}" is not installed.\n` +
      `Try: npm install ${platformPkg}\n` +
      `Or reinstall @adobe/design-data to let npm pick the right package automatically.\n`,
  );
  process.exit(1);
}

try {
  execFileSync(binaryPath, process.argv.slice(2), { stdio: "inherit" });
} catch (/** @type {any} */ err) {
  if (err?.code === "EACCES") {
    process.stderr.write(
      `design-data: permission denied executing "${binaryPath}".\n` +
        `Try: chmod +x "${binaryPath}"\n`,
    );
  }
  process.exit(err?.status ?? 1);
}
