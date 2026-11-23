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
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const pkgDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const strip = (p) => p.replace(/^\.\//, "");

// Every export target, main, and non-glob `files` entry that is not in the tarball.
function missingFromPack(pkg, packed) {
  const set = new Set(packed);
  const targets = [pkg.main, ...Object.values(pkg.exports ?? {})].filter(
    Boolean,
  );
  const declared = (pkg.files ?? []).filter((f) => !/[*]/.test(f));
  const missing = targets.map(strip).filter((t) => !set.has(t));
  for (const f of declared.map(strip)) {
    const isDir = f.endsWith("/");
    if (isDir ? ![...set].some((p) => p.startsWith(f)) : !set.has(f)) {
      missing.push(f);
    }
  }
  return missing;
}

test("packed tarball contains every declared export, main and file", (t) => {
  const pkg = JSON.parse(readFileSync(resolve(pkgDir, "package.json"), "utf8"));
  const out = execFileSync(
    "npm",
    ["pack", "--dry-run", "--json", "--ignore-scripts"],
    { cwd: pkgDir, encoding: "utf8" },
  );
  const packed = JSON.parse(out)[0].files.map((f) => f.path);
  t.deepEqual(missingFromPack(pkg, packed), []);
});

test("negative fixture: a missing export target fails the check", (t) => {
  const pkg = {
    main: "./src/index.js",
    exports: { ".": "./src/index.js", "./write": "./src/write.js" },
    files: ["src/", "README.md"],
  };
  t.deepEqual(missingFromPack(pkg, ["src/index.js"]), [
    "src/write.js",
    "README.md",
  ]);
});
