// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

// Deploy guard: run before `adt deployments upload`. Fails loudly when dist/ was built from
// the wrong commit, from a dirty tree, or lacks a known marker of a recent change (a stale
// build is what once made a correct site look broken).
//
//   node scripts/verify-dist.mjs [--commit <sha>] [--allow-dirty]
//
// --commit defaults to origin/main (fetched first). To add a marker for a new change, add a
// line to MARKERS.

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// [file under dist/, string the file must contain, the change it proves]
export const MARKERS = [
  [
    "rsp/variants/combo-box/m-light-desktop.json",
    "in-field-button",
    "combo-box in-field button",
  ],
];

const dist = join(dirname(fileURLToPath(import.meta.url)), "../dist");
const args = process.argv.slice(2);
const opt = (name) => {
  const i = args.indexOf(name);
  return i < 0 ? undefined : args[i + 1];
};
const git = (...a) =>
  execFileSync("git", a, { encoding: "utf8", cwd: dist }).trim();

const problems = [];
const read = (rel) => readFileSync(join(dist, rel), "utf8");

if (!existsSync(join(dist, "build-info.json"))) {
  problems.push(
    "dist/build-info.json is missing: run `moon run hub-prototype:build`",
  );
} else {
  const info = JSON.parse(read("build-info.json"));
  let want = opt("--commit");
  if (!want) {
    git("fetch", "origin", "main");
    want = git("rev-parse", "origin/main");
  }
  want = git("rev-parse", want);
  if (info.commit !== want)
    problems.push(`dist was built from ${info.commit}, expected ${want}`);
  if (info.dirty && !args.includes("--allow-dirty"))
    problems.push("dist was built from a tree with uncommitted changes");
  if (!/^[0-9a-f]{16}$/.test(info.buildId ?? ""))
    problems.push(`build-info.json has no build id (${info.buildId})`);
}

for (const [file, text, why] of MARKERS) {
  if (!existsSync(join(dist, file)))
    problems.push(`${file} is missing (${why})`);
  else if (!read(file).includes(text))
    problems.push(`${file} lacks "${text}" (${why}): dist is stale`);
}

(function scan(dir) {
  for (const f of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, f.name);
    if (f.isDirectory()) scan(p);
    else if (
      f.name.endsWith(".html") &&
      read(p.slice(dist.length + 1)).includes("__BUILD_ID__")
    )
      problems.push(`${p.slice(dist.length + 1)} has an unstamped build id`);
  }
})(dist);

if (problems.length) {
  console.error(
    "verify-dist FAILED, do not deploy:\n  " + problems.join("\n  "),
  );
  process.exit(1);
}
console.log(
  `verify-dist ok: ${JSON.stringify(JSON.parse(read("build-info.json")))}`,
);
