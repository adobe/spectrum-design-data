// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

// Build the package data: `variants/<component>/<size>-<scheme>-<scale>.json` for every
// component with a recipe, `catalog.json` (component list, option defaults, variant keys)
// and the font license, all from `design-data site --data-only` over the repo's dataset.
// Uses DESIGN_DATA_CLI, else builds the debug CLI.
import { execFileSync } from "node:child_process";
import { cpSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const cwd = join(dirname(fileURLToPath(import.meta.url)), "..");
const workspace = join(cwd, "..");
let cli = process.env.DESIGN_DATA_CLI;
if (!cli) {
  execFileSync("cargo", ["build", "-q", "-p", "design-data-cli"], {
    cwd: workspace,
    stdio: "inherit",
  });
  cli = join(workspace, "target/debug/design-data");
}

const out = mkdtempSync(join(tmpdir(), "visual-data-"));
try {
  execFileSync(cli, ["site", "--data-only", "--out", out], {
    cwd: join(workspace, ".."),
    stdio: "inherit",
  });
  rmSync(join(cwd, "variants"), { recursive: true, force: true });
  cpSync(join(out, "variants"), join(cwd, "variants"), { recursive: true });
  cpSync(join(out, "data.json"), join(cwd, "catalog.json"));
  cpSync(join(out, "OFL-SourceSans3.txt"), join(cwd, "OFL-SourceSans3.txt"));
} finally {
  rmSync(out, { recursive: true, force: true });
}
console.log("✓ variants/ and catalog.json written");
