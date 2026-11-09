// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

// Builds dist/: one `design-data site` build per platform, platforms.json and the
// landing page. To add a platform, add one entry here.

import { execFileSync } from "node:child_process";
import {
  copyFileSync,
  cpSync,
  mkdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const platforms = [
  {
    id: "react-spectrum",
    label: "React Spectrum",
    path: "rsp/",
    description: "Foundation recipes with the React Spectrum cascade.",
  },
  {
    id: "ios",
    label: "Spectrum iOS",
    path: "spios/",
    description: "The iOS platform manifest; button renders as button-ios.",
  },
];

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "../..");
const dist = join(here, "dist");
const cli = join(
  resolve(root, process.env.CARGO_TARGET_DIR ?? "sdk/target"),
  "debug/design-data",
);
const run = (cmd, args, cwd) =>
  execFileSync(cmd, args, { cwd, stdio: "inherit" });

run("cargo", ["build", "-p", "design-data-cli"], join(root, "sdk"));
rmSync(dist, { recursive: true, force: true });
for (const p of platforms)
  run(cli, ["site", "--platform", p.id, "--out", join(dist, p.path)], root);
mkdirSync(dist, { recursive: true });
writeFileSync(
  join(dist, "platforms.json"),
  JSON.stringify(platforms, null, 2) + "\n",
);
copyFileSync(join(here, "landing.html"), join(dist, "index.html"));

// Generated spec sheets (draft): one per component with relationships, plus index.json, from
// current data on every build. data/ is generated and not committed; dist/specs/ is the page
// that draws it. Changelogs are the committed packages/design-data/changelog/<component>.json
// (`design-data changelog`), copied next to the sheets.
const data = join(here, "data");
const changelogs = join(root, "packages/design-data/changelog");
rmSync(data, { recursive: true, force: true });
run(
  cli,
  [
    "spec-sheet",
    "--all",
    "--svg",
    "--changelog-dir",
    changelogs,
    "-o",
    join(data, "sheets"),
  ],
  root,
);
cpSync(join(here, "specs"), join(dist, "specs"), { recursive: true });
cpSync(data, join(dist, "specs/data"), { recursive: true });
cpSync(changelogs, join(dist, "specs/data/changelog"), { recursive: true });
copyFileSync(
  join(root, "tools/figma-spec-plugin/figma-files.json"),
  join(dist, "specs/data/figma-files.json"),
);
