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

import test from "ava";
import { access, readFile } from "fs/promises";
import { fileURLToPath } from "url";
import path from "path";

const packageJsonPath = fileURLToPath(
  new URL("../package.json", import.meta.url),
);
const pkgDir = path.dirname(packageJsonPath);

/**
 * Resolve a subpath like ./dist/json/variables.json against the
 * "./dist/*" -> "./dist/*" export pattern (Node replaces * with the suffix).
 */
function resolveDistStarSubpath(request) {
  if (!request.startsWith("./dist/")) {
    return null;
  }
  const suffix = request.slice("./dist/".length);
  return `./dist/${suffix}`;
}

test("package.json exports preserve backward-compatible entry points", async (t) => {
  const pkg = JSON.parse(await readFile(packageJsonPath, { encoding: "utf8" }));
  const { exports } = pkg;

  t.truthy(exports, "exports field must be defined");
  t.is(exports["."], "./index.js", "main entry export");
  t.is(
    exports["./schemas/token-file.json"],
    "./schemas/token-file.json",
    "token-file schema export",
  );
  t.is(
    exports["./dist/*"],
    "./dist/*",
    "dist wildcard export required for @adobe/spectrum-tokens/dist/json/variables.json",
  );
});

test("dist/json/variables.json maps through ./dist/* export and exists after build", async (t) => {
  const pkg = JSON.parse(await readFile(packageJsonPath, { encoding: "utf8" }));
  const { exports } = pkg;

  t.is(exports["./dist/*"], "./dist/*");

  const consumerSubpath = "./dist/json/variables.json";
  const resolvedTarget = resolveDistStarSubpath(consumerSubpath);
  t.is(
    resolvedTarget,
    "./dist/json/variables.json",
    "subpath should map to dist/json/variables.json under ./dist/* pattern",
  );

  const absolutePath = path.join(pkgDir, "dist/json/variables.json");
  await t.notThrowsAsync(
    async () => access(absolutePath),
    "dist/json/variables.json must exist (buildTokens runs before test)",
  );
});
