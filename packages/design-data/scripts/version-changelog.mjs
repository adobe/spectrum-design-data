// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

// Runs in `changeset version` (moon run :version): appends the release being versioned to
// each component's changelog/<component>.json, from the last released tag to HEAD, so the new
// entries and component versions land in the Version Packages PR. Needs the full git history
// and tags (the release workflow checks out with fetch-depth: 0).

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const dataset = join(here, "..");
const root = join(dataset, "../..");
const { name, version } = JSON.parse(
  readFileSync(join(dataset, "package.json"), "utf8"),
);

const tags = execFileSync(
  "git",
  ["tag", "--list", `${name}@*`, "--sort=-v:refname"],
  { cwd: root, encoding: "utf8" },
)
  .split("\n")
  .filter((t) => t && !t.slice(name.length + 1).includes("-"));

if (tags.includes(`${name}@${version}`)) {
  console.log(`${name}@${version} is already released; no changelog to add.`);
  process.exit(0);
}
if (!tags.length) throw new Error(`no released ${name} tag to diff from`);

const bin = process.env.DESIGN_DATA_BIN;
const [cmd, ...pre] = bin
  ? [bin]
  : [
      "cargo",
      "run",
      "--release",
      "--quiet",
      "--manifest-path",
      join(root, "sdk/Cargo.toml"),
      "-p",
      "design-data-cli",
      "--",
    ];
execFileSync(
  cmd,
  [
    ...pre,
    "changelog",
    "--from",
    tags[0],
    "--to",
    "HEAD",
    "--release",
    version,
    "--dataset",
    dataset,
  ],
  { cwd: root, stdio: "inherit" },
);
