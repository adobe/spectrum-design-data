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
  readdirSync,
  readFileSync,
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
// The slim WASM engine (proposal 015) every site loads; never committed.
const engineDir = join(root, "sdk/wasm-visual");
run("node", ["scripts/build.mjs", "web"], engineDir);
rmSync(dist, { recursive: true, force: true });
for (const p of platforms)
  run(
    cli,
    [
      "site",
      "--platform",
      p.id,
      "--engine",
      join(engineDir, "pkg/web"),
      "--out",
      join(dist, p.path),
    ],
    root,
  );
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

// Spec-sheet scenes bake label widths in, so a kit-measured Adobe Clean table (hck9.10) makes
// them S2-accurate. Best effort: any failure falls back to the committed Source Sans 3 default.
// The table is derived from a licensed font: it stays in the git-ignored cache and is never
// copied to dist/. The site builds above keep the default table, which the explorer ships.
// Shells out because docs/hub-prototype does not depend on tools/platform-capture.
function kitTextMetrics() {
  const table = join(
    root,
    "tools/platform-capture/.cache/text-metrics/adobe-clean-spectrum-vf.json",
  );
  try {
    execFileSync("node", ["adapters/text-metrics/cli.mjs", "--out", table], {
      cwd: join(root, "tools/platform-capture"),
      stdio: ["ignore", "ignore", "pipe"],
      timeout: 300000,
    });
    const { generated, test700At14px } = JSON.parse(
      readFileSync(table, "utf8"),
    ).meta;
    console.log(
      `spec sheets: kit text metrics (generated ${generated}, Test/700/14px = ${test700At14px} px)`,
    );
    return ["--text-metrics", table];
  } catch (e) {
    const lines = String(e.stderr || e.message)
      .trim()
      .split("\n");
    const why = lines.find((l) => /Error/.test(l)) ?? lines[0];
    console.warn(
      `warning: kit text metrics unavailable (${why}); spec sheets use the Source Sans 3 default (about 6.6% wider than S2)`,
    );
    return [];
  }
}

run(
  cli,
  [
    "spec-sheet",
    "--all",
    "--svg",
    ...kitTextMetrics(),
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

// The kit table must never reach the output: sheets carry baked widths only.
const stray = [];
(function scan(dir) {
  for (const f of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, f.name);
    if (f.isDirectory()) scan(p);
    else if (
      /text-metrics/.test(f.name) ||
      (f.name.endsWith(".json") &&
        readFileSync(p, "utf8").includes("Derived from a licensed font"))
    )
      stray.push(p);
  }
})(join(dist, "specs"));
if (stray.length)
  throw new Error(`text-metrics table in the spec output: ${stray.join(", ")}`);
