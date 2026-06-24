/*
Copyright 2026 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

/**
 * Asserts that the npm-published tarball for @adobe/spectrum-tokens contains every
 * file that consumers depend on. Uses `npm pack --dry-run --json` rather than plain
 * filesystem checks so the test honours `files`, `.npmignore`, and npm defaults —
 * the same rules that govern what actually gets published.
 */

import test from "ava";
import { execFileSync } from "child_process";
import { readFile } from "fs/promises";
import { fileURLToPath } from "url";
import path from "path";

const pkgDir = path.dirname(
  fileURLToPath(new URL("../package.json", import.meta.url)),
);

/**
 * Run `npm pack --dry-run --json` and return the Set of packed file paths.
 * Result is shared across all tests in this module via a module-level Promise.
 */
const packedFilesPromise = (async () => {
  const raw = execFileSync("npm", ["pack", "--dry-run", "--json"], {
    cwd: pkgDir,
    encoding: "utf8",
    // npm pack writes the package name to stderr on dry-run; suppress it.
    stdio: ["ignore", "pipe", "ignore"],
  });
  const files = JSON.parse(raw)[0].files.map((f) => f.path);
  return new Set(files);
})();

// ---------------------------------------------------------------------------
// Explicit required files
// ---------------------------------------------------------------------------

const requiredFiles = [
  "index.js",
  "package.json",
  "manifest.json",
  "dist/json/variables.json",
  "schemas/token-file.json",
  "README.md",
  "LICENSE",
];

test("packed tarball includes all explicitly required files", async (t) => {
  const packed = await packedFilesPromise;
  const missing = requiredFiles.filter((f) => !packed.has(f));
  t.deepEqual(
    missing,
    [],
    `Missing from published tarball: ${missing.join(", ")}`,
  );
});

// ---------------------------------------------------------------------------
// All src/ token files (derived from manifest.json, not hardcoded)
// ---------------------------------------------------------------------------

test("packed tarball includes every src/ token file listed in manifest.json", async (t) => {
  const [packed, manifest] = await Promise.all([
    packedFilesPromise,
    readFile(path.join(pkgDir, "manifest.json"), "utf8").then(JSON.parse),
  ]);

  // manifest.json entries look like "src/color-palette.json"
  const missing = manifest.filter((f) => !packed.has(f));
  t.deepEqual(
    missing,
    [],
    `src/ files in manifest.json missing from tarball: ${missing.join(", ")}`,
  );
});

// ---------------------------------------------------------------------------
// Self-maintaining: every exports / main / tokens target must be packed
// ---------------------------------------------------------------------------

test("packed tarball satisfies every exports, main, and tokens target in package.json", async (t) => {
  const [packed, pkg] = await Promise.all([
    packedFilesPromise,
    readFile(path.join(pkgDir, "package.json"), "utf8").then(JSON.parse),
  ]);

  const failures = [];

  // Strip leading "./" and check or prefix-match against packed paths.
  const toRelative = (target) => target.replace(/^\.\//, "");

  const checkTarget = (fieldName, target) => {
    const rel = toRelative(target);
    if (rel.endsWith("*")) {
      // Wildcard: at least one packed file must share the prefix.
      const prefix = rel.slice(0, -1); // e.g. "src/" or "dist/"
      if (![...packed].some((p) => p.startsWith(prefix))) {
        failures.push(`${fieldName}: no packed files match prefix "${prefix}"`);
      }
    } else {
      if (!packed.has(rel)) {
        failures.push(`${fieldName}: "${rel}" not in packed tarball`);
      }
    }
  };

  // exports map
  if (pkg.exports) {
    for (const [subpath, target] of Object.entries(pkg.exports)) {
      checkTarget(`exports["${subpath}"]`, target);
    }
  }

  // main (e.g. "./index.js")
  if (pkg.main) {
    checkTarget("main", pkg.main);
  }

  // tokens (e.g. "dist/json/variables.json")
  if (pkg.tokens) {
    const target = pkg.tokens.startsWith("./") ? pkg.tokens : `./${pkg.tokens}`;
    checkTarget("tokens", target);
  }

  t.deepEqual(failures, [], failures.join("\n"));
});
