// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

// Build the slim engine: `node scripts/build.mjs [nodejs|web]` writes pkg/<target>/.
// The size profile is passed to cargo here so it does not change the workspace's release
// profile (the CLI). `s`, not `z`: `z` is 10 KB smaller but a scene takes 0.2 ms against
// 0.125 ms, over the latency budget. wasm-opt is off (see Cargo.toml).
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { rmSync } from "node:fs";

const cwd = dirname(fileURLToPath(import.meta.url + "/.."));
const target = process.argv[2] ?? "nodejs";
const outDir = `pkg/${target === "nodejs" ? "node" : target}`;
const profile = {
  "opt-level": '"s"',
  lto: "true",
  "codegen-units": "1",
  panic: '"abort"',
  strip: "true",
};

execFileSync(
  "wasm-pack",
  [
    "build",
    "--release",
    "--target",
    target,
    "--out-dir",
    outDir,
    "--",
    ...Object.entries(profile).flatMap(([k, v]) => [
      "--config",
      `profile.release.${k}=${v}`,
    ]),
  ],
  { cwd, stdio: "inherit" },
);
rmSync(join(cwd, outDir, ".gitignore"), { force: true });
