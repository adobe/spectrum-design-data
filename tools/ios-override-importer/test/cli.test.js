// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0

// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

import test from "ava";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { run } from "../src/cli.js";

// Out-of-scope (typography) rows only, so emitManifest never touches the
// Rust CLI oracle or the foundation-token corpus — this test is a
// dependency-free smoke check of arg parsing + file writing, not the
// resolution pipeline (covered by emit-manifest.test.js).
test("writes a manifest and gap report from a CSV", (t) => {
  const dir = mkdtempSync(join(tmpdir(), "ios-importer-cli-"));
  const csvPath = join(dir, "override-log.csv");
  const outPath = join(dir, "manifest.json");
  const gapsPath = join(dir, "gaps.md");

  writeFileSync(
    csvPath,
    "Token Name,Old Value,New Value,Aliases,Override Source\n" +
      'font-size-100,"Scale(FontSize(17.0))",FontSize(14.0),,figma-tokens.json\n',
  );

  run(["--csv", csvPath, "--out", outPath, "--gaps", gapsPath]);

  const manifest = JSON.parse(readFileSync(outPath, "utf8"));
  t.is(manifest.specVersion, "1.0.0-draft");
  t.deepEqual(manifest.overrides, []);
  t.deepEqual(manifest.extensions.tokens, []);

  const gaps = readFileSync(gapsPath, "utf8");
  t.true(gaps.includes("Unresolved rows (0)"));
});

test("rejects missing required flags", (t) => {
  t.throws(() => run(["--csv", "x.csv"]), { message: /usage:/ });
});
