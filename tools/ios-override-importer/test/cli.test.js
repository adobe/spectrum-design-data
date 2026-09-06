// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0

// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

import test from "ava";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { run } from "../src/cli.js";

// Out-of-scope (letter-spacing) rows only, so emitManifest never touches the
// Rust CLI oracle or the foundation-token corpus — this test is a
// dependency-free smoke check of arg parsing + file writing, not the
// resolution pipeline (covered by emit-manifest.test.js). FontSize rows do
// touch the corpus (via the legacy-key index), so they're deliberately kept
// out of this fixture.
test("writes a manifest and gap report from a CSV", (t) => {
  const dir = mkdtempSync(join(tmpdir(), "ios-importer-cli-"));
  const csvPath = join(dir, "override-log.csv");
  const outPath = join(dir, "manifest.json");
  const gapsPath = join(dir, "gaps.md");

  writeFileSync(
    csvPath,
    "Token Name,Old Value,New Value,Aliases,Override Source\n" +
      'letter-spacing-font-size-10,"Custom token",Measurement(0.433),,letter-spacing.json\n',
  );

  run(["--csv", csvPath, "--out", outPath, "--gaps", gapsPath]);

  const manifest = JSON.parse(readFileSync(outPath, "utf8"));
  t.is(manifest.specVersion, "1.0.0-draft");
  t.deepEqual(manifest.overrides, []);
  t.is(manifest.extensions, undefined);
  t.is(manifest.formatting.casing, "camelCase");

  // No extension tokens for this out-of-scope-only fixture, so the sibling
  // extensions/ directory is never written (a missing extensions/ dir is a
  // valid no-op for the SDK loader).
  t.false(existsSync(join(dir, "extensions")));

  const gaps = readFileSync(gapsPath, "utf8");
  t.true(gaps.includes("Unresolved rows (0)"));
});

// A net-new palette-slug row: `resolveTarget` matches it via
// `matchPaletteSlug` (a static registry lookup) before ever trying the CLI
// decompose oracle, and net-new rows have no overrideModes, so
// `loadLegacyKeyIndex` is never invoked either — this stays dependency-free
// while exercising the extensions/tokens/ fragment-writing branch.
test("writes an extensions/tokens/ fragment when the run produces extension tokens", (t) => {
  const dir = mkdtempSync(join(tmpdir(), "ios-importer-cli-"));
  const csvPath = join(dir, "override-log.csv");
  const outPath = join(dir, "manifest.json");
  const gapsPath = join(dir, "gaps.md");

  writeFileSync(
    csvPath,
    "Token Name,Old Value,New Value,Aliases,Override Source\n" +
      'blue-100,"Custom token","ColorSet(light: Color(1, 2, 3, 1.0), dark: none)",,palette.json\n',
  );

  run(["--csv", csvPath, "--out", outPath, "--gaps", gapsPath]);

  const manifest = JSON.parse(readFileSync(outPath, "utf8"));
  t.is(manifest.extensions, undefined);

  const fragmentPath = join(
    dir,
    "extensions",
    "tokens",
    "imported.tokens.json",
  );
  t.true(existsSync(fragmentPath));
  const fragment = JSON.parse(readFileSync(fragmentPath, "utf8"));
  t.deepEqual(fragment, [
    {
      name: {
        property: "color",
        colorFamily: "blue",
        scaleIndex: "100",
        colorScheme: "light",
      },
      $valueType: "value-types/color.schema.json",
      value: "rgba(1, 2, 3, 1)",
    },
  ]);
});

test("rejects missing required flags", (t) => {
  t.throws(() => run(["--csv", "x.csv"]), { message: /usage:/ });
});
